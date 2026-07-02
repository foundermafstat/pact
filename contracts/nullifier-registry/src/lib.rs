#![no_std]

use pact_contracts_shared::VerifierMode;
use soroban_sdk::{contract, contractimpl};

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
}
