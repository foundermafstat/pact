import type { ContractInvocationTransport } from "./transport";
import { assertContractId } from "./transport";

export class MilestoneEscrowClient {
  private readonly contractId: string;

  public constructor(
    contractId: string | undefined,
    private readonly transport: ContractInvocationTransport
  ) {
    this.contractId = assertContractId("MilestoneEscrow", contractId);
  }

  public createProgram(args: {
    programId: string;
    project: string;
    asset: string;
    totalAmount: string;
    eligibilityPolicyId: string;
  }) {
    return this.transport.invoke<void>({
      contractId: this.contractId,
      method: "create_program",
      args: [
        args.programId,
        args.project,
        args.asset,
        args.totalAmount,
        args.eligibilityPolicyId
      ]
    });
  }

  public fundProgram(programId: string, amount: string) {
    return this.transport.invoke<void>({
      contractId: this.contractId,
      method: "fund_program",
      args: [programId, amount]
    });
  }

  public activateProgram(programId: string) {
    return this.transport.invoke<void>({
      contractId: this.contractId,
      method: "activate_program",
      args: [programId]
    });
  }

  public addTranche(args: {
    programId: string;
    milestoneId: string;
    milestonePolicyId: string;
    amount: string;
    releaseTo: string;
  }) {
    return this.transport.invoke<void>({
      contractId: this.contractId,
      method: "add_tranche",
      args: [
        args.programId,
        args.milestoneId,
        args.milestonePolicyId,
        args.amount,
        args.releaseTo
      ]
    });
  }

  public setPolicyActive(policyId: string, active: boolean) {
    return this.transport.invoke<void>({
      contractId: this.contractId,
      method: "set_policy_active",
      args: [policyId, active]
    });
  }

  public setRootActive(root: string, active: boolean) {
    return this.transport.invoke<void>({
      contractId: this.contractId,
      method: "set_root_active",
      args: [root, active]
    });
  }

  public submitProjectEligibility(args: {
    programId: string;
    proof: string;
    publicInputs: {
      account_binding: string;
      credential_root: string;
      nullifier: string;
      policy_hash: string;
      policy_id: string;
    };
  }) {
    return this.transport.invoke<void>({
      contractId: this.contractId,
      method: "submit_project_eligibility",
      args: [args.programId, args.proof, args.publicInputs]
    });
  }

  public submitMilestoneProof(args: {
    programId: string;
    milestoneId: string;
    proof: string;
    publicInputs:
      | string
      | {
          milestone_root: string;
          nullifier: string;
          policy_id: string;
          recipient: string;
          tranche_amount: string;
        };
  }) {
    return this.transport.invoke<void>({
      contractId: this.contractId,
      method: "submit_milestone_proof",
      args: [args.programId, args.milestoneId, args.proof, args.publicInputs]
    });
  }

  public releaseTranche(programId: string, milestoneId: string) {
    return this.transport.invoke<void>({
      contractId: this.contractId,
      method: "release_tranche",
      args: [programId, milestoneId]
    });
  }
}
