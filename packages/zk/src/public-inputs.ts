import type {
  EligibilityPublicInput,
  MilestonePublicInput,
  PaymentRevenuePublicInput
} from "@pact/shared";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export const hexToFieldString = (hexValue: string): string => {
  const normalized = hexValue.startsWith("0x") ? hexValue.slice(2) : hexValue;
  return (BigInt(`0x${normalized}`) % BN254_SCALAR_FIELD).toString();
};

export const stringToFieldString = (value: string): string =>
  hexToFieldString(`0x${bytesToHex(sha256(new TextEncoder().encode(value)))}`);

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

export const formatPaymentRevenuePublicInputs = (
  input: PaymentRevenuePublicInput
): string[] => [
  hexToFieldString(input.policyHash),
  hexToFieldString(input.snapshotCommitment),
  hexToFieldString(input.sourceRefsCommitment),
  hexToFieldString(input.connectedAccountHash),
  stringToFieldString(input.programId),
  stringToFieldString(input.milestoneId),
  input.thresholdCents,
  stringToFieldString(input.currencyCode),
  input.periodStartEpoch.toString(),
  input.periodEndEpoch.toString(),
  input.currentEpoch.toString(),
  hexToFieldString(input.nullifier)
];
