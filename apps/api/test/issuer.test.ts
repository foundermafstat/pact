import { describe, expect, it } from "vitest";

import { buildApiServer } from "../src/server";
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

describe("Issuer APIs", () => {
  it("creates a mock credential with a private credential package", async () => {
    const app = await buildApiServer(testConfig);

    const response = await app.inject({
      method: "POST",
      url: "/api/issuer/credentials/mock",
      headers: await authHeaders("GISSUER", "Issuer"),
      payload: {
        wallet: "GPROJECT",
        isAccredited: true,
        isNonUs: false,
        jurisdictionCode: "US",
        sanctionsPassed: true,
        expiresAt: 1785600000
      }
    });

    const body = response.json().data;
    expect(response.statusCode).toBe(200);
    expect(body.credential.credentialLeaf).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.credential).not.toHaveProperty("credentialSecret");
    expect(body.privateCredentialPackage.credentialSecret).toMatch(/^0x[0-9a-f]{64}$/);

    await app.close();
  });
});
