import { describe, expect, it } from "vitest";

import {
  POLICY_STATUSES,
  POLICY_TYPES,
  PROGRAM_STATUSES,
  PROOF_TYPES,
  ROLES,
  ROOT_STATUSES,
  ROOT_TYPES,
  TRANCHE_STATUSES
} from "../src/constants";

describe("domain constants", () => {
  it("exports MVP policy, root, program, tranche, proof, and role constants", () => {
    expect(POLICY_TYPES).toEqual(["Eligibility", "Milestone", "AssetAction"]);
    expect(POLICY_STATUSES).toContain("Active");
    expect(ROOT_TYPES).toEqual(["Credential", "MilestoneMetrics", "Revocation"]);
    expect(ROOT_STATUSES).toContain("Inactive");
    expect(PROGRAM_STATUSES).toContain("Paused");
    expect(TRANCHE_STATUSES).toContain("Released");
    expect(PROOF_TYPES).toEqual(["Eligibility", "MilestoneUnlock"]);
    expect(ROLES).toEqual([
      "Sponsor",
      "Project",
      "Investor",
      "Issuer",
      "Attestor",
      "Observer",
      "Admin"
    ]);
  });
});
