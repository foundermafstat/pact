#![no_std]

use soroban_sdk::{contract, contractimpl};

#[contract]
pub struct PolicyRegistry;

#[contractimpl]
impl PolicyRegistry {
    pub fn version() -> u32 {
        1
    }
}
