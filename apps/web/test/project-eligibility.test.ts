import { describe, expect, it } from "vitest";

import { getEligibilityStatusLabel } from "../src/features/project/eligibility-model";

describe("project eligibility model", () => {
  it("labels the eligibility flow states", () => {
    expect(getEligibilityStatusLabel("Idle")).toBe("Ready");
    expect(getEligibilityStatusLabel("CredentialCreated")).toBe("Credential created");
    expect(getEligibilityStatusLabel("ProofReady")).toBe("Eligibility proof ready");
    expect(getEligibilityStatusLabel("Submitted")).toBe("Eligibility submitted");
  });
});
