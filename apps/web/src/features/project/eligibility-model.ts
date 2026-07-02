export type EligibilityStepStatus = "Idle" | "CredentialCreated" | "ProofReady" | "Submitted";

export const getEligibilityStatusLabel = (status: EligibilityStepStatus): string => {
  switch (status) {
    case "CredentialCreated":
      return "Credential created";
    case "ProofReady":
      return "Eligibility proof ready";
    case "Submitted":
      return "Eligibility submitted";
    case "Idle":
      return "Ready";
  }
};
