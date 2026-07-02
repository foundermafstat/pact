#![no_std]

use soroban_sdk::{contracttype, Address, BytesN};

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub enum PolicyType {
    Eligibility,
    Milestone,
    AssetAction,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub enum PolicyStatus {
    Draft,
    Active,
    Paused,
    Deprecated,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub enum RootType {
    Credential,
    MilestoneMetrics,
    Revocation,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub enum RootStatus {
    Pending,
    Active,
    Inactive,
    Expired,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub enum ProgramStatus {
    Draft,
    Active,
    Paused,
    Cancelled,
    Completed,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub enum TrancheStatus {
    Locked,
    Ready,
    Released,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub enum VerifierMode {
    Mock,
    Groth16Bn254,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub struct Policy {
    pub policy_id: BytesN<32>,
    pub policy_hash: BytesN<32>,
    pub policy_type: PolicyType,
    pub status: PolicyStatus,
    pub issuer: Address,
    pub verifier: Address,
    pub valid_from: u64,
    pub valid_until: u64,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub struct RootRecord {
    pub root: BytesN<32>,
    pub policy_id: BytesN<32>,
    pub root_type: RootType,
    pub status: RootStatus,
    pub epoch: u64,
    pub issuer: Address,
    pub valid_from: u64,
    pub valid_until: u64,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub struct Program {
    pub program_id: BytesN<32>,
    pub sponsor: Address,
    pub project: Address,
    pub asset: Address,
    pub total_amount: i128,
    pub funded_amount: i128,
    pub status: ProgramStatus,
    pub eligibility_policy_id: BytesN<32>,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub struct Tranche {
    pub program_id: BytesN<32>,
    pub milestone_id: BytesN<32>,
    pub milestone_policy_id: BytesN<32>,
    pub amount: i128,
    pub status: TrancheStatus,
    pub release_to: Address,
    pub released_at: Option<u64>,
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod tests {
    use super::{PolicyStatus, ProgramStatus, RootStatus, TrancheStatus, VerifierMode};

    #[test]
    fn exposes_shared_status_types() {
        assert!(matches!(PolicyStatus::Draft, PolicyStatus::Draft));
        assert!(matches!(RootStatus::Pending, RootStatus::Pending));
        assert!(matches!(ProgramStatus::Draft, ProgramStatus::Draft));
        assert!(matches!(TrancheStatus::Locked, TrancheStatus::Locked));
        assert!(matches!(VerifierMode::Mock, VerifierMode::Mock));
    }
}
