import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  CreateMilestoneEvidenceRequestSchema,
  CreateMockCredentialRequestSchema,
  CreateProgramRequestSchema
} from "@pact/shared";
import {
  validEligibilityFixture,
  validMilestoneFixture
} from "@pact/zk";

const outputPath = join(process.cwd(), "scripts", "seed", "demo-state.generated.json");

const demoProgram = CreateProgramRequestSchema.parse({
  programKey: "PACT-DEMO-001",
  sponsorWallet: "GSPONSOR",
  projectWallet: "GPROJECT",
  assetContract: "USDC",
  totalAmount: "100000000",
  eligibilityPolicyId: "22222222-2222-4222-8222-222222222222",
  tranches: [
    {
      milestoneKey: "M1",
      milestonePolicyId: "33333333-3333-4333-8333-333333333333",
      amount: "50000000",
      releaseToWallet: "GPROJECT"
    }
  ]
});

const demoCredential = CreateMockCredentialRequestSchema.parse({
  wallet: "GPROJECT",
  isAccredited: true,
  isNonUs: false,
  jurisdictionCode: "US",
  sanctionsPassed: true,
  expiresAt: 1785600000
});

const demoMilestoneEvidence = CreateMilestoneEvidenceRequestSchema.parse({
  programId: "11111111-1111-4111-8111-111111111111",
  milestoneKey: "M1",
  metrics: {
    activeUsers: 735,
    pilotPartners: 4,
    auditPassed: true
  },
  sourceRefs: ["seed:github-release", "seed:audit-report"]
});

const state = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  sponsor: "GSPONSOR",
  project: "GPROJECT",
  policies: {
    eligibilityPolicyId: "22222222-2222-4222-8222-222222222222",
    milestonePolicyId: "33333333-3333-4333-8333-333333333333"
  },
  program: demoProgram,
  credential: demoCredential,
  milestoneEvidence: demoMilestoneEvidence,
  roots: {
    credentialRoot: validEligibilityFixture.publicInput.credentialRoot,
    milestoneRoot: validMilestoneFixture.publicInput.milestoneRoot
  },
  proofFixtures: {
    eligibility: validEligibilityFixture.publicInput,
    milestone: validMilestoneFixture.publicInput
  }
};

const main = async (): Promise<void> => {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(state, null, 2)}\n`);

  console.log(`Seeded deterministic demo state: ${outputPath}`);
};

void main();
