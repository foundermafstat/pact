import type { FastifyInstance } from "fastify";
import { SubmitMilestoneProofRequestSchema } from "@pact/shared";
import { z } from "zod";

import { ApiError } from "../errors";
import { attestorService } from "../services/attestor-service";
import {
  escrowContractService,
  SmartContractNotConfiguredError
} from "../services/escrow-contract-service";
import { issuerService } from "../services/issuer-service";
import {
  generateEligibilityProof,
  generateMilestoneProof
} from "../services/local-proof-service";
import { proofJobService } from "../services/proof-job-service";
import { programService } from "../services/program-service";
import { requireProgramAccess, requireRole, requireSession } from "./auth-guards";

const EligibilityProofGenerateRequestSchema = z.object({
  proofType: z.literal("Eligibility").optional(),
  credentialId: z.string().uuid()
});

const MilestoneProofGenerateRequestSchema = z.object({
  proofType: z.literal("MilestoneUnlock").optional(),
  programId: z.string().uuid(),
  milestoneKey: z.string().min(1)
});

export const registerProofRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/proofs/eligibility/generate", async (request) => {
    await requireRole(request, ["Project", "Admin"]);
    const parsed = EligibilityProofGenerateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_eligibility_proof_request",
        "Eligibility proof request is invalid",
        parsed.error.flatten()
      );
    }

    const issuedCredential = await issuerService.getCredential(parsed.data.credentialId);
    if (!issuedCredential) {
      throw new ApiError(404, "credential_not_found", "Credential was not found");
    }
    if (issuedCredential.credential.status !== "Active") {
      throw new ApiError(
        400,
        "credential_not_active",
        "Credential is revoked or expired"
      );
    }

    const queuedJob = await proofJobService.createJob({
      proofType: "Eligibility",
      requestJson: {
        credentialId: issuedCredential.credential.id,
        credentialKey: issuedCredential.credential.credentialKey,
        wallet: issuedCredential.credential.wallet
      }
    });
    await proofJobService.startJob(queuedJob.id);
    let completedJob;
    try {
      completedJob = await proofJobService.completeJob(
        queuedJob.id,
        await generateEligibilityProof(issuedCredential.privateCredentialPackage)
      );
    } catch (error) {
      await proofJobService.failJob(
        queuedJob.id,
        error instanceof Error ? error.message : "Eligibility proof generation failed"
      );
      throw new ApiError(
        502,
        "eligibility_proof_generation_failed",
        error instanceof Error ? error.message : "Eligibility proof generation failed"
      );
    }

    return { data: completedJob };
  });
  app.post("/api/proofs/milestone/generate", async (request) => {
    await requireRole(request, ["Project", "Admin"]);
    const parsed = MilestoneProofGenerateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_milestone_proof_request",
        "Milestone proof request is invalid",
        parsed.error.flatten()
      );
    }

    const record = await programService.getProgram(parsed.data.programId);
    if (!record) {
      throw new ApiError(404, "program_not_found", "Program was not found");
    }
    await requireProgramAccess(request, record.program, "startup");

    const tranche = record.tranches.find(
      (item) => item.milestoneKey === parsed.data.milestoneKey
    );
    if (!tranche) {
      throw new ApiError(404, "milestone_not_found", "Milestone was not found");
    }

    let proofInput;
    try {
      proofInput = await attestorService.buildMilestoneProofInput({
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

    const queuedJob = await proofJobService.createJob({
      proofType: "MilestoneUnlock",
      requestJson: {
        programId: record.program.id,
        milestoneKey: tranche.milestoneKey,
        trancheId: tranche.id,
        attestationId: proofInput.attestationId
      },
      publicInputsJson: proofInput.publicInputs
    });
    await proofJobService.startJob(queuedJob.id);
    let completedJob;
    try {
      completedJob = await proofJobService.completeJob(
        queuedJob.id,
        await generateMilestoneProof({
          publicInputs: proofInput.publicInputs,
          privateInputs: proofInput.privateInputs
        })
      );
    } catch (error) {
      await proofJobService.failJob(
        queuedJob.id,
        error instanceof Error ? error.message : "Milestone proof generation failed"
      );
      throw new ApiError(
        502,
        "milestone_proof_generation_failed",
        error instanceof Error ? error.message : "Milestone proof generation failed"
      );
    }

    return { data: completedJob };
  });
  app.post("/api/proofs/milestone/submit", async (request) => {
    await requireRole(request, ["Project", "Admin"]);
    const parsed = SubmitMilestoneProofRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_milestone_proof_submit_request",
        "Milestone proof submit request is invalid",
        parsed.error.flatten()
      );
    }

    const proofJob = await proofJobService.getJob(parsed.data.proofJobId);
    if (!proofJob) {
      throw new ApiError(404, "proof_job_not_found", "Proof job was not found");
    }

    if (proofJob.proofType !== "MilestoneUnlock" || proofJob.status !== "Succeeded") {
      throw new ApiError(
        400,
        "proof_job_not_submittable",
        "Only succeeded milestone proof jobs can be submitted"
      );
    }

    const record = await programService.getProgram(parsed.data.programId);
    const tranche = record?.tranches.find(
      (item) => item.milestoneKey === parsed.data.milestoneKey
    );
    if (!record || !tranche) {
      throw new ApiError(404, "milestone_not_found", "Milestone was not found");
    }
    await requireProgramAccess(request, record.program, "startup");

    const publicInputs = proofJob.publicInputsJson ?? {};
    if (
      publicInputs["programId"] !== parsed.data.programId ||
      publicInputs["milestoneId"] !== parsed.data.milestoneKey ||
      publicInputs["recipient"] !== tranche.releaseToWallet ||
      publicInputs["trancheAmount"] !== tranche.amount
    ) {
      throw new ApiError(
        400,
        "milestone_public_inputs_mismatch",
        "Proof public inputs do not match the target milestone"
      );
    }

    let txHash: string;
    try {
      txHash = await escrowContractService.submitVerifiedMilestoneAndRelease({
        program: record.program,
        tranche,
        milestoneRoot: String(publicInputs["milestoneRoot"]),
        milestoneNullifier: String(publicInputs["nullifier"]),
        proofDigest: String(
          (proofJob.proofJson?.["verification"] as { proofDigest?: unknown } | undefined)
            ?.proofDigest ?? proofJob.proofJson?.["proofDigest"] ?? ""
        )
      });
    } catch (error) {
      if (error instanceof SmartContractNotConfiguredError) {
        throw new ApiError(
          503,
          "smart_contract_not_configured",
          "Smart contract release is not configured"
        );
      }
      throw new ApiError(
        502,
        "smart_contract_release_failed",
        error instanceof Error ? error.message : "Smart contract release failed"
      );
    }
    const releasedTranche = await programService.releaseTranche(
      parsed.data.programId,
      parsed.data.milestoneKey,
      txHash
    );
    if (!releasedTranche) {
      throw new ApiError(
        400,
        "tranche_release_failed",
        "Milestone tranche could not be released"
      );
    }

    return {
      data: {
        proofJob,
        tranche: releasedTranche,
        txHash
      }
    };
  });
  app.get<{ Params: { proofId: string } }>("/api/proofs/:proofId", async (request) => {
    await requireSession(request);
    const job = await proofJobService.getJob(request.params.proofId);
    if (!job) {
      throw new ApiError(404, "proof_job_not_found", "Proof job was not found");
    }

    return { data: job };
  });
};
