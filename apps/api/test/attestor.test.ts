import { describe, expect, it } from "vitest";

import { buildApiServer } from "../src/server";

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
});
