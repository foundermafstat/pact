#![no_std]

use soroban_sdk::{contract, contractimpl};

#[contract]
pub struct NullifierRegistry;

#[contractimpl]
impl NullifierRegistry {
    pub fn version() -> u32 {
        1
    }
}
