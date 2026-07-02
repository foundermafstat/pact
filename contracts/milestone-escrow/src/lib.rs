#![no_std]

use pact_contracts_shared::{Program, ProgramStatus, Tranche, TrancheStatus};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, BytesN, Env,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Program(BytesN<32>),
    Tranche(BytesN<32>, BytesN<32>),
    TrancheCount(BytesN<32>),
    TrancheTotal(BytesN<32>),
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

    pub fn create_program(
        env: Env,
        program_id: BytesN<32>,
        project: Address,
        asset: Address,
        total_amount: i128,
        eligibility_policy_id: BytesN<32>,
    ) {
        if total_amount <= 0 {
            panic_with_error!(&env, MilestoneEscrowError::InvalidAmount);
        }

        let key = DataKey::Program(program_id.clone());
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, MilestoneEscrowError::ProgramAlreadyExists);
        }

        let program = Program {
            program_id,
            sponsor: env.current_contract_address(),
            project,
            asset,
            total_amount,
            funded_amount: 0,
            status: ProgramStatus::Draft,
            eligibility_policy_id,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&key, &program);
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

        Self::read_program(&env, program_id.clone());

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
        let mut program = Self::read_program(&env, program_id);
        let next_funded_amount = program.funded_amount + amount;

        if next_funded_amount > program.total_amount {
            panic_with_error!(&env, MilestoneEscrowError::Overfunded);
        }

        program.funded_amount = next_funded_amount;
        env.storage().persistent().set(&key, &program);
    }

    pub fn activate_program(env: Env, program_id: BytesN<32>) {
        let key = DataKey::Program(program_id.clone());
        let mut program = Self::read_program(&env, program_id.clone());

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
    }

    fn read_program(env: &Env, program_id: BytesN<32>) -> Program {
        env.storage()
            .persistent()
            .get(&DataKey::Program(program_id))
            .unwrap_or_else(|| panic_with_error!(env, MilestoneEscrowError::ProgramNotFound))
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
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod tests {
    use super::{MilestoneEscrow, MilestoneEscrowClient};
    use pact_contracts_shared::{ProgramStatus, TrancheStatus};
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

    fn id(env: &Env, byte: u8) -> BytesN<32> {
        BytesN::from_array(env, &[byte; 32])
    }

    fn client(env: &Env) -> MilestoneEscrowClient<'_> {
        let contract_id = env.register(MilestoneEscrow, ());
        MilestoneEscrowClient::new(env, &contract_id)
    }

    #[test]
    fn creates_program_in_draft_status() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &asset, &1000, &id(&env, 2));

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
        let asset = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &asset, &1000, &id(&env, 2));
        client.create_program(&id(&env, 1), &project, &asset, &1000, &id(&env, 2));
    }

    #[test]
    #[should_panic]
    fn invalid_amount_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &asset, &0, &id(&env, 2));
    }

    #[test]
    fn adds_tranche_to_existing_program() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = Address::generate(&env);
        let release_to = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &asset, &1000, &id(&env, 2));
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
        let asset = Address::generate(&env);
        let release_to = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &asset, &1000, &id(&env, 2));
        client.add_tranche(&id(&env, 1), &id(&env, 3), &id(&env, 4), &500, &release_to);
        client.add_tranche(&id(&env, 1), &id(&env, 3), &id(&env, 4), &500, &release_to);
    }

    #[test]
    #[should_panic]
    fn invalid_tranche_amount_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = Address::generate(&env);
        let release_to = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &asset, &1000, &id(&env, 2));
        client.add_tranche(&id(&env, 1), &id(&env, 3), &id(&env, 4), &0, &release_to);
    }

    #[test]
    fn funds_program() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &asset, &1000, &id(&env, 2));
        client.fund_program(&id(&env, 1), &400);
        client.fund_program(&id(&env, 1), &600);

        let program = client.get_program(&id(&env, 1));
        assert_eq!(program.funded_amount, 1000);
    }

    #[test]
    #[should_panic]
    fn wrong_funding_amount_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &asset, &1000, &id(&env, 2));
        client.fund_program(&id(&env, 1), &0);
    }

    #[test]
    #[should_panic]
    fn overfunding_fails() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &asset, &1000, &id(&env, 2));
        client.fund_program(&id(&env, 1), &1001);
    }

    #[test]
    fn activates_funded_program_with_matching_tranches() {
        let env = Env::default();
        let client = client(&env);
        let project = Address::generate(&env);
        let asset = Address::generate(&env);
        let release_to = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &asset, &1000, &id(&env, 2));
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
        let asset = Address::generate(&env);
        let release_to = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &asset, &1000, &id(&env, 2));
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
        let asset = Address::generate(&env);

        client.create_program(&id(&env, 1), &project, &asset, &1000, &id(&env, 2));
        client.fund_program(&id(&env, 1), &1000);
        client.activate_program(&id(&env, 1));
    }
}
