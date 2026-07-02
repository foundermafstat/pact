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
  it("registers all MVP route groups", async () => {
    const app = await buildApiServer(testConfig);

    const endpoints = [
      ["POST", "/api/attestor/milestone-evidence/mock"],
      ["POST", "/api/attestor/milestone-root/build"],
      ["POST", "/api/attestor/milestone-root/publish"],
      ["GET", "/api/attestor/programs/program-1/milestones/M1"],
      ["POST", "/api/proofs/eligibility/generate"],
      ["POST", "/api/proofs/milestone/generate"],
      ["POST", "/api/proofs/milestone/submit"],
      ["GET", "/api/proofs/proof-1"]
    ] as const;

    for (const [method, url] of endpoints) {
      const response = await app.inject({ method, url });
      expect(response.statusCode, `${method} ${url}`).toBe(501);
    }

    await app.close();
  });

  it("returns typed not_implemented for registered placeholder routes", async () => {
    const app = await buildApiServer(testConfig);
    const response = await app.inject({
      method: "POST",
      url: "/api/attestor/milestone-evidence/mock"
    });

    await app.close();

    expect(response.statusCode).toBe(501);
    expect(response.json()).toMatchObject({
      error: {
        code: "not_implemented"
      }
    });
  });
});
