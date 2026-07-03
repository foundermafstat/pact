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

describe("Auth role selection", () => {
  it("does not self-assign a missing dashboard role by default", async () => {
    const app = await buildApiServer(testConfig);
    const wallet = `GROLE${Date.now()}`;

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/select-role",
      headers: await authHeaders(wallet, "Observer"),
      payload: {
        role: "Investor"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("role_assignment_required");

    await app.close();
  });
});
