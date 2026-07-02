import type { FastifyInstance } from "fastify";
import {
  CreateMilestoneEvidenceRequestSchema,
  RootBuildRequestSchema,
  RootPublishRequestSchema
} from "@pact/shared";

import { notImplementedHandler } from "./not-implemented";
import { ApiError } from "../errors";
import { attestorService } from "../services/attestor-service";

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
  app.get(
    "/api/attestor/programs/:programId/milestones/:milestoneId",
    notImplementedHandler
  );
};
