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

const policyId = "11111111-1111-4111-8111-111111111111";

describe("Issuer root APIs", () => {
  it("builds a pending credential root from active mock credentials", async () => {
    const app = await buildApiServer(testConfig);

    await app.inject({
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

    const response = await app.inject({
      method: "POST",
      url: "/api/issuer/roots/build",
      payload: {
        policyId,
        rootType: "Credential"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      policyId,
      rootType: "Credential",
      status: "Pending"
    });
    expect(response.json().data.root).toMatch(/^0x[0-9a-f]{64}$/);

    await app.close();
  });

  it("publishes a built credential root", async () => {
    const app = await buildApiServer(testConfig);

    await app.inject({
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

    const buildResponse = await app.inject({
      method: "POST",
      url: "/api/issuer/roots/build",
      payload: {
        policyId,
        rootType: "Credential"
      }
    });

    const publishResponse = await app.inject({
      method: "POST",
      url: "/api/issuer/roots/publish",
      payload: {
        rootId: buildResponse.json().data.id
      }
    });

    expect(publishResponse.statusCode).toBe(200);
    expect(publishResponse.json().data.status).toBe("Active");
    expect(publishResponse.json().data.txHash).toMatch(/^0x[0-9a-f]{64}$/);

    await app.close();
  });
});
