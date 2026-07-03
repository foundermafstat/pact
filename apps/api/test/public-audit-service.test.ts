import { beforeEach, describe, expect, it } from "vitest";

import { programService } from "../src/services/program-service";
import { publicAuditService } from "../src/services/public-audit-service";

describe("PublicAuditService", () => {
  beforeEach(() => {
    programService.reset();
    publicAuditService.reset();
  });

  it("projects public program audit timeline without private fields", async () => {
    const record = await programService.createProgram({
      programKey: "PACT-DEMO-AUDIT",
      sponsorWallet: "GSPONSOR",
      projectWallet: "GPROJECT",
      assetContract: "USDC",
      totalAmount: "1000",
      eligibilityPolicyId: "eligibility-policy-1",
      tranches: [
        {
          milestoneKey: "M1",
          milestonePolicyId: "milestone-policy-1",
          amount: "1000",
          releaseToWallet: "GPROJECT"
        }
      ]
    });

    publicAuditService.recordContractEvent(record.program.id, {
      id: "11111111-1111-4111-8111-111111111111",
      contractId: "escrow",
      eventType: "released",
      txHash: "tx-1",
      ledger: 100,
      payload: {
        programId: record.program.id,
        releasedAmount: "1000",
        privateMetricsEncrypted: "hidden",
        credentialSecret: "hidden"
      },
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    const audit = await publicAuditService.getProgramAudit(record.program.id);

    expect(audit?.timeline.map((item) => item.type)).toContain("released");
    expect(JSON.stringify(audit)).toContain("releasedAmount");
    expect(JSON.stringify(audit)).not.toContain("privateMetricsEncrypted");
    expect(JSON.stringify(audit)).not.toContain("credentialSecret");
    expect(JSON.stringify(audit)).not.toContain("hidden");
  });
});
