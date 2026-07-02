import { describe, expect, it } from "vitest";

import { canonicalizePolicy, hashPolicy } from "../src/policy-hash";
import { MVP_MILESTONE_M1_POLICY } from "../src/policy";

describe("policy hashing", () => {
  it("canonicalizes policy JSON independent of object key order", () => {
    const reorderedPolicy = {
      rules: {
        auditPassedRequired: true,
        pilotPartnersMin: 3,
        activeUsersMin: 500
      },
      milestoneId: "M1",
      version: 1,
      policyType: "Milestone",
      policyKey: "milestone.m1.private_metrics"
    } as const;

    expect(canonicalizePolicy(reorderedPolicy)).toBe(
      canonicalizePolicy(MVP_MILESTONE_M1_POLICY)
    );
    expect(hashPolicy(reorderedPolicy)).toBe(hashPolicy(MVP_MILESTONE_M1_POLICY));
  });

  it("returns a 32-byte hex hash with 0x prefix", () => {
    expect(hashPolicy(MVP_MILESTONE_M1_POLICY)).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
