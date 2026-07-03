import { z } from "zod";

import {
  POLICY_STATUSES,
  POLICY_TYPES,
  PROGRAM_STATUSES,
  PROOF_TYPES,
  ROLES,
  ROOT_STATUSES,
  ROOT_TYPES,
  TRANCHE_STATUSES
} from "./constants";
import { HexStringSchema, NonEmptyStringSchema } from "./circuit-io";
import { PolicySchema } from "./policy";

export const UuidSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();
export const AmountSchema = z.string().regex(/^[0-9]+$/);
export const StellarAddressSchema = z.string().min(4);
export const TransactionHashSchema = z.string().min(1);
export const RoleSchema = z.enum(ROLES);

export const ProgramDtoSchema = z.object({
  id: UuidSchema,
  programKey: NonEmptyStringSchema,
  sponsorWallet: StellarAddressSchema,
  projectWallet: StellarAddressSchema,
  assetContract: NonEmptyStringSchema,
  totalAmount: AmountSchema,
  fundedAmount: AmountSchema,
  status: z.enum(PROGRAM_STATUSES),
  eligibilityPolicyId: NonEmptyStringSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const TrancheDtoSchema = z.object({
  id: UuidSchema,
  programId: UuidSchema,
  milestoneKey: NonEmptyStringSchema,
  milestonePolicyId: NonEmptyStringSchema,
  amount: AmountSchema,
  releaseToWallet: StellarAddressSchema,
  status: z.enum(TRANCHE_STATUSES),
  releasedAt: TimestampSchema.nullable(),
  txHash: TransactionHashSchema.nullable()
});

export const PolicyDtoSchema = z.object({
  id: UuidSchema,
  policyKey: NonEmptyStringSchema,
  policyHash: HexStringSchema,
  policyType: z.enum(POLICY_TYPES),
  status: z.enum(POLICY_STATUSES),
  rawPolicyJson: PolicySchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const RootDtoSchema = z.object({
  id: UuidSchema,
  policyId: UuidSchema,
  root: HexStringSchema,
  rootType: z.enum(ROOT_TYPES),
  epoch: z.number().int().nonnegative(),
  status: z.enum(ROOT_STATUSES),
  txHash: TransactionHashSchema.nullable(),
  validFrom: TimestampSchema,
  validUntil: TimestampSchema,
  createdAt: TimestampSchema
});

export const CredentialDtoSchema = z.object({
  id: UuidSchema,
  credentialKey: NonEmptyStringSchema,
  wallet: StellarAddressSchema,
  subjectCommitment: HexStringSchema,
  issuerId: NonEmptyStringSchema,
  credentialLeaf: HexStringSchema,
  status: z.enum(["Active", "Revoked", "Expired"]),
  expiresAt: TimestampSchema,
  createdAt: TimestampSchema
});

export const MilestoneAttestationDtoSchema = z.object({
  id: UuidSchema,
  programId: UuidSchema,
  milestoneKey: NonEmptyStringSchema,
  milestoneRoot: HexStringSchema.nullable(),
  privateMetricsEncrypted: z.string().min(1),
  publicPolicyHash: HexStringSchema,
  attestorId: NonEmptyStringSchema,
  status: z.enum(["Pending", "Validated", "Rejected", "Published"]),
  txHash: TransactionHashSchema.nullable(),
  createdAt: TimestampSchema
});

export const ProofJobDtoSchema = z.object({
  id: UuidSchema,
  proofType: z.enum(PROOF_TYPES),
  status: z.enum(["Queued", "Running", "Succeeded", "Failed"]),
  requestJson: z.record(z.string(), z.unknown()),
  publicInputsJson: z.record(z.string(), z.unknown()).nullable(),
  proofJson: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  createdAt: TimestampSchema,
  completedAt: TimestampSchema.nullable()
});

export const ContractEventDtoSchema = z.object({
  id: UuidSchema,
  contractId: NonEmptyStringSchema,
  eventType: NonEmptyStringSchema,
  txHash: TransactionHashSchema,
  ledger: z.number().int().nonnegative(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: TimestampSchema
});

export const CreateProgramRequestSchema = z.object({
  programKey: NonEmptyStringSchema,
  sponsorWallet: StellarAddressSchema,
  projectWallet: StellarAddressSchema,
  assetContract: NonEmptyStringSchema,
  totalAmount: AmountSchema,
  eligibilityPolicyId: NonEmptyStringSchema,
  tranches: z
    .array(
      z.object({
        milestoneKey: NonEmptyStringSchema,
        milestonePolicyId: NonEmptyStringSchema,
        amount: AmountSchema,
        releaseToWallet: StellarAddressSchema
      })
    )
    .min(1)
});

export const FundProgramRequestSchema = z.object({
  amount: AmountSchema
});

export const CreatePolicyRequestSchema = z.object({
  policy: PolicySchema
});

export const CreateMockCredentialRequestSchema = z.object({
  wallet: StellarAddressSchema,
  isAccredited: z.boolean(),
  isNonUs: z.boolean(),
  jurisdictionCode: NonEmptyStringSchema,
  sanctionsPassed: z.boolean(),
  expiresAt: z.number().int().positive()
});

export const RootBuildRequestSchema = z.object({
  policyId: UuidSchema,
  rootType: z.enum(ROOT_TYPES)
});

export const RootPublishRequestSchema = z.object({
  rootId: UuidSchema
});

export const CreateMilestoneEvidenceRequestSchema = z.object({
  programId: UuidSchema,
  milestoneKey: NonEmptyStringSchema,
  metrics: z.object({
    activeUsers: z.number().int().nonnegative(),
    pilotPartners: z.number().int().nonnegative(),
    auditPassed: z.boolean()
  }),
  sourceRefs: z.array(NonEmptyStringSchema).min(1)
});

export const GenerateProofRequestSchema = z.object({
  proofType: z.enum(PROOF_TYPES),
  programId: UuidSchema.optional(),
  credentialId: UuidSchema.optional(),
  milestoneKey: NonEmptyStringSchema.optional()
});

export const SubmitMilestoneProofRequestSchema = z.object({
  proofJobId: UuidSchema,
  programId: UuidSchema,
  milestoneKey: NonEmptyStringSchema
});

export const AuthChallengeRequestSchema = z.object({
  wallet: StellarAddressSchema,
  walletProvider: NonEmptyStringSchema.optional()
});

export const AuthChallengeDtoSchema = z.object({
  challengeId: UuidSchema,
  wallet: StellarAddressSchema,
  message: NonEmptyStringSchema,
  expiresAt: TimestampSchema
});

export const AuthVerifyRequestSchema = z.object({
  challengeId: UuidSchema,
  wallet: StellarAddressSchema,
  signature: NonEmptyStringSchema,
  walletProvider: NonEmptyStringSchema.optional()
});

export const AuthUserDtoSchema = z.object({
  wallet: StellarAddressSchema,
  roles: z.array(RoleSchema),
  primaryRole: RoleSchema
});

export const AuthSessionDtoSchema = z.object({
  user: AuthUserDtoSchema,
  expiresAt: TimestampSchema
});

export const WalletRoleDtoSchema = z.object({
  wallet: StellarAddressSchema,
  roles: z.array(RoleSchema)
});

export const AssignWalletRoleRequestSchema = z.object({
  wallet: StellarAddressSchema,
  role: RoleSchema
});

export const SelectAccountRoleRequestSchema = z.object({
  role: z.enum(["Investor", "Project"])
});

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: NonEmptyStringSchema,
    message: NonEmptyStringSchema,
    details: z.unknown().optional()
  })
});

export const ApiSuccessResponseSchema = <T extends z.ZodType>(schema: T) =>
  z.object({
    data: schema
  });

export type ProgramDto = z.infer<typeof ProgramDtoSchema>;
export type TrancheDto = z.infer<typeof TrancheDtoSchema>;
export type PolicyDto = z.infer<typeof PolicyDtoSchema>;
export type RootDto = z.infer<typeof RootDtoSchema>;
export type CredentialDto = z.infer<typeof CredentialDtoSchema>;
export type MilestoneAttestationDto = z.infer<
  typeof MilestoneAttestationDtoSchema
>;
export type ProofJobDto = z.infer<typeof ProofJobDtoSchema>;
export type ContractEventDto = z.infer<typeof ContractEventDtoSchema>;
export type CreateProgramRequest = z.infer<typeof CreateProgramRequestSchema>;
export type FundProgramRequest = z.infer<typeof FundProgramRequestSchema>;
export type CreatePolicyRequest = z.infer<typeof CreatePolicyRequestSchema>;
export type CreateMockCredentialRequest = z.infer<
  typeof CreateMockCredentialRequestSchema
>;
export type CreateMilestoneEvidenceRequest = z.infer<
  typeof CreateMilestoneEvidenceRequestSchema
>;
export type GenerateProofRequest = z.infer<typeof GenerateProofRequestSchema>;
export type SubmitMilestoneProofRequest = z.infer<
  typeof SubmitMilestoneProofRequestSchema
>;
export type AuthChallengeRequest = z.infer<typeof AuthChallengeRequestSchema>;
export type AuthChallengeDto = z.infer<typeof AuthChallengeDtoSchema>;
export type AuthVerifyRequest = z.infer<typeof AuthVerifyRequestSchema>;
export type AuthUserDto = z.infer<typeof AuthUserDtoSchema>;
export type AuthSessionDto = z.infer<typeof AuthSessionDtoSchema>;
export type WalletRoleDto = z.infer<typeof WalletRoleDtoSchema>;
export type AssignWalletRoleRequest = z.infer<
  typeof AssignWalletRoleRequestSchema
>;
export type SelectAccountRoleRequest = z.infer<
  typeof SelectAccountRoleRequestSchema
>;
