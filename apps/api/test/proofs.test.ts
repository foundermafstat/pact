import { beforeEach, describe, expect, it } from "vitest";

import { buildApiServer } from "../src/server";
import { issuerService } from "../src/services/issuer-service";
import { proofJobService } from "../src/services/proof-job-service";

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
  beforeEach(() => {
    issuerService.reset();
    proofJobService.reset();
  });

  it("creates and completes a mock eligibility proof job", async () => {
    const app = await buildApiServer(testConfig);

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
    expect(body.proofJson.mode).toBe("mock");
    expect(JSON.stringify(body)).not.toContain("credentialSecret");

    await app.close();
  });

  it("rejects eligibility proof jobs for unknown credentials", async () => {
    const app = await buildApiServer(testConfig);

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
});
