import { beforeEach, describe, expect, it } from "vitest";

import { buildApiServer } from "../src/server";
import { attestorService } from "../src/services/attestor-service";
import { issuerService } from "../src/services/issuer-service";
import { proofJobService } from "../src/services/proof-job-service";
import { programService } from "../src/services/program-service";
import { useDefaultAuth } from "./auth-test-utils";

const testConfig = {
  nodeEnv: "test",
  appEnv: "test",
  host: "127.0.0.1",
  port: 0,
  corsOrigin: "http://localhost:3000",
  redisUrl: "redis://localhost:6379",
  bullmqPrefix: "pact-test"
};

describe("Proof APIs", () => {
  beforeEach(async () => {
    await attestorService.reset();
    await issuerService.reset();
    await proofJobService.reset();
    programService.reset();
  });

  it("creates and completes a local eligibility proof job", async () => {
    const app = await buildApiServer(testConfig);
    await useDefaultAuth(app, "GPROJECT", "Admin");

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
    const credentialId = credentialResponse.json().data.credential.id;

    const response = await app.inject({
      method: "POST",
      url: "/api/proofs/eligibility/generate",
      payload: {
        credentialId
      }
    });

    const body = response.json().data;
    expect(response.statusCode).toBe(200);
    expect(body.proofType).toBe("Eligibility");
    expect(body.status).toBe("Succeeded");
    expect(body.publicInputsJson.nullifier).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.proofJson.mode).toBe("local");
    expect(JSON.stringify(body)).not.toContain("credentialSecret");

    await app.close();
  }, 20_000);

  it("rejects eligibility proof jobs for unknown credentials", async () => {
    const app = await buildApiServer(testConfig);
    await useDefaultAuth(app, "GPROJECT", "Admin");

    const response = await app.inject({
      method: "POST",
      url: "/api/proofs/eligibility/generate",
      payload: {
        credentialId: "11111111-1111-4111-8111-111111111111"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("credential_not_found");

    await app.close();
  });

  it("rejects eligibility proof jobs for revoked credentials", async () => {
    const app = await buildApiServer(testConfig);
    await useDefaultAuth(app, "GPROJECT", "Admin");

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
    const credentialId = credentialResponse.json().data.credential.id;
    await app.inject({
      method: "POST",
      url: `/api/issuer/credentials/${credentialId}/revoke`
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/proofs/eligibility/generate",
      payload: {
        credentialId
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("credential_not_active");

    await app.close();
  });

  it("creates and completes a local milestone proof job", async () => {
    const app = await buildApiServer(testConfig);
    await useDefaultAuth(app, "GPROJECT", "Admin");

    const programResponse = await app.inject({
      method: "POST",
      url: "/api/programs",
      payload: {
        programKey: `PACT-DEMO-001-${Date.now()}`,
        sponsorWallet: "GSPONSOR",
        projectWallet: "GPROJECT",
        assetContract: "USDC",
        totalAmount: "100000000",
        eligibilityPolicyId: "eligibility-policy-1",
        tranches: [
          {
            milestoneKey: "M1",
            milestonePolicyId: "22222222-2222-4222-8222-222222222222",
            amount: "50000000",
            releaseToWallet: "GPROJECT"
          }
        ]
      }
    });
    const programId = programResponse.json().data.program.id;

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
        sourceRefs: ["mock_github_release_001"]
      }
    });
    const buildResponse = await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-root/build",
      payload: {
        policyId: "22222222-2222-4222-8222-222222222222",
        rootType: "MilestoneMetrics"
      }
    });
    await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-root/publish",
      payload: {
        rootId: buildResponse.json().data.root.id
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/proofs/milestone/generate",
      payload: {
        programId,
        milestoneKey: "M1"
      }
    });

    const body = response.json().data;
    expect(response.statusCode).toBe(200);
    expect(body.proofType).toBe("MilestoneUnlock");
    expect(body.status).toBe("Succeeded");
    expect(body.publicInputsJson.milestoneRoot).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.proofJson.mode).toBe("local");
    expect(JSON.stringify(body)).not.toContain("activeUsers");

    await app.close();
  }, 20_000);

  it("rejects milestone release when smart contract payout is not configured", async () => {
    const app = await buildApiServer(testConfig);
    await useDefaultAuth(app, "GPROJECT", "Admin");

    const programResponse = await app.inject({
      method: "POST",
      url: "/api/programs",
      payload: {
        programKey: `PACT-DEMO-003-${Date.now()}`,
        sponsorWallet: "GSPONSOR",
        projectWallet: "GPROJECT",
        assetContract: "USDC",
        totalAmount: "100000000",
        eligibilityPolicyId: "eligibility-policy-1",
        tranches: [
          {
            milestoneKey: "M1",
            milestonePolicyId: "22222222-2222-4222-8222-222222222222",
            amount: "50000000",
            releaseToWallet: "GPROJECT"
          }
        ]
      }
    });
    const programId = programResponse.json().data.program.id;

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
        sourceRefs: ["mock_github_release_001"]
      }
    });
    const buildResponse = await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-root/build",
      payload: {
        policyId: "22222222-2222-4222-8222-222222222222",
        rootType: "MilestoneMetrics"
      }
    });
    await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-root/publish",
      payload: {
        rootId: buildResponse.json().data.root.id
      }
    });
    const proofResponse = await app.inject({
      method: "POST",
      url: "/api/proofs/milestone/generate",
      payload: {
        programId,
        milestoneKey: "M1"
      }
    });
    const proofJobId = proofResponse.json().data.id;

    const previousContractId = process.env["MILESTONE_ESCROW_CONTRACT_ID"];
    delete process.env["MILESTONE_ESCROW_CONTRACT_ID"];
    const submitResponse = await app.inject({
      method: "POST",
      url: "/api/proofs/milestone/submit",
      payload: {
        proofJobId,
        programId,
        milestoneKey: "M1"
      }
    });
    if (previousContractId) {
      process.env["MILESTONE_ESCROW_CONTRACT_ID"] = previousContractId;
    }

    expect(submitResponse.statusCode).toBe(503);
    expect(submitResponse.json().error.message).toBe(
      "Smart contract release is not configured"
    );

    await app.close();
  }, 20_000);

  it("rejects non-milestone proof jobs during milestone submit", async () => {
    const app = await buildApiServer(testConfig);
    await useDefaultAuth(app, "GPROJECT", "Admin");

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
    const credentialId = credentialResponse.json().data.credential.id;
    const proofResponse = await app.inject({
      method: "POST",
      url: "/api/proofs/eligibility/generate",
      payload: {
        credentialId
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/proofs/milestone/submit",
      payload: {
        proofJobId: proofResponse.json().data.id,
        programId: "11111111-1111-4111-8111-111111111111",
        milestoneKey: "M1"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("proof_job_not_submittable");

    await app.close();
  }, 20_000);

  it("rejects milestone proof jobs without active evidence root", async () => {
    const app = await buildApiServer(testConfig);
    await useDefaultAuth(app, "GPROJECT", "Admin");

    const programResponse = await app.inject({
      method: "POST",
      url: "/api/programs",
      payload: {
        programKey: `PACT-DEMO-002-${Date.now()}`,
        sponsorWallet: "GSPONSOR",
        projectWallet: "GPROJECT",
        assetContract: "USDC",
        totalAmount: "100000000",
        eligibilityPolicyId: "eligibility-policy-1",
        tranches: [
          {
            milestoneKey: "M1",
            milestonePolicyId: "22222222-2222-4222-8222-222222222222",
            amount: "50000000",
            releaseToWallet: "GPROJECT"
          }
        ]
      }
    });
    const programId = programResponse.json().data.program.id;

    const response = await app.inject({
      method: "POST",
      url: "/api/proofs/milestone/generate",
      payload: {
        programId,
        milestoneKey: "M1"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("milestone_proof_input_unavailable");

    await app.close();
  });

  it("returns proof job status without private fields", async () => {
    const app = await buildApiServer(testConfig);
    await useDefaultAuth(app, "GPROJECT", "Admin");

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
    const credentialId = credentialResponse.json().data.credential.id;
    const generateResponse = await app.inject({
      method: "POST",
      url: "/api/proofs/eligibility/generate",
      payload: {
        credentialId
      }
    });
    const proofJobId = generateResponse.json().data.id;

    const statusResponse = await app.inject({
      method: "GET",
      url: `/api/proofs/${proofJobId}`
    });

    const body = statusResponse.json().data;
    expect(statusResponse.statusCode).toBe(200);
    expect(body.status).toBe("Succeeded");
    expect(body.publicInputsJson.nullifier).toMatch(/^0x[0-9a-f]{64}$/);
    expect(JSON.stringify(body)).not.toContain("privateInputs");
    expect(JSON.stringify(body)).not.toContain("credentialSecret");

    await app.close();
  }, 20_000);

  it("returns 404 for unknown proof jobs", async () => {
    const app = await buildApiServer(testConfig);
    await useDefaultAuth(app, "GPROJECT", "Admin");

    const response = await app.inject({
      method: "GET",
      url: "/api/proofs/11111111-1111-4111-8111-111111111111"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("proof_job_not_found");

    await app.close();
  });
});
