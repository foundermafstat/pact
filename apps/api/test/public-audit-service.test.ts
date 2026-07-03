import { beforeEach, describe, expect, it } from "vitest";

import { programService } from "../src/services/program-service";
import { publicAuditService } from "../src/services/public-audit-service";

describe("PublicAuditService", () => {
  beforeEach(async () => {
    programService.reset();
    await publicAuditService.reset();
  });

  it("projects public program audit timeline without private fields", async () => {
    const record = await programService.createProgram({
      programKey: `PACT-DEMO-AUDIT-${Date.now()}`,
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

    await publicAuditService.recordContractEvent(record.program.id, {
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
