import type { FastifyInstance } from "fastify";
import { CreateMilestoneEvidenceRequestSchema } from "@pact/shared";

import { notImplementedHandler } from "./not-implemented";
import { attestorService } from "../services/attestor-service";

export const registerAttestorRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/attestor/milestone-evidence/mock", async (request) => {
    const body = CreateMilestoneEvidenceRequestSchema.parse(request.body);
    return {
      data: attestorService.createMockEvidence(body)
    };
  });
  app.post("/api/attestor/milestone-root/build", notImplementedHandler);
  app.post("/api/attestor/milestone-root/publish", notImplementedHandler);
  app.get(
    "/api/attestor/programs/:programId/milestones/:milestoneId",
    notImplementedHandler
  );
};
