#![no_std]

use soroban_sdk::{contract, contractimpl};

#[contract]
pub struct GatedAssetController;

#[contractimpl]
impl GatedAssetController {
    pub fn version() -> u32 {
        1
    }
}
