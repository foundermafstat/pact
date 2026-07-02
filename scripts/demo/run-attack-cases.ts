import { buildApiServer } from "../../apps/api/src/server";
import { proofJobService } from "../../apps/api/src/services/proof-job-service";

const testConfig = {
  nodeEnv: "test",
  appEnv: "demo",
  host: "127.0.0.1",
  port: 0,
  corsOrigin: "http://localhost:3000",
  redisUrl: "redis://localhost:6379",
  bullmqPrefix: "pact-demo"
};

const request = async (
  app: Awaited<ReturnType<typeof buildApiServer>>,
  method: "GET" | "POST",
  url: string,
  payload?: unknown,
  headers?: Record<string, string>
) => {
  const response = await app.inject({ method, url, payload, headers });
  return {
    status: response.statusCode,
    body: response.json()
  };
};

const expectRejected = (
  name: string,
  result: { status: number; body: { error?: { code?: string } } },
  expectedCode: string
) => {
  if (result.status < 400 || result.body.error?.code !== expectedCode) {
    throw new Error(
      `${name} expected ${expectedCode}, got ${result.status} ${JSON.stringify(result.body)}`
    );
  }
  return { name, rejected: expectedCode };
};

const createProgram = async (
  app: Awaited<ReturnType<typeof buildApiServer>>,
  programKey: string,
  releaseToWallet = "GPROJECT"
) => {
  const response = await request(app, "POST", "/api/programs", {
    programKey,
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
        releaseToWallet
      }
    ]
  });
  return response.body.data.program.id as string;
};

const prepareMilestoneProof = async (
  app: Awaited<ReturnType<typeof buildApiServer>>,
  programId: string
) => {
  await request(app, "POST", "/api/attestor/milestone-evidence/mock", {
    programId,
    milestoneKey: "M1",
    metrics: {
      activeUsers: 735,
      pilotPartners: 4,
      auditPassed: true
    },
    sourceRefs: ["attack-script"]
  });
  const root = await request(app, "POST", "/api/attestor/milestone-root/build", {
    policyId: "33333333-3333-4333-8333-333333333333",
    rootType: "MilestoneMetrics"
  });
  await request(app, "POST", "/api/attestor/milestone-root/publish", {
    rootId: root.body.data.root.id
  });
  const proof = await request(app, "POST", "/api/proofs/milestone/generate", {
    programId,
    milestoneKey: "M1"
  });
  return proof.body.data.id as string;
};

const main = async (): Promise<void> => {
  const app = await buildApiServer(testConfig);
  const results: Array<{ name: string; rejected: string }> = [];
  try {
    const replayProgramId = await createProgram(app, "PACT-ATTACK-REPLAY");
    const replayProofId = await prepareMilestoneProof(app, replayProgramId);
    await request(app, "POST", "/api/proofs/milestone/submit", {
      proofJobId: replayProofId,
      programId: replayProgramId,
      milestoneKey: "M1"
    });
    results.push(
      expectRejected(
        "replay",
        await request(app, "POST", "/api/proofs/milestone/submit", {
          proofJobId: replayProofId,
          programId: replayProgramId,
          milestoneKey: "M1"
        }),
        "tranche_release_failed"
      )
    );

    const credential = await request(app, "POST", "/api/issuer/credentials/mock", {
      wallet: "GPROJECT",
      isAccredited: true,
      isNonUs: false,
      jurisdictionCode: "US",
      sanctionsPassed: true,
      expiresAt: 1785600000
    });
    const credentialId = credential.body.data.credential.id as string;
    await request(app, "POST", `/api/issuer/credentials/${credentialId}/revoke`);
    results.push(
      expectRejected(
        "revoked credential",
        await request(app, "POST", "/api/proofs/eligibility/generate", {
          credentialId
        }),
        "credential_not_active"
      )
    );

    const sourceProgramId = await createProgram(app, "PACT-ATTACK-SOURCE");
    const targetProgramId = await createProgram(app, "PACT-ATTACK-TARGET");
    const sourceProofId = await prepareMilestoneProof(app, sourceProgramId);
    results.push(
      expectRejected(
        "cross-program replay",
        await request(app, "POST", "/api/proofs/milestone/submit", {
          proofJobId: sourceProofId,
          programId: targetProgramId,
          milestoneKey: "M1"
        }),
        "milestone_public_inputs_mismatch"
      )
    );

    const wrongRecipientProgramId = await createProgram(
      app,
      "PACT-ATTACK-WRONG-RECIPIENT"
    );
    const wrongRecipientJob = proofJobService.createJob({
      proofType: "MilestoneUnlock",
      requestJson: { programId: wrongRecipientProgramId, milestoneKey: "M1" },
      publicInputsJson: {
        programId: wrongRecipientProgramId,
        milestoneId: "M1",
        recipient: "GWRONG",
        trancheAmount: "50000000"
      }
    });
    proofJobService.completeJob(wrongRecipientJob.id, {
      publicInputsJson: wrongRecipientJob.publicInputsJson,
      proofJson: { mode: "mock" }
    });
    results.push(
      expectRejected(
        "wrong recipient",
        await request(app, "POST", "/api/proofs/milestone/submit", {
          proofJobId: wrongRecipientJob.id,
          programId: wrongRecipientProgramId,
          milestoneKey: "M1"
        }),
        "milestone_public_inputs_mismatch"
      )
    );

    const inactiveRootProgramId = await createProgram(app, "PACT-ATTACK-INACTIVE-ROOT");
    results.push(
      expectRejected(
        "inactive root",
        await request(app, "POST", "/api/proofs/milestone/generate", {
          programId: inactiveRootProgramId,
          milestoneKey: "M1"
        }),
        "milestone_proof_input_unavailable"
      )
    );

    console.log(JSON.stringify({ attacksRejected: results }, null, 2));
  } finally {
    await app.close();
  }
};

void main();
