import { beforeEach, describe, expect, it } from "vitest";
import { buildMerkleTree } from "@pact/zk";

import { buildApiServer } from "../src/server";
import {
  attestorService,
  buildMilestoneCommitment
} from "../src/services/attestor-service";

const testConfig = {
  nodeEnv: "test",
  appEnv: "test",
  host: "127.0.0.1",
  port: 0,
  corsOrigin: "http://localhost:3000",
  redisUrl: "redis://localhost:6379",
  bullmqPrefix: "pact-test"
};

describe("Attestor APIs", () => {
  beforeEach(() => {
    attestorService.reset();
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

    const response = await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-evidence/mock",
      payload: {
        programId: "11111111-1111-4111-8111-111111111111",
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

    const response = await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-evidence/mock",
      payload: {
        programId: "11111111-1111-4111-8111-111111111111",
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

    await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-evidence/mock",
      payload: {
        programId: "11111111-1111-4111-8111-111111111111",
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
});
