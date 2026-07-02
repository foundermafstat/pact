import type { FastifyInstance } from "fastify";

import { notImplementedHandler } from "./not-implemented";

export const registerAttestorRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/attestor/milestone-evidence/mock", notImplementedHandler);
  app.post("/api/attestor/milestone-root/build", notImplementedHandler);
  app.post("/api/attestor/milestone-root/publish", notImplementedHandler);
  app.get(
    "/api/attestor/programs/:programId/milestones/:milestoneId",
    notImplementedHandler
  );
};
