import { z } from "zod";

export const PolicyKeySchema = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z0-9_.:-]+$/);

export const EligibilityPolicySchema = z.object({
  policyKey: PolicyKeySchema,
  policyType: z.literal("Eligibility"),
  version: z.number().int().positive(),
  rules: z.object({
    sanctionsPassedRequired: z.literal(true),
    expiresAfterCurrentEpoch: z.literal(true),
    accreditedOrNonUsRequired: z.literal(true)
  })
});

export const MilestonePolicySchema = z.object({
  policyKey: PolicyKeySchema,
  policyType: z.literal("Milestone"),
  version: z.number().int().positive(),
  milestoneId: PolicyKeySchema,
  rules: z.object({
    activeUsersMin: z.number().int().nonnegative(),
    pilotPartnersMin: z.number().int().nonnegative(),
    auditPassedRequired: z.literal(true)
  })
});

export const PolicySchema = z.discriminatedUnion("policyType", [
  EligibilityPolicySchema,
  MilestonePolicySchema
]);

export type EligibilityPolicy = z.infer<typeof EligibilityPolicySchema>;
export type MilestonePolicy = z.infer<typeof MilestonePolicySchema>;
export type Policy = z.infer<typeof PolicySchema>;

export const MVP_ELIGIBILITY_POLICY: EligibilityPolicy = {
  policyKey: "eligibility.accredited_or_non_us",
  policyType: "Eligibility",
  version: 1,
  rules: {
    sanctionsPassedRequired: true,
    expiresAfterCurrentEpoch: true,
    accreditedOrNonUsRequired: true
  }
};

export const MVP_MILESTONE_M1_POLICY: MilestonePolicy = {
  policyKey: "milestone.m1.private_metrics",
  policyType: "Milestone",
  version: 1,
  milestoneId: "M1",
  rules: {
    activeUsersMin: 500,
    pilotPartnersMin: 3,
    auditPassedRequired: true
  }
};
