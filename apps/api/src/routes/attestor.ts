import type { FastifyInstance } from "fastify";
import {
  CreateMilestoneEvidenceRequestSchema,
  RootBuildRequestSchema,
  RootPublishRequestSchema
} from "@pact/shared";

import { ApiError } from "../errors";
import { attestorService } from "../services/attestor-service";
import { programService } from "../services/program-service";

export const registerAttestorRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/attestor/milestone-evidence/mock", async (request) => {
    const body = CreateMilestoneEvidenceRequestSchema.parse(request.body);
    try {
      return {
        data: attestorService.createMockEvidence(body)
      };
    } catch (error) {
      throw new ApiError(
        400,
        "milestone_validation_failed",
        error instanceof Error ? error.message : "Milestone validation failed"
      );
    }
  });
  app.post("/api/attestor/milestone-root/build", async (request) => {
    const body = RootBuildRequestSchema.parse(request.body);
    try {
      return {
        data: attestorService.buildMilestoneRoot(body)
      };
    } catch (error) {
      throw new ApiError(
        400,
        "milestone_root_build_failed",
        error instanceof Error ? error.message : "Milestone root build failed"
      );
    }
  });
  app.post("/api/attestor/milestone-root/publish", async (request) => {
    const body = RootPublishRequestSchema.parse(request.body);
    const root = attestorService.publishMilestoneRoot(body.rootId);
    if (!root) {
      throw new ApiError(404, "root_not_found", "Root was not found");
    }

    return { data: root };
  });
  app.get<{ Params: { programId: string; milestoneId: string } }>(
    "/api/attestor/programs/:programId/milestones/:milestoneId",
    async (request) => {
      const record = programService.getProgram(request.params.programId);
      if (!record) {
        throw new ApiError(404, "program_not_found", "Program was not found");
      }

      const tranche = record.tranches.find(
        (item) => item.milestoneKey === request.params.milestoneId
      );
      if (!tranche) {
        throw new ApiError(404, "milestone_not_found", "Milestone was not found");
      }

      const role = String(request.headers["x-pact-role"] ?? "");
      const wallet = String(request.headers["x-pact-wallet"] ?? "");
      const isAuthorizedProject =
        role === "Project" && wallet === record.program.projectWallet;
      if (role !== "Admin" && !isAuthorizedProject) {
        throw new ApiError(
          403,
          "proof_input_forbidden",
          "Only the project wallet or an admin can access milestone proof input"
        );
      }

      try {
        return {
          data: attestorService.buildMilestoneProofInput({
            program: record.program,
            tranche
          })
        };
      } catch (error) {
        throw new ApiError(
          400,
          "milestone_proof_input_unavailable",
          error instanceof Error ? error.message : "Milestone proof input is unavailable"
        );
      }
    }
  );
};
