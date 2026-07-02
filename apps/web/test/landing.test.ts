import { describe, expect, it } from "vitest";

import { landingFlowSteps } from "../src/features/landing/landing-content";

describe("landing content", () => {
  it("covers funding, private proof, and public audit flow", () => {
    expect(landingFlowSteps.map((step) => step.label)).toEqual([
      "Sponsor",
      "Issuer",
      "Attestor",
      "Audit"
    ]);
    expect(JSON.stringify(landingFlowSteps)).toContain("private");
    expect(JSON.stringify(landingFlowSteps)).toContain("public");
  });
});
