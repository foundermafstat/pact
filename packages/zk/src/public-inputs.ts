import type {
  EligibilityPublicInput,
  MilestonePublicInput
} from "@pact/shared";

export const formatEligibilityPublicInputs = (
  input: EligibilityPublicInput
): string[] => [
  input.policyHash,
  input.credentialRoot,
  input.nullifier,
  input.chainId,
  input.contractId,
  input.marketId,
  input.assetId,
  input.actionType,
  input.accountBinding,
  input.currentEpoch.toString()
];

export const formatMilestonePublicInputs = (
  input: MilestonePublicInput
): string[] => [
  input.policyHash,
  input.milestoneRoot,
  input.nullifier,
  input.programId,
  input.milestoneId,
  input.recipient,
  input.trancheAmount,
  input.currentEpoch.toString()
];
