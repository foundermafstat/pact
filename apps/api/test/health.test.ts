import { describe, expect, it } from "vitest";

import { buildApiServer } from "../src/server";

describe("GET /health", () => {
  it("returns service health", async () => {
    const app = await buildApiServer({
      nodeEnv: "test",
      appEnv: "test",
      host: "127.0.0.1",
      port: 0,
      corsOrigin: "http://localhost:3000",
      redisUrl: "redis://localhost:6379",
      bullmqPrefix: "pact-test"
    });

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      service: "pact-api",
      environment: "test"
    });
  });
});
