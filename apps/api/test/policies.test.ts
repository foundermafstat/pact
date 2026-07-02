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

const policyPayload = {
  policy: {
    policyKey: "eligibility.accredited_or_non_us",
    policyType: "Eligibility",
    version: 1,
    rules: {
      sanctionsPassedRequired: true,
      expiresAfterCurrentEpoch: true,
      accreditedOrNonUsRequired: true
    }
  }
};

describe("Policy APIs", () => {
  it("creates, activates, fetches, and pauses a policy", async () => {
    const app = await buildApiServer(testConfig);

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/policies",
      payload: policyPayload
    });

    const created = createResponse.json().data;
    expect(created.status).toBe("Draft");
    expect(created.policyHash).toMatch(/^0x[0-9a-f]{64}$/);

    const activateResponse = await app.inject({
      method: "POST",
      url: `/api/policies/${created.id}/activate`
    });
    expect(activateResponse.json().data.status).toBe("Active");

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/policies/${created.id}`
    });
    expect(getResponse.json().data.policyKey).toBe("eligibility.accredited_or_non_us");

    const pauseResponse = await app.inject({
      method: "POST",
      url: `/api/policies/${created.id}/pause`
    });
    expect(pauseResponse.json().data.status).toBe("Paused");

    await app.close();
  });
});
