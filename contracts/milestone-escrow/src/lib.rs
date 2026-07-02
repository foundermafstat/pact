#![no_std]

use pact_contracts_shared::{Program, ProgramStatus};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, BytesN, Env,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Program(BytesN<32>),
}

#[contracterror]
#[derive(Clone, Copy, Eq, PartialEq)]
#[repr(u32)]
pub enum MilestoneEscrowError {
    ProgramAlreadyExists = 1,
    ProgramNotFound = 2,
    InvalidAmount = 3,
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

    fn read_program(env: &Env, program_id: BytesN<32>) -> Program {
        env.storage()
            .persistent()
            .get(&DataKey::Program(program_id))
            .unwrap_or_else(|| panic_with_error!(env, MilestoneEscrowError::ProgramNotFound))
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod tests {
    use super::{MilestoneEscrow, MilestoneEscrowClient};
    use pact_contracts_shared::ProgramStatus;
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
}
