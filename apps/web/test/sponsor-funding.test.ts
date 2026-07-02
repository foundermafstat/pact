import { describe, expect, it } from "vitest";

import { getFundingProgress } from "../src/features/sponsor/funding-model";

describe("sponsor funding model", () => {
  it("calculates bounded funding progress", () => {
    expect(getFundingProgress("50", "100")).toBe(50);
    expect(getFundingProgress("150", "100")).toBe(100);
    expect(getFundingProgress("0", "0")).toBe(0);
  });
});
