#![no_std]

use pact_contracts_shared::PolicyType;
use soroban_sdk::{contract, contractimpl};

#[contract]
pub struct GatedAssetController;

#[contractimpl]
impl GatedAssetController {
    pub fn version() -> u32 {
        1
    }

    pub fn policy_type_marker() -> PolicyType {
        PolicyType::AssetAction
    }
}
