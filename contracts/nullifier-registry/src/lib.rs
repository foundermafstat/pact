#![no_std]

use pact_contracts_shared::VerifierMode;
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, BytesN, Env,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Nullifier(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub struct NullifierRecord {
    pub nullifier: BytesN<32>,
    pub used_for: BytesN<32>,
    pub used_at: u64,
}

#[contracterror]
#[derive(Clone, Copy, Eq, PartialEq)]
#[repr(u32)]
pub enum NullifierRegistryError {
    NullifierAlreadyUsed = 1,
}

#[contract]
pub struct NullifierRegistry;

#[contractimpl]
impl NullifierRegistry {
    pub fn version() -> u32 {
        1
    }

    pub fn verifier_mode_marker() -> VerifierMode {
        VerifierMode::Mock
    }

    pub fn is_used(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Nullifier(nullifier))
    }

    pub fn assert_unused(env: Env, nullifier: BytesN<32>) {
        if Self::is_used(env.clone(), nullifier) {
            panic_with_error!(&env, NullifierRegistryError::NullifierAlreadyUsed);
        }
    }

    pub fn mark_used(env: Env, nullifier: BytesN<32>, used_for: BytesN<32>) {
        Self::assert_unused(env.clone(), nullifier.clone());

        let record = NullifierRecord {
            nullifier: nullifier.clone(),
            used_for,
            used_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Nullifier(nullifier), &record);
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod tests {
    use super::{NullifierRegistry, NullifierRegistryClient};
    use soroban_sdk::{BytesN, Env};

    fn id(env: &Env, byte: u8) -> BytesN<32> {
        BytesN::from_array(env, &[byte; 32])
    }

    fn client(env: &Env) -> NullifierRegistryClient<'_> {
        let contract_id = env.register(NullifierRegistry, ());
        NullifierRegistryClient::new(env, &contract_id)
    }

    #[test]
    fn tracks_used_nullifiers() {
        let env = Env::default();
        let client = client(&env);

        assert!(!client.is_used(&id(&env, 1)));
        client.assert_unused(&id(&env, 1));
        client.mark_used(&id(&env, 1), &id(&env, 2));
        assert!(client.is_used(&id(&env, 1)));
    }

    #[test]
    #[should_panic]
    fn duplicate_mark_fails() {
        let env = Env::default();
        let client = client(&env);

        client.mark_used(&id(&env, 1), &id(&env, 2));
        client.mark_used(&id(&env, 1), &id(&env, 2));
    }

    #[test]
    #[should_panic]
    fn assert_unused_fails_for_used_nullifier() {
        let env = Env::default();
        let client = client(&env);

        client.mark_used(&id(&env, 1), &id(&env, 2));
        client.assert_unused(&id(&env, 1));
    }
}
