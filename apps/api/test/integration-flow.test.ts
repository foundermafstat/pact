import { beforeEach, describe, expect, it } from "vitest";

import { buildApiServer } from "../src/server";
import { attestorService } from "../src/services/attestor-service";
import { issuerService } from "../src/services/issuer-service";
import { proofJobService } from "../src/services/proof-job-service";
import { programService } from "../src/services/program-service";
import { publicAuditService } from "../src/services/public-audit-service";

const testConfig = {
  nodeEnv: "test",
  appEnv: "test",
  host: "127.0.0.1",
  port: 0,
  corsOrigin: "http://localhost:3000",
  redisUrl: "redis://localhost:6379",
  bullmqPrefix: "pact-test"
};

describe("API integration flow", () => {
  beforeEach(() => {
    attestorService.reset();
    issuerService.reset();
    proofJobService.reset();
    programService.reset();
    publicAuditService.reset();
  });

  it("runs issuer root, attestor root, proof job, and public audit flows", async () => {
    const app = await buildApiServer(testConfig);

    const programResponse = await app.inject({
      method: "POST",
      url: "/api/programs",
      payload: {
        programKey: "PACT-INTEGRATION",
        sponsorWallet: "GSPONSOR",
        projectWallet: "GPROJECT",
        assetContract: "USDC",
        totalAmount: "100000000",
        eligibilityPolicyId: "22222222-2222-4222-8222-222222222222",
        tranches: [
          {
            milestoneKey: "M1",
            milestonePolicyId: "33333333-3333-4333-8333-333333333333",
            amount: "50000000",
            releaseToWallet: "GPROJECT"
          }
        ]
      }
    });
    const programId = programResponse.json().data.program.id;

    const credentialResponse = await app.inject({
      method: "POST",
      url: "/api/issuer/credentials/mock",
      payload: {
        wallet: "GPROJECT",
        isAccredited: true,
        isNonUs: false,
        jurisdictionCode: "US",
        sanctionsPassed: true,
        expiresAt: 1785600000
      }
    });
    const issuerRootResponse = await app.inject({
      method: "POST",
      url: "/api/issuer/roots/build",
      payload: {
        policyId: "22222222-2222-4222-8222-222222222222",
        rootType: "Credential"
      }
    });
    const issuerPublishResponse = await app.inject({
      method: "POST",
      url: "/api/issuer/roots/publish",
      payload: {
        rootId: issuerRootResponse.json().data.id
      }
    });

    await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-evidence/mock",
      payload: {
        programId,
        milestoneKey: "M1",
        metrics: {
          activeUsers: 735,
          pilotPartners: 4,
          auditPassed: true
        },
        sourceRefs: ["integration"]
      }
    });
    const attestorRootResponse = await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-root/build",
      payload: {
        policyId: "33333333-3333-4333-8333-333333333333",
        rootType: "MilestoneMetrics"
      }
    });
    await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-root/publish",
      payload: {
        rootId: attestorRootResponse.json().data.root.id
      }
    });

    const eligibilityProofResponse = await app.inject({
      method: "POST",
      url: "/api/proofs/eligibility/generate",
      payload: {
        credentialId: credentialResponse.json().data.credential.id
      }
    });
    const milestoneProofResponse = await app.inject({
      method: "POST",
      url: "/api/proofs/milestone/generate",
      payload: {
        programId,
        milestoneKey: "M1"
      }
    });
    const auditResponse = await app.inject({
      method: "GET",
      url: `/api/programs/${programId}/audit`
    });

    expect(issuerPublishResponse.json().data.status).toBe("Active");
    expect(attestorRootResponse.json().data.root.status).toBe("Pending");
    expect(eligibilityProofResponse.json().data.status).toBe("Succeeded");
    expect(milestoneProofResponse.json().data.status).toBe("Succeeded");
    expect(JSON.stringify(auditResponse.json())).not.toContain("activeUsers");

    await app.close();
  });
});
