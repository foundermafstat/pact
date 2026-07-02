#![no_std]

use pact_contracts_shared::{RootRecord, RootStatus, RootType};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, BytesN, Env,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Root(BytesN<32>),
    Current(BytesN<32>, RootType),
}

#[contracterror]
#[derive(Clone, Copy, Eq, PartialEq)]
#[repr(u32)]
pub enum RootRegistryError {
    RootNotFound = 1,
    InvalidValidityWindow = 2,
}

#[contract]
pub struct RootRegistry;

#[contractimpl]
impl RootRegistry {
    pub fn version() -> u32 {
        1
    }

    pub fn default_status() -> RootStatus {
        RootStatus::Pending
    }

    pub fn activate_root(
        env: Env,
        policy_id: BytesN<32>,
        root: BytesN<32>,
        root_type: RootType,
        epoch: u64,
        valid_from: u64,
        valid_until: u64,
    ) {
        if valid_until <= valid_from {
            panic_with_error!(&env, RootRegistryError::InvalidValidityWindow);
        }

        let record = RootRecord {
            root: root.clone(),
            policy_id: policy_id.clone(),
            root_type: root_type.clone(),
            status: RootStatus::Active,
            epoch,
            issuer: env.current_contract_address(),
            valid_from,
            valid_until,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Root(root.clone()), &record);
        env.storage()
            .persistent()
            .set(&DataKey::Current(policy_id, root_type), &record);
    }

    pub fn deactivate_root(env: Env, _policy_id: BytesN<32>, root: BytesN<32>) {
        let key = DataKey::Root(root.clone());
        let mut record = Self::read_root(&env, root);
        record.status = RootStatus::Inactive;
        env.storage().persistent().set(&key, &record);
        env.storage()
            .persistent()
            .set(&DataKey::Current(record.policy_id.clone(), record.root_type.clone()), &record);
    }

    pub fn is_root_active(
        env: Env,
        policy_id: BytesN<32>,
        root: BytesN<32>,
        root_type: RootType,
        _now: u64,
    ) -> bool {
        let record = Self::read_root(&env, root);

        record.policy_id == policy_id
            && record.root_type == root_type
            && record.status == RootStatus::Active
            && record.valid_from <= _now
            && _now <= record.valid_until
    }

    pub fn get_current_root(env: Env, policy_id: BytesN<32>, root_type: RootType) -> RootRecord {
        env.storage()
            .persistent()
            .get(&DataKey::Current(policy_id, root_type))
            .unwrap_or_else(|| panic_with_error!(&env, RootRegistryError::RootNotFound))
    }

    fn read_root(env: &Env, root: BytesN<32>) -> RootRecord {
        env.storage()
            .persistent()
            .get(&DataKey::Root(root))
            .unwrap_or_else(|| panic_with_error!(env, RootRegistryError::RootNotFound))
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod tests {
    use super::{RootRegistry, RootRegistryClient};
    use pact_contracts_shared::{RootStatus, RootType};
    use soroban_sdk::{BytesN, Env};

    fn id(env: &Env, byte: u8) -> BytesN<32> {
        BytesN::from_array(env, &[byte; 32])
    }

    fn client(env: &Env) -> RootRegistryClient<'_> {
        let contract_id = env.register(RootRegistry, ());
        RootRegistryClient::new(env, &contract_id)
    }

    #[test]
    fn activates_and_reads_current_root() {
        let env = Env::default();
        let client = client(&env);

        client.activate_root(
            &id(&env, 1),
            &id(&env, 2),
            &RootType::Credential,
            &1,
            &100,
            &200,
        );

        let current = client.get_current_root(&id(&env, 1), &RootType::Credential);

        assert_eq!(current.root, id(&env, 2));
        assert!(matches!(current.status, RootStatus::Active));
        assert!(client.is_root_active(
            &id(&env, 1),
            &id(&env, 2),
            &RootType::Credential,
            &150
        ));
    }

    #[test]
    fn deactivates_root() {
        let env = Env::default();
        let client = client(&env);

        client.activate_root(
            &id(&env, 1),
            &id(&env, 2),
            &RootType::MilestoneMetrics,
            &1,
            &100,
            &200,
        );
        client.deactivate_root(&id(&env, 1), &id(&env, 2));

        assert!(!client.is_root_active(
            &id(&env, 1),
            &id(&env, 2),
            &RootType::MilestoneMetrics,
            &150
        ));
    }

    #[test]
    fn rejects_roots_outside_validity_window() {
        let env = Env::default();
        let client = client(&env);

        client.activate_root(
            &id(&env, 1),
            &id(&env, 2),
            &RootType::Credential,
            &1,
            &100,
            &200,
        );

        assert!(!client.is_root_active(
            &id(&env, 1),
            &id(&env, 2),
            &RootType::Credential,
            &99
        ));
        assert!(!client.is_root_active(
            &id(&env, 1),
            &id(&env, 2),
            &RootType::Credential,
            &201
        ));
    }
}
