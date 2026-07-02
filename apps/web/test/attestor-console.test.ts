import { describe, expect, it } from "vitest";

import { validateMilestoneThresholds } from "../src/features/attestor/attestor-model";

describe("attestor console model", () => {
  it("validates MVP milestone thresholds", () => {
    expect(
      validateMilestoneThresholds({
        activeUsers: "735",
        pilotPartners: "4",
        auditPassed: true
      })
    ).toEqual([]);
    expect(
      validateMilestoneThresholds({
        activeUsers: "499",
        pilotPartners: "2",
        auditPassed: false
      })
    ).toEqual([
      "active_users below threshold",
      "pilot_partners below threshold",
      "audit_passed must be true"
    ]);
  });
});
