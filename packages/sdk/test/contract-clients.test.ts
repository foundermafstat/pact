import { describe, expect, it } from "vitest";

import {
  MilestoneEscrowClient,
  MissingContractIdError,
  PolicyRegistryClient,
  type ContractInvocation,
  type ContractInvocationTransport
} from "../src/contracts";

const createMockTransport = () => {
  const invocations: ContractInvocation[] = [];
  const transport: ContractInvocationTransport = {
    invoke: async <T>(invocation: ContractInvocation) => {
      invocations.push(invocation);
      return { result: undefined as T };
    }
  };

  return { invocations, transport };
};

describe("contract clients", () => {
  it("builds typed MilestoneEscrow invocations", async () => {
    const { invocations, transport } = createMockTransport();
    const client = new MilestoneEscrowClient("escrow-id", transport);

    await client.createProgram({
      programId: "program-1",
      sponsor: "GSPONSOR",
      project: "GPROJECT",
      asset: "asset-id",
      totalAmount: "1000",
      eligibilityPolicyId: "policy-1"
    });
    await client.setVerifierMode("Groth16Bn254");
    await client.submitMilestoneProof({
      programId: "program-1",
      milestoneId: "M1",
      proof: "proof",
      publicInputs: {
        milestone_root: "root",
        nullifier: "nullifier",
        proof_digest: "digest",
        policy_id: "policy-1",
        recipient: "GPROJECT",
        tranche_amount: "1000"
      }
    });
    await client.releaseTranche("program-1", "M1");

    expect(invocations).toEqual([
      {
        contractId: "escrow-id",
        method: "create_program",
        args: ["program-1", "GSPONSOR", "GPROJECT", "asset-id", "1000", "policy-1"]
      },
      {
        contractId: "escrow-id",
        method: "set_verifier_mode",
        args: ["Groth16Bn254"]
      },
      {
        contractId: "escrow-id",
        method: "submit_milestone_proof",
        args: [
          "program-1",
          "M1",
          "proof",
          {
            milestone_root: "root",
            nullifier: "nullifier",
            proof_digest: "digest",
            policy_id: "policy-1",
            recipient: "GPROJECT",
            tranche_amount: "1000"
          }
        ]
      },
      {
        contractId: "escrow-id",
        method: "release_tranche",
        args: ["program-1", "M1"]
      }
    ]);
  });

  it("builds typed PolicyRegistry invocations", async () => {
    const { invocations, transport } = createMockTransport();
    const client = new PolicyRegistryClient("policy-id", transport);

    await client.activatePolicy("policy-1");

    expect(invocations).toEqual([
      {
        contractId: "policy-id",
        method: "activate_policy",
        args: ["policy-1"]
      }
    ]);
  });

  it("rejects missing contract ids", () => {
    const { transport } = createMockTransport();
    expect(() => new MilestoneEscrowClient(undefined, transport)).toThrow(
      MissingContractIdError
    );
  });
});
