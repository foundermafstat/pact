import { describe, expect, it } from "vitest";

import {
  EligibilityPrivateInputSchema,
  EligibilityPublicInputSchema,
  MilestonePrivateInputSchema,
  MilestonePublicInputSchema,
  PaymentRevenuePrivateInputSchema,
  PaymentRevenuePublicInputSchema
} from "../src/circuit-io";

const merklePath = {
  elements: ["0x01", "0x02"],
  indices: [0, 1]
};

describe("circuit input schemas", () => {
  it("accepts valid eligibility private/public inputs", () => {
    expect(
      EligibilityPrivateInputSchema.parse({
        credentialSecret: "0x01",
        credentialSalt: "0x02",
        subjectId: "project-1",
        jurisdictionCode: "US",
        isAccredited: true,
        isNonUs: false,
        sanctionsPassed: true,
        expiresAt: 1785600000,
        issuerId: "PACT_KYB_MOCK_ISSUER",
        merklePath
      })
    ).toBeDefined();

    expect(
      EligibilityPublicInputSchema.parse({
        policyHash: "0xabc1",
        credentialRoot: "0xabc2",
        nullifier: "0xabc3",
        chainId: "stellar-testnet",
        contractId: "escrow-contract",
        marketId: "PACT_GRANT_001",
        assetId: "PACTUSD",
        actionType: "ProjectEligibility",
        accountBinding: "GPROJECT",
        currentEpoch: 1780000000
      })
    ).toBeDefined();
  });

  it("rejects invalid eligibility action type", () => {
    const result = EligibilityPublicInputSchema.safeParse({
      policyHash: "0xabc1",
      credentialRoot: "0xabc2",
      nullifier: "0xabc3",
      chainId: "stellar-testnet",
      contractId: "escrow-contract",
      marketId: "PACT_GRANT_001",
      assetId: "PACTUSD",
      actionType: "WrongAction",
      accountBinding: "GPROJECT",
      currentEpoch: 1780000000
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid milestone private/public inputs", () => {
    expect(
      MilestonePrivateInputSchema.parse({
        projectSecret: "0x10",
        attestationSecret: "0x11",
        activeUsers: 735,
        pilotPartners: 4,
        auditPassed: true,
        metricSalts: ["0x12", "0x13", "0x14"],
        attestationMerklePath: merklePath
      })
    ).toBeDefined();

    expect(
      MilestonePublicInputSchema.parse({
        policyHash: "0xabc1",
        milestoneRoot: "0xabc2",
        nullifier: "0xabc3",
        programId: "PACT_GRANT_001",
        milestoneId: "M1",
        recipient: "GPROJECT",
        trancheAmount: "2500000000",
        currentEpoch: 1780000000
      })
    ).toBeDefined();
  });

  it("rejects malformed hex fields", () => {
    const result = MilestonePrivateInputSchema.safeParse({
      projectSecret: "not-hex",
      attestationSecret: "0x11",
      activeUsers: 735,
      pilotPartners: 4,
      auditPassed: true,
      metricSalts: ["0x12"],
      attestationMerklePath: merklePath
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid payment revenue private/public inputs", () => {
    expect(
      PaymentRevenuePrivateInputSchema.parse({
        connectorSecret: "0x10",
        snapshotSalt: "0x11",
        netRevenueCents: "1000000",
        grossPaidCents: "1200000",
        refundCents: "100000",
        feeCents: "100000",
        successfulChargeCount: 12,
        sourceRefSalts: ["0x12"]
      })
    ).toBeDefined();

    expect(
      PaymentRevenuePublicInputSchema.parse({
        policyHash: "0xabc1",
        snapshotCommitment: "0xabc2",
        sourceRefsCommitment: "0xabc3",
        connectedAccountHash: "0xabc4",
        programId: "program-1",
        milestoneId: "M1",
        thresholdCents: "1000000",
        currencyCode: "usd",
        periodStartEpoch: 1780000000,
        periodEndEpoch: 1782600000,
        currentEpoch: 1781000000,
        nullifier: "0xabc5"
      })
    ).toBeDefined();
  });
});
