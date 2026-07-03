import { describe, expect, it } from "vitest";

import {
  formatEligibilityPublicInputs,
  formatMilestonePublicInputs,
  formatPaymentRevenuePublicInputs
} from "../src/public-inputs";
import { validEligibilityFixture, validMilestoneFixture } from "../src/fixtures";

describe("public input formatting", () => {
  it("orders eligibility public inputs for contract verification", () => {
    expect(formatEligibilityPublicInputs(validEligibilityFixture.publicInput))
      .toMatchInlineSnapshot(`
        [
          "0x0000000000000000000000000000000000000000000000000000000000000123",
          "0x0000000000000000000000000000000000000000000000000000000000000999",
          "0x0000000000000000000000000000000000000000000000000000000000000092",
          "stellar-testnet",
          "milestone-escrow",
          "pact-demo-market",
          "pact-demo-asset",
          "ProjectEligibility",
          "GPROJECT",
          "1000",
        ]
      `);
  });

  it("orders milestone public inputs for contract verification", () => {
    expect(formatMilestonePublicInputs(validMilestoneFixture.publicInput))
      .toMatchInlineSnapshot(`
        [
          "0x0000000000000000000000000000000000000000000000000000000000000123",
          "0x0000000000000000000000000000000000000000000000000000000000000999",
          "0x0000000000000000000000000000000000000000000000000000000000000380",
          "program-1",
          "M1",
          "GPROJECT",
          "50000000",
          "1000",
        ]
      `);
  });

  it("orders payment revenue public inputs as field-safe values", () => {
    const formatted = formatPaymentRevenuePublicInputs({
      policyHash: "0xabc1",
      snapshotCommitment: "0xabc2",
      sourceRefsCommitment: "0xabc3",
      connectedAccountHash: "0xabc4",
      programId: "11111111-1111-4111-8111-111111111111",
      milestoneId: "M1",
      thresholdCents: "1000000",
      currencyCode: "usd",
      periodStartEpoch: 1780000000,
      periodEndEpoch: 1782600000,
      currentEpoch: 1781000000,
      nullifier: "0xabc5"
    });

    expect(formatted).toHaveLength(12);
    expect(formatted[6]).toBe("1000000");
    expect(formatted.slice(0, 6).every((value) => /^[0-9]+$/.test(value))).toBe(true);
  });
});
