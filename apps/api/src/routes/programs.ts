import type { FastifyInstance } from "fastify";

import { notImplementedHandler } from "./not-implemented";

export const registerProgramRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/programs", notImplementedHandler);
  app.get("/api/programs/:programId", notImplementedHandler);
  app.post("/api/programs/:programId/fund", notImplementedHandler);
  app.post("/api/programs/:programId/activate", notImplementedHandler);
  app.get("/api/programs/:programId/audit", notImplementedHandler);
};
