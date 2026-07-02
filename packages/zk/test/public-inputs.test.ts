import { describe, expect, it } from "vitest";

import {
  formatEligibilityPublicInputs,
  formatMilestonePublicInputs
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
});
