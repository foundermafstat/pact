#![no_std]

use soroban_sdk::{contract, contractimpl};

#[contract]
pub struct RootRegistry;

#[contractimpl]
impl RootRegistry {
    pub fn version() -> u32 {
        1
    }
}
