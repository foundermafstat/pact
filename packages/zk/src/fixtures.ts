import type {
  EligibilityPrivateInput,
  EligibilityPublicInput,
  MilestonePrivateInput,
  MilestonePublicInput
} from "@pact/shared";

const hex = (value: string): `0x${string}` => `0x${value.padStart(64, "0")}`;

export type EligibilityFixture = {
  privateInput: EligibilityPrivateInput;
  publicInput: EligibilityPublicInput;
};

export type MilestoneFixture = {
  privateInput: MilestonePrivateInput;
  publicInput: MilestonePublicInput;
};

export const validEligibilityFixture: EligibilityFixture = {
  privateInput: {
    credentialSecret: hex("1"),
    credentialSalt: hex("2"),
    subjectId: "project-subject-1",
    jurisdictionCode: "US",
    isAccredited: true,
    isNonUs: false,
    sanctionsPassed: true,
    expiresAt: 2_000,
    issuerId: "PACT_KYB_MOCK_ISSUER",
    merklePath: {
      elements: [hex("999"), hex("123")],
      indices: [0, 0]
    }
  },
  publicInput: {
    policyHash: hex("123"),
    credentialRoot: hex("999"),
    nullifier: hex("92"),
    chainId: "stellar-testnet",
    contractId: "milestone-escrow",
    marketId: "pact-demo-market",
    assetId: "pact-demo-asset",
    actionType: "ProjectEligibility",
    accountBinding: "GPROJECT",
    currentEpoch: 1_000
  }
};

export const expiredEligibilityFixture: EligibilityFixture = {
  ...validEligibilityFixture,
  privateInput: {
    ...validEligibilityFixture.privateInput,
    expiresAt: 900
  }
};

export const sanctionsFalseEligibilityFixture: EligibilityFixture = {
  ...validEligibilityFixture,
  privateInput: {
    ...validEligibilityFixture.privateInput,
    sanctionsPassed: false
  }
};

export const validMilestoneFixture: MilestoneFixture = {
  privateInput: {
    projectSecret: hex("1"),
    attestationSecret: hex("2"),
    activeUsers: 735,
    pilotPartners: 4,
    auditPassed: true,
    metricSalts: [hex("2")],
    attestationMerklePath: {
      elements: [hex("999"), hex("123"), hex("12"), hex("50000000")],
      indices: [0, 0, 0, 0]
    }
  },
  publicInput: {
    policyHash: hex("123"),
    milestoneRoot: hex("999"),
    nullifier: hex("380"),
    programId: "program-1",
    milestoneId: "M1",
    recipient: "GPROJECT",
    trancheAmount: "50000000",
    currentEpoch: 1_000
  }
};

export const belowThresholdMilestoneFixture: MilestoneFixture = {
  ...validMilestoneFixture,
  privateInput: {
    ...validMilestoneFixture.privateInput,
    activeUsers: 499
  }
};

export const wrongRecipientMilestoneFixture: MilestoneFixture = {
  ...validMilestoneFixture,
  publicInput: {
    ...validMilestoneFixture.publicInput,
    recipient: "GWRONG"
  }
};
