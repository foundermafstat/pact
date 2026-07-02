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

const createProgramPayload = {
  programKey: "PACT_GRANT_001",
  sponsorWallet: "GSPONSOR",
  projectWallet: "GPROJECT",
  assetContract: "asset-contract",
  totalAmount: "1000",
  eligibilityPolicyId: "eligibility.accredited_or_non_us",
  tranches: [
    {
      milestoneKey: "M1",
      milestonePolicyId: "milestone.m1.private_metrics",
      amount: "1000",
      releaseToWallet: "GPROJECT"
    }
  ]
};

describe("Program APIs", () => {
  it("creates, funds, activates, and audits a program", async () => {
    const app = await buildApiServer(testConfig);

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/programs",
      payload: createProgramPayload
    });
    const created = createResponse.json();
    const programId = created.data.program.id;

    expect(createResponse.statusCode).toBe(200);
    expect(created.data.program.status).toBe("Draft");
    expect(created.data.tranches).toHaveLength(1);

    const fundResponse = await app.inject({
      method: "POST",
      url: `/api/programs/${programId}/fund`,
      payload: { amount: "1000" }
    });
    expect(fundResponse.json().data.program.fundedAmount).toBe("1000");

    const activateResponse = await app.inject({
      method: "POST",
      url: `/api/programs/${programId}/activate`
    });
    expect(activateResponse.json().data.program.status).toBe("Active");

    const auditResponse = await app.inject({
      method: "GET",
      url: `/api/programs/${programId}/audit`
    });
    expect(auditResponse.json().data.timeline.map((item: { type: string }) => item.type)).toEqual([
      "ProgramCreated",
      "EscrowFunded"
    ]);

    await app.close();
  });
});
