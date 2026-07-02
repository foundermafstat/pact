#![no_std]

use pact_contracts_shared::VerifierMode;
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, BytesN, Env,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Mode,
}

#[contracterror]
#[derive(Clone, Copy, Eq, PartialEq)]
#[repr(u32)]
pub enum VerifierAdapterError {
    RealVerifierNotConfigured = 1,
}

#[contract]
pub struct VerifierAdapter;

#[contractimpl]
impl VerifierAdapter {
    pub fn version() -> u32 {
        1
    }

    pub fn default_mode() -> VerifierMode {
        VerifierMode::Mock
    }

    pub fn init(env: Env, mode: VerifierMode) {
        env.storage().persistent().set(&DataKey::Mode, &mode);
    }

    pub fn get_mode(env: Env) -> VerifierMode {
        env.storage()
            .persistent()
            .get(&DataKey::Mode)
            .unwrap_or(VerifierMode::Mock)
    }

    pub fn verify_eligibility(env: Env, proof: BytesN<32>, public_inputs: BytesN<32>) -> bool {
        Self::verify_mock(env, proof, public_inputs)
    }

    pub fn verify_milestone(env: Env, proof: BytesN<32>, public_inputs: BytesN<32>) -> bool {
        Self::verify_mock(env, proof, public_inputs)
    }

    fn verify_mock(env: Env, proof: BytesN<32>, public_inputs: BytesN<32>) -> bool {
        match Self::get_mode(env.clone()) {
            VerifierMode::Mock => {
                proof == Self::mock_proof_marker(&env)
                    && public_inputs == Self::mock_public_inputs_marker(&env)
            }
            VerifierMode::Groth16Bn254 => {
                panic_with_error!(&env, VerifierAdapterError::RealVerifierNotConfigured)
            }
        }
    }

    pub fn mock_proof_marker(env: &Env) -> BytesN<32> {
        BytesN::from_array(env, &[0xA5; 32])
    }

    pub fn mock_public_inputs_marker(env: &Env) -> BytesN<32> {
        BytesN::from_array(env, &[0x5A; 32])
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod tests {
    use super::{VerifierAdapter, VerifierAdapterClient};
    use pact_contracts_shared::VerifierMode;
    use soroban_sdk::{BytesN, Env};

    fn client(env: &Env) -> VerifierAdapterClient<'_> {
        let contract_id = env.register(VerifierAdapter, ());
        VerifierAdapterClient::new(env, &contract_id)
    }

    #[test]
    fn accepts_valid_mock_proofs() {
        let env = Env::default();
        let client = client(&env);
        client.init(&VerifierMode::Mock);

        assert!(client.verify_eligibility(
            &VerifierAdapter::mock_proof_marker(&env),
            &VerifierAdapter::mock_public_inputs_marker(&env)
        ));
        assert!(client.verify_milestone(
            &VerifierAdapter::mock_proof_marker(&env),
            &VerifierAdapter::mock_public_inputs_marker(&env)
        ));
    }

    #[test]
    fn rejects_invalid_mock_marker() {
        let env = Env::default();
        let client = client(&env);
        client.init(&VerifierMode::Mock);

        assert!(!client.verify_eligibility(
            &BytesN::from_array(&env, &[0x01; 32]),
            &VerifierAdapter::mock_public_inputs_marker(&env)
        ));
    }

    #[test]
    #[should_panic]
    fn real_verifier_mode_returns_configured_error() {
        let env = Env::default();
        let client = client(&env);
        client.init(&VerifierMode::Groth16Bn254);

        client.verify_milestone(
            &VerifierAdapter::mock_proof_marker(&env),
            &VerifierAdapter::mock_public_inputs_marker(&env),
        );
    }
}
