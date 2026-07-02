import { z } from "zod";

import { ACTION_TYPES } from "./constants";

export const HexStringSchema = z.string().regex(/^0x[0-9a-fA-F]+$/);
export const NonEmptyStringSchema = z.string().min(1);
export const EpochSchema = z.number().int().nonnegative();

export const MerklePathSchema = z.object({
  elements: z.array(HexStringSchema),
  indices: z.array(z.number().int().min(0).max(1))
});

export const EligibilityPrivateInputSchema = z.object({
  credentialSecret: HexStringSchema,
  credentialSalt: HexStringSchema,
  subjectId: NonEmptyStringSchema,
  jurisdictionCode: NonEmptyStringSchema,
  isAccredited: z.boolean(),
  isNonUs: z.boolean(),
  sanctionsPassed: z.boolean(),
  expiresAt: EpochSchema,
  issuerId: NonEmptyStringSchema,
  merklePath: MerklePathSchema
});

export const EligibilityPublicInputSchema = z.object({
  policyHash: HexStringSchema,
  credentialRoot: HexStringSchema,
  nullifier: HexStringSchema,
  chainId: NonEmptyStringSchema,
  contractId: NonEmptyStringSchema,
  marketId: NonEmptyStringSchema,
  assetId: NonEmptyStringSchema,
  actionType: z.enum(ACTION_TYPES),
  accountBinding: NonEmptyStringSchema,
  currentEpoch: EpochSchema
});

export const MilestonePrivateInputSchema = z.object({
  projectSecret: HexStringSchema,
  attestationSecret: HexStringSchema,
  activeUsers: z.number().int().nonnegative(),
  pilotPartners: z.number().int().nonnegative(),
  auditPassed: z.boolean(),
  metricSalts: z.array(HexStringSchema).min(1),
  attestationMerklePath: MerklePathSchema
});

export const MilestonePublicInputSchema = z.object({
  policyHash: HexStringSchema,
  milestoneRoot: HexStringSchema,
  nullifier: HexStringSchema,
  programId: NonEmptyStringSchema,
  milestoneId: NonEmptyStringSchema,
  recipient: NonEmptyStringSchema,
  trancheAmount: z.string().regex(/^[0-9]+$/),
  currentEpoch: EpochSchema
});

export type EligibilityPrivateInput = z.infer<
  typeof EligibilityPrivateInputSchema
>;
export type EligibilityPublicInput = z.infer<typeof EligibilityPublicInputSchema>;
export type MilestonePrivateInput = z.infer<typeof MilestonePrivateInputSchema>;
export type MilestonePublicInput = z.infer<typeof MilestonePublicInputSchema>;
