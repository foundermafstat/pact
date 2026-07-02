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

export const PROOF_TYPES = ["Eligibility", "MilestoneUnlock"] as const;
export type ProofType = (typeof PROOF_TYPES)[number];

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
