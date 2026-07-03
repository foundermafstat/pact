import { describe, expect, it } from "vitest";

import {
  CreateMilestoneEvidenceRequestSchema,
  CreateStripeRevenueSnapshotRequestSchema,
  CreateProgramRequestSchema,
  GenerateStripeRevenueProofRequestSchema,
  MilestoneAttestationDtoSchema,
  ProgramDtoSchema,
  ProofJobDtoSchema,
  StripeConnectionStatusDtoSchema,
  StripeRevenueSnapshotDtoSchema
} from "../src/api-dto";

const id = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-07-02T18:00:00.000Z";

describe("API DTO schemas", () => {
  it("accepts a valid program DTO", () => {
    expect(
      ProgramDtoSchema.parse({
        id,
        programKey: "PACT_GRANT_001",
        sponsorWallet: "GSPONSOR",
        projectWallet: "GPROJECT",
        assetContract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUV3KWARVJHXMJFQF3ZCZ6Q2AAAAA",
        totalAmount: "1000000000",
        fundedAmount: "0",
        status: "Draft",
        eligibilityPolicyId: "eligibility.accredited_or_non_us",
        createdAt: timestamp,
        updatedAt: timestamp
      })
    ).toBeDefined();
  });

  it("rejects create program requests without tranches", () => {
    const result = CreateProgramRequestSchema.safeParse({
      programKey: "PACT_GRANT_001",
      sponsorWallet: "GSPONSOR",
      projectWallet: "GPROJECT",
      assetContract: "asset",
      totalAmount: "1000000000",
      eligibilityPolicyId: "eligibility.accredited_or_non_us",
      tranches: []
    });

    expect(result.success).toBe(false);
  });

  it("accepts private milestone evidence request DTO", () => {
    expect(
      CreateMilestoneEvidenceRequestSchema.parse({
        programId: id,
        milestoneKey: "M1",
        metrics: {
          activeUsers: 735,
          pilotPartners: 4,
          auditPassed: true
        },
        sourceRefs: ["mock_github_release_001"]
      })
    ).toBeDefined();
  });

  it("accepts milestone attestation and proof job DTOs", () => {
    expect(
      MilestoneAttestationDtoSchema.parse({
        id,
        programId: id,
        milestoneKey: "M1",
        milestoneRoot: "0x1234",
        privateMetricsEncrypted: "encrypted",
        publicPolicyHash: "0xabcd",
        attestorId: "PACT_MILESTONE_MOCK_ATTESTOR",
        status: "Validated",
        txHash: null,
        createdAt: timestamp
      })
    ).toBeDefined();

    expect(
      ProofJobDtoSchema.parse({
        id,
        proofType: "MilestoneUnlock",
        status: "Queued",
        requestJson: { milestoneKey: "M1" },
        publicInputsJson: null,
        proofJson: null,
        error: null,
        createdAt: timestamp,
        completedAt: null
      })
    ).toBeDefined();
  });

  it("accepts Stripe revenue proof DTOs", () => {
    expect(
      StripeConnectionStatusDtoSchema.parse({
        source: "stripe",
        mode: "test",
        programId: id,
        status: "connected",
        connectedAccountHash: "0xabc1",
        livemode: false,
        scope: "read_write",
        connectedAt: timestamp,
        deauthorizedAt: null,
        updatedAt: timestamp
      })
    ).toBeDefined();

    expect(
      CreateStripeRevenueSnapshotRequestSchema.parse({
        programId: id,
        periodStart: "2026-07-01",
        periodEnd: "2026-08-01",
        currency: "usd",
        thresholdCents: "1000000"
      })
    ).toBeDefined();

    expect(
      StripeRevenueSnapshotDtoSchema.parse({
        id,
        programId: id,
        source: "stripe",
        mode: "test",
        connectedAccountHash: "0xabc1",
        periodStart: timestamp,
        periodEnd: "2026-08-01T00:00:00.000Z",
        currency: "usd",
        thresholdCents: "1000000",
        policyHash: "0xabc2",
        snapshotCommitment: "0xabc3",
        sourceRefsCommitment: "0xabc4",
        generatedAt: timestamp,
        status: "Generated",
        thresholdPassed: true
      })
    ).toBeDefined();

    expect(
      GenerateStripeRevenueProofRequestSchema.parse({
        snapshotId: id,
        milestoneId: "M1"
      })
    ).toBeDefined();
  });
});
