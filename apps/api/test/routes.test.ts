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

describe("API route registry", () => {
  it("registers all proof route groups", async () => {
    const app = await buildApiServer(testConfig);

    const checks = [
      ["POST", "/api/proofs/eligibility/generate", 400],
      ["POST", "/api/proofs/milestone/generate", 400],
      ["POST", "/api/proofs/milestone/submit", 400],
      ["GET", "/api/proofs/11111111-1111-4111-8111-111111111111", 404]
    ] as const;

    for (const [method, url, expectedStatus] of checks) {
      const response = await app.inject({ method, url });
      expect(response.statusCode, `${method} ${url}`).toBe(expectedStatus);
    }

    await app.close();
  });

  it("returns typed validation error for proof submit", async () => {
    const app = await buildApiServer(testConfig);
    const response = await app.inject({
      method: "POST",
      url: "/api/proofs/milestone/submit"
    });

    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "invalid_milestone_proof_submit_request"
      }
    });
  });
});
