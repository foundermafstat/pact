import type { CreateProgramRequest } from "@pact/shared";

export type CreateProgramFormState = {
  programKey: string;
  sponsorWallet: string;
  projectWallet: string;
  assetContract: string;
  totalAmount: string;
  eligibilityPolicyId: string;
  milestoneKey: string;
  milestonePolicyId: string;
  trancheAmount: string;
  releaseToWallet: string;
};

export const defaultCreateProgramForm: CreateProgramFormState = {
  programKey: "PACT-DEMO-001",
  sponsorWallet: "GSPONSOR",
  projectWallet: "GPROJECT",
  assetContract: "USDC",
  totalAmount: "100000000",
  eligibilityPolicyId: "eligibility-policy-1",
  milestoneKey: "M1",
  milestonePolicyId: "milestone-policy-1",
  trancheAmount: "50000000",
  releaseToWallet: "GPROJECT"
};

export const buildCreateProgramPayload = (
  form: CreateProgramFormState
): CreateProgramRequest => ({
  programKey: form.programKey,
  sponsorWallet: form.sponsorWallet,
  projectWallet: form.projectWallet,
  assetContract: form.assetContract,
  totalAmount: form.totalAmount,
  eligibilityPolicyId: form.eligibilityPolicyId,
  tranches: [
    {
      milestoneKey: form.milestoneKey,
      milestonePolicyId: form.milestonePolicyId,
      amount: form.trancheAmount,
      releaseToWallet: form.releaseToWallet
    }
  ]
});
