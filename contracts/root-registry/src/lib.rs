#![no_std]

use pact_contracts_shared::RootStatus;
use soroban_sdk::{contract, contractimpl};

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
}
