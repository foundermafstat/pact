#![no_std]

use soroban_sdk::{contract, contractimpl};

#[contract]
pub struct MilestoneEscrow;

#[contractimpl]
impl MilestoneEscrow {
    pub fn version() -> u32 {
        1
    }
}
