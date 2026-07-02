#![no_std]

use pact_contracts_shared::ProgramStatus;
use soroban_sdk::{contract, contractimpl};

#[contract]
pub struct MilestoneEscrow;

#[contractimpl]
impl MilestoneEscrow {
    pub fn version() -> u32 {
        1
    }

    pub fn default_status() -> ProgramStatus {
        ProgramStatus::Draft
    }
}
