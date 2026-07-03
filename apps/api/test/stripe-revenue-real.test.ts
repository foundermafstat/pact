import { describe, expect, it } from "vitest";

import { loadStripeIntegrationConfig } from "../src/config";
import { stripeConnectorService } from "../src/services/stripe-connector-service";
import { normalizeStripeRevenue } from "../src/services/stripe-revenue-snapshot-service";

const connectedAccountId = process.env["STRIPE_REAL_CONNECTED_ACCOUNT_ID"];
const shouldRun = Boolean(process.env["STRIPE_SECRET_KEY"] && connectedAccountId);

describe.skipIf(!shouldRun)("Stripe real test-mode revenue fetch", () => {
  it("fetches real connected-account test data without mocked Stripe responses", async () => {
    const config = loadStripeIntegrationConfig();
    const sourceData = await stripeConnectorService.fetchRevenueSourceData(
      config,
      {
        id: "real-test-connection",
        programId: "11111111-1111-4111-8111-111111111111",
        stripeAccountId: connectedAccountId ?? "",
        stripeAccountHash: "0x01",
        accountSalt: "real-test",
        livemode: false,
        scope: "read_write",
        status: "connected",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deauthorizedAt: null
      },
      {
        periodStartEpoch: 0,
        periodEndEpoch: Math.floor(Date.now() / 1000) + 60,
        currency: "usd"
      }
    );

    const snapshot = normalizeStripeRevenue(sourceData, "usd");
    expect(snapshot.successfulChargeCount).toBeGreaterThan(0);
    expect(snapshot.chargeRefs.length).toBeGreaterThan(0);
  });
});
