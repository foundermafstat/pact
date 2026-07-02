import { createHash } from "node:crypto";

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { ApiError } from "../errors";
import { notImplementedHandler } from "./not-implemented";
import { attestorService } from "../services/attestor-service";
import { issuerService } from "../services/issuer-service";
import { proofJobService } from "../services/proof-job-service";
import { programService } from "../services/program-service";

const EligibilityProofGenerateRequestSchema = z.object({
  proofType: z.literal("Eligibility").optional(),
  credentialId: z.string().uuid()
});

const MilestoneProofGenerateRequestSchema = z.object({
  proofType: z.literal("MilestoneUnlock").optional(),
  programId: z.string().uuid(),
  milestoneKey: z.string().min(1)
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
  app.post("/api/proofs/milestone/generate", async (request) => {
    const parsed = MilestoneProofGenerateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_milestone_proof_request",
        "Milestone proof request is invalid",
        parsed.error.flatten()
      );
    }

    const record = programService.getProgram(parsed.data.programId);
    if (!record) {
      throw new ApiError(404, "program_not_found", "Program was not found");
    }

    const tranche = record.tranches.find(
      (item) => item.milestoneKey === parsed.data.milestoneKey
    );
    if (!tranche) {
      throw new ApiError(404, "milestone_not_found", "Milestone was not found");
    }

    let proofInput;
    try {
      proofInput = attestorService.buildMilestoneProofInput({
        program: record.program,
        tranche
      });
    } catch (error) {
      throw new ApiError(
        400,
        "milestone_proof_input_unavailable",
        error instanceof Error ? error.message : "Milestone proof input is unavailable"
      );
    }

    const queuedJob = proofJobService.createJob({
      proofType: "MilestoneUnlock",
      requestJson: {
        programId: record.program.id,
        milestoneKey: tranche.milestoneKey,
        trancheId: tranche.id,
        attestationId: proofInput.attestationId
      },
      publicInputsJson: proofInput.publicInputs
    });
    proofJobService.startJob(queuedJob.id);
    const completedJob = proofJobService.completeJob(queuedJob.id, {
      publicInputsJson: proofInput.publicInputs,
      proofJson: {
        mode: "mock",
        proofId: sha256Hex(`mock-milestone-proof:${queuedJob.id}`),
        generatedAt: new Date().toISOString()
      }
    });

    return { data: completedJob };
  });
  app.post("/api/proofs/milestone/submit", notImplementedHandler);
  app.get<{ Params: { proofId: string } }>("/api/proofs/:proofId", async (request) => {
    const job = proofJobService.getJob(request.params.proofId);
    if (!job) {
      throw new ApiError(404, "proof_job_not_found", "Proof job was not found");
    }

    return { data: job };
  });
};
