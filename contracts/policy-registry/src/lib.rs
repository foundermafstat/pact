#![no_std]

use pact_contracts_shared::{Policy, PolicyStatus, PolicyType};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, BytesN, Env,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Policy(BytesN<32>),
}

#[contracterror]
#[derive(Clone, Copy, Eq, PartialEq)]
#[repr(u32)]
pub enum PolicyRegistryError {
    PolicyAlreadyExists = 1,
    PolicyNotFound = 2,
    InvalidValidityWindow = 3,
}

#[contract]
pub struct PolicyRegistry;

#[contractimpl]
impl PolicyRegistry {
    pub fn version() -> u32 {
        1
    }

    pub fn default_status() -> PolicyStatus {
        PolicyStatus::Draft
    }

    pub fn create_policy(
        env: Env,
        policy_id: BytesN<32>,
        policy_hash: BytesN<32>,
        policy_type: PolicyType,
        verifier: Address,
        valid_from: u64,
        valid_until: u64,
    ) {
        if valid_until <= valid_from {
            panic_with_error!(&env, PolicyRegistryError::InvalidValidityWindow);
        }

        let key = DataKey::Policy(policy_id.clone());
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, PolicyRegistryError::PolicyAlreadyExists);
        }

        let policy = Policy {
            policy_id,
            policy_hash,
            policy_type,
            status: PolicyStatus::Draft,
            issuer: env.current_contract_address(),
            verifier,
            valid_from,
            valid_until,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&key, &policy);
    }

    pub fn activate_policy(env: Env, policy_id: BytesN<32>) {
        Self::set_policy_status(env, policy_id, PolicyStatus::Active);
    }

    pub fn pause_policy(env: Env, policy_id: BytesN<32>) {
        Self::set_policy_status(env, policy_id, PolicyStatus::Paused);
    }

    pub fn deprecate_policy(env: Env, policy_id: BytesN<32>) {
        Self::set_policy_status(env, policy_id, PolicyStatus::Deprecated);
    }

    pub fn get_policy(env: Env, policy_id: BytesN<32>) -> Policy {
        Self::read_policy(&env, policy_id)
    }

    pub fn is_policy_active(
        env: Env,
        policy_id: BytesN<32>,
        policy_hash: BytesN<32>,
        now: u64,
    ) -> bool {
        let policy = Self::read_policy(&env, policy_id);

        policy.status == PolicyStatus::Active
            && policy.policy_hash == policy_hash
            && policy.valid_from <= now
            && now <= policy.valid_until
    }

    fn set_policy_status(env: Env, policy_id: BytesN<32>, status: PolicyStatus) {
        let key = DataKey::Policy(policy_id.clone());
        let mut policy = Self::read_policy(&env, policy_id);
        policy.status = status;
        env.storage().persistent().set(&key, &policy);
    }

    fn read_policy(env: &Env, policy_id: BytesN<32>) -> Policy {
        env.storage()
            .persistent()
            .get(&DataKey::Policy(policy_id))
            .unwrap_or_else(|| panic_with_error!(env, PolicyRegistryError::PolicyNotFound))
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod tests {
    use super::{PolicyRegistry, PolicyRegistryClient};
    use pact_contracts_shared::{PolicyStatus, PolicyType};
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

    fn id(env: &Env, byte: u8) -> BytesN<32> {
        BytesN::from_array(env, &[byte; 32])
    }

    fn client(env: &Env) -> PolicyRegistryClient<'_> {
        let contract_id = env.register(PolicyRegistry, ());
        PolicyRegistryClient::new(env, &contract_id)
    }

    #[test]
    fn creates_and_reads_policy() {
        let env = Env::default();
        let client = client(&env);
        let verifier = Address::generate(&env);

        client.create_policy(
            &id(&env, 1),
            &id(&env, 2),
            &PolicyType::Eligibility,
            &verifier,
            &100,
            &200,
        );

        let policy = client.get_policy(&id(&env, 1));

        assert!(matches!(policy.status, PolicyStatus::Draft));
        assert!(matches!(policy.policy_type, PolicyType::Eligibility));
        assert_eq!(policy.valid_from, 100);
        assert_eq!(policy.valid_until, 200);
    }

    #[test]
    fn supports_policy_lifecycle() {
        let env = Env::default();
        let client = client(&env);
        let verifier = Address::generate(&env);

        client.create_policy(
            &id(&env, 1),
            &id(&env, 2),
            &PolicyType::Milestone,
            &verifier,
            &100,
            &200,
        );

        client.activate_policy(&id(&env, 1));
        assert!(client.is_policy_active(&id(&env, 1), &id(&env, 2), &150));

        client.pause_policy(&id(&env, 1));
        assert!(!client.is_policy_active(&id(&env, 1), &id(&env, 2), &150));

        client.deprecate_policy(&id(&env, 1));
        let policy = client.get_policy(&id(&env, 1));
        assert!(matches!(policy.status, PolicyStatus::Deprecated));
    }
}
