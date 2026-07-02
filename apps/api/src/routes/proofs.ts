import { createHash } from "node:crypto";

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { ApiError } from "../errors";
import { notImplementedHandler } from "./not-implemented";
import { issuerService } from "../services/issuer-service";
import { proofJobService } from "../services/proof-job-service";

const EligibilityProofGenerateRequestSchema = z.object({
  proofType: z.literal("Eligibility").optional(),
  credentialId: z.string().uuid()
});

const sha256Hex = (value: string): `0x${string}` =>
  `0x${createHash("sha256").update(value).digest("hex")}`;

export const registerProofRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/proofs/eligibility/generate", async (request) => {
    const parsed = EligibilityProofGenerateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_eligibility_proof_request",
        "Eligibility proof request is invalid",
        parsed.error.flatten()
      );
    }

    const issuedCredential = issuerService.getCredential(parsed.data.credentialId);
    if (!issuedCredential) {
      throw new ApiError(404, "credential_not_found", "Credential was not found");
    }

    const queuedJob = proofJobService.createJob({
      proofType: "Eligibility",
      requestJson: {
        credentialId: issuedCredential.credential.id,
        credentialKey: issuedCredential.credential.credentialKey,
        wallet: issuedCredential.credential.wallet
      }
    });
    proofJobService.startJob(queuedJob.id);
    const completedJob = proofJobService.completeJob(queuedJob.id, {
      publicInputsJson: {
        proofType: "Eligibility",
        credentialId: issuedCredential.credential.id,
        nullifier: sha256Hex(`eligibility:${issuedCredential.credential.id}`)
      },
      proofJson: {
        mode: "mock",
        proofId: sha256Hex(`mock-eligibility-proof:${queuedJob.id}`),
        generatedAt: new Date().toISOString()
      }
    });

    return { data: completedJob };
  });
  app.post("/api/proofs/milestone/generate", notImplementedHandler);
  app.post("/api/proofs/milestone/submit", notImplementedHandler);
  app.get("/api/proofs/:proofId", notImplementedHandler);
};
