import type { FastifyInstance } from "fastify";
import { CreateMilestoneEvidenceRequestSchema } from "@pact/shared";

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
  app.post("/api/attestor/milestone-root/build", notImplementedHandler);
  app.post("/api/attestor/milestone-root/publish", notImplementedHandler);
  app.get(
    "/api/attestor/programs/:programId/milestones/:milestoneId",
    notImplementedHandler
  );
};
