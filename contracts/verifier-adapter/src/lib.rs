#![no_std]

use pact_contracts_shared::VerifierMode;
use soroban_sdk::{contract, contractimpl};

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
}
