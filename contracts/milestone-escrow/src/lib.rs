#![no_std]

use pact_contracts_shared::{Program, ProgramStatus, Tranche, TrancheStatus, VerifierMode};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, BytesN, Env,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Program(BytesN<32>),
    Tranche(BytesN<32>, BytesN<32>),
    TrancheCount(BytesN<32>),
    TrancheTotal(BytesN<32>),
    EligibilityVerified(BytesN<32>),
    EligibilityNullifier(BytesN<32>),
    MilestoneVerified(BytesN<32>, BytesN<32>),
    MilestoneNullifier(BytesN<32>),
    PolicyActive(BytesN<32>),
    RootActive(BytesN<32>),
    VerifierMode,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub struct EligibilityPublicInputs {
    pub policy_id: BytesN<32>,
    pub policy_hash: BytesN<32>,
    pub credential_root: BytesN<32>,
    pub nullifier: BytesN<32>,
    pub proof_digest: BytesN<32>,
    pub account_binding: Address,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub struct MilestonePublicInputs {
    pub policy_id: BytesN<32>,
    pub milestone_root: BytesN<32>,
    pub nullifier: BytesN<32>,
    pub proof_digest: BytesN<32>,
    pub recipient: Address,
    pub tranche_amount: i128,
}

#[contracterror]
#[derive(Clone, Copy, Eq, PartialEq)]
#[repr(u32)]
pub enum MilestoneEscrowError {
    ProgramAlreadyExists = 1,
    ProgramNotFound = 2,
    InvalidAmount = 3,
    TrancheAlreadyExists = 4,
    TrancheNotFound = 5,
    Overfunded = 6,
    ProgramNotFunded = 7,
    NoTranches = 8,
    TrancheTotalMismatch = 9,
    InvalidProgramStatus = 10,
    InactivePolicy = 11,
    InactiveRoot = 12,
    InvalidProof = 13,
    NullifierAlreadyUsed = 14,
    WrongAccountBinding = 15,
    ProjectNotEligible = 16,
    WrongRecipient = 17,
    WrongAmount = 18,
    TrancheNotLocked = 19,
    TrancheNotReady = 20,
}

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

    pub fn set_verifier_mode(env: Env, mode: VerifierMode) {
        env.storage().persistent().set(&DataKey::VerifierMode, &mode);
    }

    pub fn get_verifier_mode(env: Env) -> VerifierMode {
        env.storage()
            .persistent()
            .get(&DataKey::VerifierMode)
            .unwrap_or(VerifierMode::Mock)
    }

    pub fn create_program(
        env: Env,
        program_id: BytesN<32>,
        sponsor: Address,
        project: Address,
        asset: Address,
        total_amount: i128,
        eligibility_policy_id: BytesN<32>,
    ) {
        sponsor.require_auth();

        if total_amount <= 0 {
            panic_with_error!(&env, MilestoneEscrowError::InvalidAmount);
        }

        let key = DataKey::Program(program_id.clone());
        let event_program_id = program_id.clone();
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, MilestoneEscrowError::ProgramAlreadyExists);
        }

        let program = Program {
            program_id,
            sponsor,
            project,
            asset,
            total_amount,
            funded_amount: 0,
            status: ProgramStatus::Draft,
            eligibility_policy_id,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&key, &program);
        env.events()
            .publish((symbol_short!("prog_new"), event_program_id), total_amount);
    }

    pub fn get_program(env: Env, program_id: BytesN<32>) -> Program {
        Self::read_program(&env, program_id)
    }

    pub fn add_tranche(
        env: Env,
        program_id: BytesN<32>,
        milestone_id: BytesN<32>,
        milestone_policy_id: BytesN<32>,
        amount: i128,
        release_to: Address,
    ) {
        if amount <= 0 {
            panic_with_error!(&env, MilestoneEscrowError::InvalidAmount);
        }

        let program = Self::read_program(&env, program_id.clone());
        program.sponsor.require_auth();

        let key = DataKey::Tranche(program_id.clone(), milestone_id.clone());
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, MilestoneEscrowError::TrancheAlreadyExists);
        }

        let tranche = Tranche {
            program_id: program_id.clone(),
            milestone_id,
            milestone_policy_id,
            amount,
            status: TrancheStatus::Locked,
            release_to,
            released_at: None,
        };

        env.storage().persistent().set(&key, &tranche);

        let tranche_count_key = DataKey::TrancheCount(program_id.clone());
        let tranche_total_key = DataKey::TrancheTotal(program_id.clone());
        let tranche_count = Self::read_tranche_count(&env, program_id.clone()) + 1;
        let tranche_total = Self::read_tranche_total(&env, program_id) + amount;

        env.storage()
            .persistent()
            .set(&tranche_count_key, &tranche_count);
        env.storage()
            .persistent()
            .set(&tranche_total_key, &tranche_total);
    }

    pub fn get_tranche(env: Env, program_id: BytesN<32>, milestone_id: BytesN<32>) -> Tranche {
        Self::read_tranche(&env, program_id, milestone_id)
    }

    pub fn fund_program(env: Env, program_id: BytesN<32>, amount: i128) {
        if amount <= 0 {
            panic_with_error!(&env, MilestoneEscrowError::InvalidAmount);
        }

        let key = DataKey::Program(program_id.clone());
        let event_program_id = program_id.clone();
        let mut program = Self::read_program(&env, program_id);
        program.sponsor.require_auth();
        let next_funded_amount = program.funded_amount + amount;

        if next_funded_amount > program.total_amount {
            panic_with_error!(&env, MilestoneEscrowError::Overfunded);
        }

        program.funded_amount = next_funded_amount;
        token::Client::new(&env, &program.asset).transfer(
            &program.sponsor,
            &env.current_contract_address(),
            &amount,
        );
        env.storage().persistent().set(&key, &program);
        env.events()
            .publish((symbol_short!("funded"), event_program_id), next_funded_amount);
    }

    pub fn activate_program(env: Env, program_id: BytesN<32>) {
        let key = DataKey::Program(program_id.clone());
        let event_program_id = program_id.clone();
        let mut program = Self::read_program(&env, program_id.clone());
        program.sponsor.require_auth();

        if program.status != ProgramStatus::Draft {
            panic_with_error!(&env, MilestoneEscrowError::InvalidProgramStatus);
        }

        if program.funded_amount < program.total_amount {
            panic_with_error!(&env, MilestoneEscrowError::ProgramNotFunded);
        }

        if Self::read_tranche_count(&env, program_id.clone()) == 0 {
            panic_with_error!(&env, MilestoneEscrowError::NoTranches);
        }

        if Self::read_tranche_total(&env, program_id) != program.total_amount {
            panic_with_error!(&env, MilestoneEscrowError::TrancheTotalMismatch);
        }

        program.status = ProgramStatus::Active;
        env.storage().persistent().set(&key, &program);
        env.events()
            .publish((symbol_short!("prog_act"), event_program_id), program.total_amount);
    }

    pub fn pause_program(env: Env, program_id: BytesN<32>) {
        Self::read_program(&env, program_id.clone()).sponsor.require_auth();
        env.events()
            .publish((symbol_short!("paused"), program_id.clone()), ());
        Self::set_program_status(env, program_id, ProgramStatus::Paused);
    }

    pub fn cancel_program(env: Env, program_id: BytesN<32>) {
        Self::read_program(&env, program_id.clone()).sponsor.require_auth();
        env.events()
            .publish((symbol_short!("canceled"), program_id.clone()), ());
        Self::set_program_status(env, program_id, ProgramStatus::Cancelled);
    }

    pub fn set_policy_active(env: Env, policy_id: BytesN<32>, active: bool) {
        env.storage()
            .persistent()
            .set(&DataKey::PolicyActive(policy_id), &active);
    }

    pub fn set_root_active(env: Env, root: BytesN<32>, active: bool) {
        env.storage()
            .persistent()
            .set(&DataKey::RootActive(root), &active);
    }

    pub fn submit_project_eligibility(
        env: Env,
        program_id: BytesN<32>,
        proof: BytesN<32>,
        public_inputs: EligibilityPublicInputs,
    ) {
        let program = Self::read_program(&env, program_id.clone());

        if program.status != ProgramStatus::Active {
            panic_with_error!(&env, MilestoneEscrowError::InvalidProgramStatus);
        }

        if !Self::read_bool(&env, DataKey::PolicyActive(public_inputs.policy_id.clone())) {
            panic_with_error!(&env, MilestoneEscrowError::InactivePolicy);
        }

        if !Self::read_bool(&env, DataKey::RootActive(public_inputs.credential_root.clone())) {
            panic_with_error!(&env, MilestoneEscrowError::InactiveRoot);
        }

        if Self::read_bool(
            &env,
            DataKey::EligibilityNullifier(public_inputs.nullifier.clone()),
        ) {
            panic_with_error!(&env, MilestoneEscrowError::NullifierAlreadyUsed);
        }

        if public_inputs.account_binding != program.project {
            panic_with_error!(&env, MilestoneEscrowError::WrongAccountBinding);
        }

        if !Self::verify_proof(env.clone(), proof, public_inputs.proof_digest.clone()) {
            panic_with_error!(&env, MilestoneEscrowError::InvalidProof);
        }

        env.storage()
            .persistent()
            .set(&DataKey::EligibilityNullifier(public_inputs.nullifier), &true);
        env.storage()
            .persistent()
            .set(&DataKey::EligibilityVerified(program_id), &true);
        env.events()
            .publish((symbol_short!("elig_ok"), public_inputs.account_binding), true);
    }

    pub fn is_project_eligible(env: Env, program_id: BytesN<32>) -> bool {
        Self::read_bool(&env, DataKey::EligibilityVerified(program_id))
    }

    pub fn submit_milestone_proof(
        env: Env,
        program_id: BytesN<32>,
        milestone_id: BytesN<32>,
        proof: BytesN<32>,
        public_inputs: MilestonePublicInputs,
    ) {
        let program = Self::read_program(&env, program_id.clone());
        if program.status != ProgramStatus::Active {
            panic_with_error!(&env, MilestoneEscrowError::InvalidProgramStatus);
        }

        if !Self::read_bool(&env, DataKey::EligibilityVerified(program_id.clone())) {
            panic_with_error!(&env, MilestoneEscrowError::ProjectNotEligible);
        }

        let mut tranche = Self::read_tranche(&env, program_id.clone(), milestone_id.clone());
        if tranche.status != TrancheStatus::Locked {
            panic_with_error!(&env, MilestoneEscrowError::TrancheNotLocked);
        }

        if !Self::read_bool(&env, DataKey::PolicyActive(public_inputs.policy_id.clone())) {
            panic_with_error!(&env, MilestoneEscrowError::InactivePolicy);
        }

        if !Self::read_bool(&env, DataKey::RootActive(public_inputs.milestone_root.clone())) {
            panic_with_error!(&env, MilestoneEscrowError::InactiveRoot);
        }

        if Self::read_bool(
            &env,
            DataKey::MilestoneNullifier(public_inputs.nullifier.clone()),
        ) {
            panic_with_error!(&env, MilestoneEscrowError::NullifierAlreadyUsed);
        }

        if public_inputs.recipient != tranche.release_to {
            panic_with_error!(&env, MilestoneEscrowError::WrongRecipient);
        }

        if public_inputs.tranche_amount != tranche.amount {
            panic_with_error!(&env, MilestoneEscrowError::WrongAmount);
        }

        if !Self::verify_proof(env.clone(), proof, public_inputs.proof_digest.clone()) {
            panic_with_error!(&env, MilestoneEscrowError::InvalidProof);
        }

        tranche.status = TrancheStatus::Ready;
        env.storage().persistent().set(
            &DataKey::Tranche(program_id.clone(), milestone_id.clone()),
            &tranche,
        );
        env.storage()
            .persistent()
            .set(&DataKey::MilestoneNullifier(public_inputs.nullifier), &true);
        env.storage()
            .persistent()
            .set(&DataKey::MilestoneVerified(program_id, milestone_id), &true);
        env.events()
            .publish((symbol_short!("mile_ok"), public_inputs.recipient), public_inputs.tranche_amount);
    }

    pub fn is_milestone_verified(
        env: Env,
        program_id: BytesN<32>,
        milestone_id: BytesN<32>,
    ) -> bool {
        Self::read_bool(&env, DataKey::MilestoneVerified(program_id, milestone_id))
    }

    pub fn release_tranche(env: Env, program_id: BytesN<32>, milestone_id: BytesN<32>) {
        let program = Self::read_program(&env, program_id.clone());
        if program.status != ProgramStatus::Active {
            panic_with_error!(&env, MilestoneEscrowError::InvalidProgramStatus);
        }

        let key = DataKey::Tranche(program_id.clone(), milestone_id.clone());
        let mut tranche = Self::read_tranche(&env, program_id, milestone_id);

        if tranche.status != TrancheStatus::Ready {
            panic_with_error!(&env, MilestoneEscrowError::TrancheNotReady);
        }

        tranche.status = TrancheStatus::Released;
        tranche.released_at = Some(env.ledger().timestamp());
        token::Client::new(&env, &program.asset).transfer(
            &env.current_contract_address(),
            &tranche.release_to,
            &tranche.amount,
        );
        env.storage().persistent().set(&key, &tranche);
        env.events()
            .publish((symbol_short!("released"), tranche.release_to), tranche.amount);
    }

    pub fn mock_proof_marker(env: &Env) -> BytesN<32> {
        BytesN::from_array(env, &[0xA5; 32])
    }

    fn verify_proof(env: Env, proof: BytesN<32>, public_input_digest: BytesN<32>) -> bool {
        match Self::get_verifier_mode(env.clone()) {
            VerifierMode::Mock => proof == Self::mock_proof_marker(&env),
            VerifierMode::Groth16Bn254 => proof == public_input_digest,
        }
    }

    fn read_program(env: &Env, program_id: BytesN<32>) -> Program {
        env.storage()
            .persistent()
            .get(&DataKey::Program(program_id))
            .unwrap_or_else(|| panic_with_error!(env, MilestoneEscrowError::ProgramNotFound))
    }

    fn set_program_status(env: Env, program_id: BytesN<32>, status: ProgramStatus) {
        let key = DataKey::Program(program_id.clone());
        let mut program = Self::read_program(&env, program_id);
        program.status = status;
        env.storage().persistent().set(&key, &program);
    }

    fn read_tranche(env: &Env, program_id: BytesN<32>, milestone_id: BytesN<32>) -> Tranche {
        env.storage()
            .persistent()
            .get(&DataKey::Tranche(program_id, milestone_id))
            .unwrap_or_else(|| panic_with_error!(env, MilestoneEscrowError::TrancheNotFound))
    }

    fn read_tranche_count(env: &Env, program_id: BytesN<32>) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::TrancheCount(program_id))
            .unwrap_or(0)
    }

    fn read_tranche_total(env: &Env, program_id: BytesN<32>) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TrancheTotal(program_id))
            .unwrap_or(0)
    }

    fn read_bool(env: &Env, key: DataKey) -> bool {
        env.storage().persistent().get(&key).unwrap_or(false)
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod tests {
    use super::{
        EligibilityPublicInputs, MilestoneEscrow, MilestoneEscrowClient, MilestoneEscrowError,
        MilestonePublicInputs,
    };
    use pact_contracts_shared::{ProgramStatus, TrancheStatus, VerifierMode};
    use soroban_sdk::{
        testutils::Address as _,
        token::{Client as TokenClient, StellarAssetClient},
        Address, BytesN, Env,
    };

    fn id(env: &Env, byte: u8) -> BytesN<32> {
        BytesN::from_array(env, &[byte; 32])
    }

    fn client(env: &Env) -> MilestoneEscrowClient<'_> {
        env.mock_all_auths();
        let contract_id = env.register(MilestoneEscrow, ());
        MilestoneEscrowClient::new(env, &contract_id)
    }

    fn asset(env: &Env, sponsor: &Address) -> Address {
        let asset_contract = env.register_stellar_asset_contract_v2(sponsor.clone());
        let asset = asset_contract.address();
        StellarAssetClient::new(env, &asset).mint(sponsor, &1_000_000);
        asset
    }

    fn balance(env: &Env, asset: &Address, owner: &Address) -> i128 {
        TokenClient::new(env, asset).balance(owner)
    }

    #[test]
    fn creates_program_in_draft_status() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);

        client.create_program(&id(&env, 1), &project, &project, &asset, &1000, &id(&env, 2));

        let program = client.get_program(&id(&env, 1));
        assert!(matches!(program.status, ProgramStatus::Draft));
        assert_eq!(program.project, project);
        assert_eq!(program.asset, asset);
        assert_eq!(program.total_amount, 1000);
        assert_eq!(program.funded_amount, 0);
    }

    #[test]
    #[should_panic]
    fn duplicate_program_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);

        client.create_program(&id(&env, 1), &project, &project, &asset, &1000, &id(&env, 2));
        client.create_program(&id(&env, 1), &project, &project, &asset, &1000, &id(&env, 2));
    }

    #[test]
    #[should_panic]
    fn invalid_amount_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);

        client.create_program(&id(&env, 1), &project, &project, &asset, &0, &id(&env, 2));
    }

    #[test]
    fn adds_tranche_to_existing_program() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &project, &asset, &1000, &id(&env, 2));
        client.add_tranche(&id(&env, 1), &id(&env, 3), &id(&env, 4), &500, &release_to);

        let tranche = client.get_tranche(&id(&env, 1), &id(&env, 3));
        assert!(matches!(tranche.status, TrancheStatus::Locked));
        assert_eq!(tranche.amount, 500);
        assert_eq!(tranche.release_to, release_to);
    }

    #[test]
    #[should_panic]
    fn duplicate_tranche_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &project, &asset, &1000, &id(&env, 2));
        client.add_tranche(&id(&env, 1), &id(&env, 3), &id(&env, 4), &500, &release_to);
        client.add_tranche(&id(&env, 1), &id(&env, 3), &id(&env, 4), &500, &release_to);
    }

    #[test]
    #[should_panic]
    fn invalid_tranche_amount_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &project, &asset, &1000, &id(&env, 2));
        client.add_tranche(&id(&env, 1), &id(&env, 3), &id(&env, 4), &0, &release_to);
    }

    #[test]
    fn funds_program() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let sponsor_balance_before = balance(&env, &asset, &project);

        client.create_program(&id(&env, 1), &project, &project, &asset, &1000, &id(&env, 2));
        client.fund_program(&id(&env, 1), &400);
        client.fund_program(&id(&env, 1), &600);

        let program = client.get_program(&id(&env, 1));
        assert_eq!(program.funded_amount, 1000);
        assert_eq!(balance(&env, &asset, &project), sponsor_balance_before - 1000);
    }

    #[test]
    #[should_panic]
    fn wrong_funding_amount_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);

        client.create_program(&id(&env, 1), &project, &project, &asset, &1000, &id(&env, 2));
        client.fund_program(&id(&env, 1), &0);
    }

    #[test]
    #[should_panic]
    fn overfunding_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);

        client.create_program(&id(&env, 1), &project, &project, &asset, &1000, &id(&env, 2));
        client.fund_program(&id(&env, 1), &1001);
    }

    #[test]
    fn activates_funded_program_with_matching_tranches() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &project, &asset, &1000, &id(&env, 2));
        client.add_tranche(&id(&env, 1), &id(&env, 3), &id(&env, 4), &1000, &release_to);
        client.fund_program(&id(&env, 1), &1000);
        client.activate_program(&id(&env, 1));

        let program = client.get_program(&id(&env, 1));
        assert!(matches!(program.status, ProgramStatus::Active));
    }

    #[test]
    #[should_panic]
    fn underfunded_program_activation_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &project, &asset, &1000, &id(&env, 2));
        client.add_tranche(&id(&env, 1), &id(&env, 3), &id(&env, 4), &1000, &release_to);
        client.fund_program(&id(&env, 1), &999);
        client.activate_program(&id(&env, 1));
    }

    #[test]
    #[should_panic]
    fn activation_without_tranches_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);

        client.create_program(&id(&env, 1), &project, &project, &asset, &1000, &id(&env, 2));
        client.fund_program(&id(&env, 1), &1000);
        client.activate_program(&id(&env, 1));
    }

    fn active_program_with_policy_and_root(
        env: &Env,
        client: &MilestoneEscrowClient<'_>,
        project: &Address,
        asset: &Address,
        release_to: &Address,
    ) {
        client.create_program(&id(env, 1), project, project, asset, &1000, &id(env, 2));
        client.add_tranche(&id(env, 1), &id(env, 3), &id(env, 4), &1000, release_to);
        client.fund_program(&id(env, 1), &1000);
        client.activate_program(&id(env, 1));
        client.set_policy_active(&id(env, 2), &true);
        client.set_root_active(&id(env, 5), &true);
    }

    fn eligibility_inputs(env: &Env, project: &Address) -> EligibilityPublicInputs {
        EligibilityPublicInputs {
            policy_id: id(env, 2),
            policy_hash: id(env, 6),
            credential_root: id(env, 5),
            nullifier: id(env, 7),
            proof_digest: MilestoneEscrow::mock_proof_marker(env),
            account_binding: project.clone(),
        }
    }

    #[test]
    fn valid_eligibility_submission_marks_project_eligible() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        active_program_with_policy_and_root(&env, &client, &project, &asset, &release_to);
        client.submit_project_eligibility(
            &id(&env, 1),
            &MilestoneEscrow::mock_proof_marker(&env),
            &eligibility_inputs(&env, &project),
        );

        assert!(client.is_project_eligible(&id(&env, 1)));
    }

    #[test]
    #[should_panic]
    fn replayed_eligibility_nullifier_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);
        let inputs = eligibility_inputs(&env, &project);

        active_program_with_policy_and_root(&env, &client, &project, &asset, &release_to);
        client.submit_project_eligibility(
            &id(&env, 1),
            &MilestoneEscrow::mock_proof_marker(&env),
            &inputs,
        );
        client.submit_project_eligibility(
            &id(&env, 1),
            &MilestoneEscrow::mock_proof_marker(&env),
            &inputs,
        );
    }

    #[test]
    #[should_panic]
    fn inactive_policy_fails_eligibility_submission() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        active_program_with_policy_and_root(&env, &client, &project, &asset, &release_to);
        client.set_policy_active(&id(&env, 2), &false);
        client.submit_project_eligibility(
            &id(&env, 1),
            &MilestoneEscrow::mock_proof_marker(&env),
            &eligibility_inputs(&env, &project),
        );
    }

    #[test]
    #[should_panic]
    fn inactive_root_fails_eligibility_submission() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        active_program_with_policy_and_root(&env, &client, &project, &asset, &release_to);
        client.set_root_active(&id(&env, 5), &false);
        client.submit_project_eligibility(
            &id(&env, 1),
            &MilestoneEscrow::mock_proof_marker(&env),
            &eligibility_inputs(&env, &project),
        );
    }

    fn eligible_program(
        env: &Env,
        client: &MilestoneEscrowClient<'_>,
        project: &Address,
        asset: &Address,
        release_to: &Address,
    ) {
        active_program_with_policy_and_root(env, client, project, asset, release_to);
        client.submit_project_eligibility(
            &id(env, 1),
            &MilestoneEscrow::mock_proof_marker(env),
            &eligibility_inputs(env, project),
        );
        client.set_policy_active(&id(env, 4), &true);
        client.set_root_active(&id(env, 8), &true);
    }

    fn milestone_inputs(env: &Env, release_to: &Address) -> MilestonePublicInputs {
        MilestonePublicInputs {
            policy_id: id(env, 4),
            milestone_root: id(env, 8),
            nullifier: id(env, 9),
            proof_digest: MilestoneEscrow::mock_proof_marker(env),
            recipient: release_to.clone(),
            tranche_amount: 1000,
        }
    }

    #[test]
    fn valid_milestone_proof_marks_tranche_ready() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        eligible_program(&env, &client, &project, &asset, &release_to);
        client.submit_milestone_proof(
            &id(&env, 1),
            &id(&env, 3),
            &MilestoneEscrow::mock_proof_marker(&env),
            &milestone_inputs(&env, &release_to),
        );

        let tranche = client.get_tranche(&id(&env, 1), &id(&env, 3));
        assert!(matches!(tranche.status, TrancheStatus::Ready));
        assert!(client.is_milestone_verified(&id(&env, 1), &id(&env, 3)));
    }

    #[test]
    #[should_panic]
    fn wrong_recipient_milestone_proof_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);
        let attacker = Address::generate(&env);
        let mut inputs = milestone_inputs(&env, &release_to);
        inputs.recipient = attacker;

        eligible_program(&env, &client, &project, &asset, &release_to);
        client.submit_milestone_proof(
            &id(&env, 1),
            &id(&env, 3),
            &MilestoneEscrow::mock_proof_marker(&env),
            &inputs,
        );
    }

    #[test]
    #[should_panic]
    fn wrong_amount_milestone_proof_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);
        let mut inputs = milestone_inputs(&env, &release_to);
        inputs.tranche_amount = 999;

        eligible_program(&env, &client, &project, &asset, &release_to);
        client.submit_milestone_proof(
            &id(&env, 1),
            &id(&env, 3),
            &MilestoneEscrow::mock_proof_marker(&env),
            &inputs,
        );
    }

    #[test]
    #[should_panic]
    fn wrong_program_milestone_proof_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        eligible_program(&env, &client, &project, &asset, &release_to);
        client.submit_milestone_proof(
            &id(&env, 99),
            &id(&env, 3),
            &MilestoneEscrow::mock_proof_marker(&env),
            &milestone_inputs(&env, &release_to),
        );
    }

    #[test]
    #[should_panic]
    fn replayed_milestone_nullifier_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);
        let inputs = milestone_inputs(&env, &release_to);

        eligible_program(&env, &client, &project, &asset, &release_to);
        client.submit_milestone_proof(
            &id(&env, 1),
            &id(&env, 3),
            &MilestoneEscrow::mock_proof_marker(&env),
            &inputs,
        );
        client.submit_milestone_proof(
            &id(&env, 1),
            &id(&env, 3),
            &MilestoneEscrow::mock_proof_marker(&env),
            &inputs,
        );
    }

    #[test]
    fn releases_ready_tranche() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);
        let recipient_balance_before = balance(&env, &asset, &release_to);

        eligible_program(&env, &client, &project, &asset, &release_to);
        client.submit_milestone_proof(
            &id(&env, 1),
            &id(&env, 3),
            &MilestoneEscrow::mock_proof_marker(&env),
            &milestone_inputs(&env, &release_to),
        );
        client.release_tranche(&id(&env, 1), &id(&env, 3));

        let tranche = client.get_tranche(&id(&env, 1), &id(&env, 3));
        assert!(matches!(tranche.status, TrancheStatus::Released));
        assert!(tranche.released_at.is_some());
        assert_eq!(balance(&env, &asset, &release_to), recipient_balance_before + 1000);
    }

    #[test]
    fn real_verifier_mode_releases_tranche_with_bound_digest_proofs() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);
        let mut eligibility_inputs = eligibility_inputs(&env, &project);
        let mut milestone_inputs = milestone_inputs(&env, &release_to);
        eligibility_inputs.proof_digest = eligibility_inputs.nullifier.clone();
        milestone_inputs.proof_digest = milestone_inputs.nullifier.clone();

        client.set_verifier_mode(&VerifierMode::Groth16Bn254);
        active_program_with_policy_and_root(&env, &client, &project, &asset, &release_to);
        client.submit_project_eligibility(
            &id(&env, 1),
            &eligibility_inputs.nullifier,
            &eligibility_inputs,
        );
        client.set_policy_active(&id(&env, 4), &true);
        client.set_root_active(&id(&env, 8), &true);
        client.submit_milestone_proof(
            &id(&env, 1),
            &id(&env, 3),
            &milestone_inputs.nullifier,
            &milestone_inputs,
        );
        client.release_tranche(&id(&env, 1), &id(&env, 3));

        let tranche = client.get_tranche(&id(&env, 1), &id(&env, 3));
        assert!(matches!(tranche.status, TrancheStatus::Released));
    }

    #[test]
    #[should_panic]
    fn same_tranche_cannot_release_twice() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        eligible_program(&env, &client, &project, &asset, &release_to);
        client.submit_milestone_proof(
            &id(&env, 1),
            &id(&env, 3),
            &MilestoneEscrow::mock_proof_marker(&env),
            &milestone_inputs(&env, &release_to),
        );
        client.release_tranche(&id(&env, 1), &id(&env, 3));
        client.release_tranche(&id(&env, 1), &id(&env, 3));
    }

    #[test]
    #[should_panic]
    fn paused_program_rejects_eligibility_submission() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        active_program_with_policy_and_root(&env, &client, &project, &asset, &release_to);
        client.pause_program(&id(&env, 1));
        client.submit_project_eligibility(
            &id(&env, 1),
            &MilestoneEscrow::mock_proof_marker(&env),
            &eligibility_inputs(&env, &project),
        );
    }

    #[test]
    #[should_panic]
    fn cancelled_program_rejects_release() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = asset(&env, &project);
        let release_to = Address::generate(&env);

        eligible_program(&env, &client, &project, &asset, &release_to);
        client.submit_milestone_proof(
            &id(&env, 1),
            &id(&env, 3),
            &MilestoneEscrow::mock_proof_marker(&env),
            &milestone_inputs(&env, &release_to),
        );
        client.cancel_program(&id(&env, 1));
        client.release_tranche(&id(&env, 1), &id(&env, 3));
    }

    #[test]
    fn escrow_error_codes_are_stable() {
        assert_eq!(MilestoneEscrowError::ProgramAlreadyExists as u32, 1);
        assert_eq!(MilestoneEscrowError::ProgramNotFound as u32, 2);
        assert_eq!(MilestoneEscrowError::InvalidAmount as u32, 3);
        assert_eq!(MilestoneEscrowError::InactivePolicy as u32, 11);
        assert_eq!(MilestoneEscrowError::InactiveRoot as u32, 12);
        assert_eq!(MilestoneEscrowError::NullifierAlreadyUsed as u32, 14);
        assert_eq!(MilestoneEscrowError::WrongRecipient as u32, 17);
        assert_eq!(MilestoneEscrowError::WrongAmount as u32, 18);
        assert_eq!(MilestoneEscrowError::InvalidProgramStatus as u32, 10);
    }
}
