export const POLICY_TYPES = ["Eligibility", "Milestone", "AssetAction"] as const;
export type PolicyType = (typeof POLICY_TYPES)[number];

export const POLICY_STATUSES = ["Draft", "Active", "Paused", "Deprecated"] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

export const ROOT_TYPES = ["Credential", "MilestoneMetrics", "Revocation"] as const;
export type RootType = (typeof ROOT_TYPES)[number];

export const ROOT_STATUSES = ["Pending", "Active", "Inactive", "Expired"] as const;
export type RootStatus = (typeof ROOT_STATUSES)[number];

export const PROGRAM_STATUSES = [
  "Draft",
  "Active",
  "Paused",
  "Cancelled",
  "Completed"
] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const TRANCHE_STATUSES = ["Locked", "Ready", "Released", "Cancelled"] as const;
export type TrancheStatus = (typeof TRANCHE_STATUSES)[number];

export const PROOF_TYPES = [
  "Eligibility",
  "MilestoneUnlock",
  "PaymentRevenueThreshold"
] as const;
export type ProofType = (typeof PROOF_TYPES)[number];

export const STARTUP_PROFILE_STATUSES = [
  "Draft",
  "Submitted",
  "Listed",
  "Archived"
] as const;
export type StartupProfileStatus = (typeof STARTUP_PROFILE_STATUSES)[number];

export const INVESTMENT_POOL_TYPES = ["Investment", "Grant"] as const;
export type InvestmentPoolType = (typeof INVESTMENT_POOL_TYPES)[number];

export const INVESTMENT_POOL_STATUSES = [
  "Draft",
  "Open",
  "Closed",
  "Archived"
] as const;
export type InvestmentPoolStatus = (typeof INVESTMENT_POOL_STATUSES)[number];

export const POOL_APPLICATION_STATUSES = [
  "Submitted",
  "Reviewed",
  "Accepted",
  "Rejected"
] as const;
export type PoolApplicationStatus = (typeof POOL_APPLICATION_STATUSES)[number];

export const INVESTMENT_COMMITMENT_STATUSES = [
  "Pending",
  "Accepted",
  "Declined"
] as const;
export type InvestmentCommitmentStatus = (typeof INVESTMENT_COMMITMENT_STATUSES)[number];

export const ROLES = [
  "Sponsor",
  "Project",
  "Investor",
  "Issuer",
  "Attestor",
  "Observer",
  "Admin"
] as const;
export type Role = (typeof ROLES)[number];

export const ACTION_TYPES = [
  "ProjectEligibility",
  "MilestoneUnlock",
  "AssetTransfer"
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];
