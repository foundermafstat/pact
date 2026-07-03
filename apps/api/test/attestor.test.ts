import { beforeEach, describe, expect, it } from "vitest";
import { buildMerkleTree } from "@pact/zk";

import { buildApiServer } from "../src/server";
import {
  attestorService,
  buildMilestoneCommitment
} from "../src/services/attestor-service";
import { programService } from "../src/services/program-service";
import { authHeaders } from "./auth-test-utils";

const testConfig = {
  nodeEnv: "test",
  appEnv: "test",
  host: "127.0.0.1",
  port: 0,
  corsOrigin: "http://localhost:3000",
  redisUrl: "redis://localhost:6379",
  bullmqPrefix: "pact-test"
};

const createProgram = async (app: Awaited<ReturnType<typeof buildApiServer>>) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await app.inject({
    method: "POST",
    url: "/api/programs",
    headers: await authHeaders("GSPONSOR", "Investor"),
    payload: {
      programKey: `PACT-ATTESTOR-${suffix}`,
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
  return response.json().data.program.id as string;
};

describe("Attestor APIs", () => {
  beforeEach(async () => {
    await attestorService.reset();
    programService.reset();
  });

  it("builds a stable milestone commitment and root from a fixture", () => {
    const fixture = {
      programId: "11111111-1111-4111-8111-111111111111",
      milestoneKey: "M1",
      metrics: {
        activeUsers: 735,
        pilotPartners: 4,
        auditPassed: true
      },
      sourceRefs: ["mock_github_release_001"]
    };
    const commitment = buildMilestoneCommitment(fixture, `0x${"11".repeat(32)}`);
    const tree = buildMerkleTree([commitment]);

    expect(buildMilestoneCommitment(fixture, `0x${"11".repeat(32)}`)).toBe(
      commitment
    );
    expect(tree.root).toBe(commitment);
  });

  it("creates mock milestone evidence with encrypted private metrics", async () => {
    const app = await buildApiServer(testConfig);
    const headers = await authHeaders("GATTESTOR", "Attestor");
    const programId = await createProgram(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-evidence/mock",
      headers,
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

    const body = response.json().data;
    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("Pending");
    expect(body.privateMetricsEncrypted).not.toContain("735");
    expect(body.publicPolicyHash).toMatch(/^0x[0-9a-f]{64}$/);

    await app.close();
  });

  it("rejects below-threshold milestone evidence", async () => {
    const app = await buildApiServer(testConfig);
    const headers = await authHeaders("GATTESTOR", "Attestor");
    const programId = await createProgram(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-evidence/mock",
      headers,
      payload: {
        programId,
        milestoneKey: "M1",
        metrics: {
          activeUsers: 499,
          pilotPartners: 4,
          auditPassed: true
        },
        sourceRefs: ["mock_github_release_001"]
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("milestone_validation_failed");

    await app.close();
  });

  it("builds a pending milestone root from validated evidence", async () => {
    const app = await buildApiServer(testConfig);
    const headers = await authHeaders("GATTESTOR", "Attestor");
    const programId = await createProgram(app);

    await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-evidence/mock",
      headers,
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

    const response = await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-root/build",
      headers,
      payload: {
        policyId: "22222222-2222-4222-8222-222222222222",
        rootType: "MilestoneMetrics"
      }
    });

    const body = response.json().data;
    expect(response.statusCode).toBe(200);
    expect(body.root.status).toBe("Pending");
    expect(body.root.rootType).toBe("MilestoneMetrics");
    expect(body.root.root).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.commitments).toHaveLength(1);

    await app.close();
  });

  it("publishes a pending milestone root with a tx hash", async () => {
    const app = await buildApiServer(testConfig);
    const headers = await authHeaders("GATTESTOR", "Attestor");
    const programId = await createProgram(app);

    await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-evidence/mock",
      headers,
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
      headers,
      payload: {
        policyId: "22222222-2222-4222-8222-222222222222",
        rootType: "MilestoneMetrics"
      }
    });
    const rootId = buildResponse.json().data.root.id;

    const publishResponse = await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-root/publish",
      headers,
      payload: {
        rootId
      }
    });

    const body = publishResponse.json().data;
    expect(publishResponse.statusCode).toBe(200);
    expect(body.status).toBe("Active");
    expect(body.txHash).toMatch(/^0x[0-9a-f]{64}$/);

    await app.close();
  });

  it("returns milestone proof input only to the project wallet or admin", async () => {
    const app = await buildApiServer(testConfig);
    const investorHeaders = await authHeaders("GSPONSOR", "Investor");
    const attestorHeaders = await authHeaders("GATTESTOR", "Attestor");
    const projectHeaders = await authHeaders("GPROJECT", "Project");

    const programResponse = await app.inject({
      method: "POST",
      url: "/api/programs",
      headers: investorHeaders,
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
      headers: attestorHeaders,
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
      headers: attestorHeaders,
      payload: {
        policyId: "22222222-2222-4222-8222-222222222222",
        rootType: "MilestoneMetrics"
      }
    });
    await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-root/publish",
      headers: attestorHeaders,
      payload: {
        rootId: buildResponse.json().data.root.id
      }
    });

    const forbiddenResponse = await app.inject({
      method: "GET",
      url: `/api/attestor/programs/${programId}/milestones/M1`
    });
    const proofInputResponse = await app.inject({
      method: "GET",
      url: `/api/attestor/programs/${programId}/milestones/M1`,
      headers: projectHeaders
    });
    const auditResponse = await app.inject({
      method: "GET",
      url: `/api/programs/${programId}/audit`,
      headers: projectHeaders
    });

    expect(forbiddenResponse.statusCode).toBe(401);
    expect(proofInputResponse.statusCode).toBe(200);
    expect(proofInputResponse.json().data.publicInputs.milestoneRoot).toMatch(
      /^0x[0-9a-f]{64}$/
    );
    expect(proofInputResponse.json().data.privateInputs.activeUsers).toBe(735);
    expect(JSON.stringify(auditResponse.json())).not.toContain("privateInputs");
    expect(JSON.stringify(auditResponse.json())).not.toContain("735");

    await app.close();
  });
});
