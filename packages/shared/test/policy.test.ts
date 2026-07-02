import { describe, expect, it } from "vitest";

import {
  EligibilityPolicySchema,
  MVP_ELIGIBILITY_POLICY,
  MVP_MILESTONE_M1_POLICY,
  MilestonePolicySchema,
  PolicySchema
} from "../src/policy";

describe("policy schemas", () => {
  it("accepts the MVP eligibility policy", () => {
    expect(EligibilityPolicySchema.parse(MVP_ELIGIBILITY_POLICY)).toEqual(
      MVP_ELIGIBILITY_POLICY
    );
  });

  it("accepts the MVP milestone policy", () => {
    expect(MilestonePolicySchema.parse(MVP_MILESTONE_M1_POLICY)).toEqual(
      MVP_MILESTONE_M1_POLICY
    );
  });

  it("rejects eligibility policies without mandatory sanctions rule", () => {
    const result = EligibilityPolicySchema.safeParse({
      ...MVP_ELIGIBILITY_POLICY,
      rules: {
        ...MVP_ELIGIBILITY_POLICY.rules,
        sanctionsPassedRequired: false
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects milestone policies without mandatory audit rule", () => {
    const result = MilestonePolicySchema.safeParse({
      ...MVP_MILESTONE_M1_POLICY,
      rules: {
        ...MVP_MILESTONE_M1_POLICY.rules,
        auditPassedRequired: false
      }
    });

    expect(result.success).toBe(false);
  });

  it("parses both MVP policy types through the union", () => {
    expect(PolicySchema.parse(MVP_ELIGIBILITY_POLICY).policyType).toBe("Eligibility");
    expect(PolicySchema.parse(MVP_MILESTONE_M1_POLICY).policyType).toBe("Milestone");
  });
});
