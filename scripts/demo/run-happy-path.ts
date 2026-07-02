import { buildApiServer } from "../../apps/api/src/server";

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
  if (response.statusCode >= 400) {
    throw new Error(`${method} ${url} failed: ${response.body}`);
  }
  return response.json().data;
};

const main = async (): Promise<void> => {
  const app = await buildApiServer(testConfig);
  try {
    const created = await request(app, "POST", "/api/programs", {
      programKey: "PACT-HAPPY-PATH",
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
    const programId = created.program.id;

    await request(app, "POST", `/api/programs/${programId}/fund`, {
      amount: "100000000"
    });
    await request(app, "POST", `/api/programs/${programId}/activate`);

    const credential = await request(app, "POST", "/api/issuer/credentials/mock", {
      wallet: "GPROJECT",
      isAccredited: true,
      isNonUs: false,
      jurisdictionCode: "US",
      sanctionsPassed: true,
      expiresAt: 1785600000
    });
    const credentialRoot = await request(app, "POST", "/api/issuer/roots/build", {
      policyId: "22222222-2222-4222-8222-222222222222",
      rootType: "Credential"
    });
    await request(app, "POST", "/api/issuer/roots/publish", {
      rootId: credentialRoot.id
    });
    const eligibilityProof = await request(
      app,
      "POST",
      "/api/proofs/eligibility/generate",
      {
        credentialId: credential.credential.id
      }
    );

    await request(app, "POST", "/api/attestor/milestone-evidence/mock", {
      programId,
      milestoneKey: "M1",
      metrics: {
        activeUsers: 735,
        pilotPartners: 4,
        auditPassed: true
      },
      sourceRefs: ["happy-path"]
    });
    const milestoneRoot = await request(app, "POST", "/api/attestor/milestone-root/build", {
      policyId: "33333333-3333-4333-8333-333333333333",
      rootType: "MilestoneMetrics"
    });
    await request(app, "POST", "/api/attestor/milestone-root/publish", {
      rootId: milestoneRoot.root.id
    });
    const milestoneProof = await request(app, "POST", "/api/proofs/milestone/generate", {
      programId,
      milestoneKey: "M1"
    });
    const submitted = await request(app, "POST", "/api/proofs/milestone/submit", {
      proofJobId: milestoneProof.id,
      programId,
      milestoneKey: "M1"
    });

    console.log(
      JSON.stringify(
        {
          programId,
          eligibilityProofStatus: eligibilityProof.status,
          milestoneProofStatus: milestoneProof.status,
          trancheStatus: submitted.tranche.status,
          txHash: submitted.txHash
        },
        null,
        2
      )
    );
  } finally {
    await app.close();
  }
};

void main();
