import { describe, expect, it } from "vitest";

import type { ProverConfig } from "../src/config";
import { processProofJob } from "../src/proof-processor";
import { buildProverServer } from "../src/server";

const testConfig: ProverConfig = {
  nodeEnv: "test",
  host: "127.0.0.1",
  port: 0,
  redisUrl: "redis://localhost:6379",
  bullmqPrefix: "pact-test",
  proverMode: "mock",
  workerEnabled: false
};

describe("Prover service", () => {
  it("returns health in mock mode", async () => {
    const app = await buildProverServer(testConfig);
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: "pact-prover",
      mode: "mock",
      queue: {
        ok: true
      }
    });

    await app.close();
  });

  it("processes a proof job in mock mode", async () => {
    const result = await processProofJob(
      {
        proofJobId: "11111111-1111-4111-8111-111111111111",
        proofType: "Eligibility",
        requestJson: {
          credentialId: "22222222-2222-4222-8222-222222222222"
        },
        publicInputsJson: {
          nullifier: "0x01"
        },
        privateInputsJson: {
          credentialSecret: "hidden"
        }
      },
      testConfig
    );

    expect(result.proofJson.mode).toBe("mock");
    expect(result.publicInputsJson).toEqual({
      nullifier: "0x01"
    });
    expect(JSON.stringify(result.proofJson)).not.toContain("hidden");
  });
});
