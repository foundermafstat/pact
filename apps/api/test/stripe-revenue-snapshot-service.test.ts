import { describe, expect, it } from "vitest";

import { normalizeStripeRevenue } from "../src/services/stripe-revenue-snapshot-service";

describe("Stripe revenue snapshot normalization", () => {
  it("calculates net revenue from paid charges, refunds, and fees", () => {
    const snapshot = normalizeStripeRevenue(
      {
        charges: [
          {
            id: "ch_paid_1",
            amount_captured: 12000,
            balance_transaction: "txn_charge_1",
            captured: true,
            created: 1780000000,
            currency: "usd",
            disputed: false,
            paid: true,
            status: "succeeded"
          },
          {
            id: "ch_failed_1",
            amount_captured: 5000,
            balance_transaction: "txn_failed_1",
            captured: false,
            created: 1780000000,
            currency: "usd",
            disputed: false,
            paid: false,
            status: "failed"
          }
        ],
        refunds: [
          {
            id: "re_1",
            amount: 1000,
            charge: "ch_paid_1",
            created: 1780001000,
            currency: "usd",
            status: "succeeded"
          }
        ],
        balanceTransactions: [
          {
            id: "txn_charge_1",
            created: 1780000000,
            currency: "usd",
            fee: 500,
            net: 11500,
            source: "ch_paid_1"
          }
        ]
      },
      "usd"
    );

    expect(snapshot.grossPaidCents).toBe("12000");
    expect(snapshot.refundCents).toBe("1000");
    expect(snapshot.feeCents).toBe("500");
    expect(snapshot.netRevenueCents).toBe("10500");
    expect(snapshot.successfulChargeCount).toBe(1);
  });

  it("rejects mixed currencies", () => {
    expect(() =>
      normalizeStripeRevenue(
        {
          charges: [
            {
              id: "ch_paid_1",
              amount_captured: 12000,
              balance_transaction: "txn_charge_1",
              captured: true,
              created: 1780000000,
              currency: "eur",
              disputed: false,
              paid: true,
              status: "succeeded"
            }
          ],
          refunds: [],
          balanceTransactions: []
        },
        "usd"
      )
    ).toThrow("mixed currencies");
  });
});
