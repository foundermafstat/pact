import { describe, expect, it } from "vitest";

import {
  CreateMilestoneEvidenceRequestSchema,
  CreateProgramRequestSchema,
  MilestoneAttestationDtoSchema,
  ProgramDtoSchema,
  ProofJobDtoSchema
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
});
