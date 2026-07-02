import { describe, expect, it } from "vitest";

import { checkQueueConnection } from "../src/queues/proof-queue";

describe("proof queue health", () => {
  it("marks a PONG response as healthy", async () => {
    await expect(
      checkQueueConnection({
        client: Promise.resolve({
          ping: async () => "PONG"
        })
      })
    ).resolves.toEqual({
      ok: true,
      ping: "PONG"
    });
  });
});
