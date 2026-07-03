import { createHmac } from "node:crypto";

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

const signStripePayload = (payload: string, secret: string): string => {
  const timestamp = "1780000000";
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
};

describe("Stripe webhook route", () => {
  it("verifies raw-body signatures and handles duplicate event ids", async () => {
    const previousSecret = process.env["STRIPE_WEBHOOK_SECRET"];
    process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test_secret";
    const app = await buildApiServer(testConfig);
    const payload = JSON.stringify({
      id: "evt_test_stripe_webhook",
      type: "account.application.deauthorized",
      livemode: false
    });
    const stripeSignature = signStripePayload(payload, "whsec_test_secret");

    const first = await app.inject({
      method: "POST",
      url: "/api/webhooks/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": stripeSignature
      },
      payload
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/webhooks/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": stripeSignature
      },
      payload
    });

    await app.close();
    if (previousSecret === undefined) {
      delete process.env["STRIPE_WEBHOOK_SECRET"];
    } else {
      process.env["STRIPE_WEBHOOK_SECRET"] = previousSecret;
    }

    expect(first.statusCode).toBe(200);
    expect(first.json().data.alreadyProcessed).toBe(false);
    expect(second.statusCode).toBe(200);
    expect(second.json().data.alreadyProcessed).toBe(true);
    expect(first.json().data.payloadHash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
