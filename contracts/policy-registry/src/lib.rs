#![no_std]

use pact_contracts_shared::PolicyStatus;
use soroban_sdk::{contract, contractimpl};

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
}
