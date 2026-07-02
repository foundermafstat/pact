import type { FastifyInstance } from "fastify";

import { notImplementedHandler } from "./not-implemented";

export const registerPolicyRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/policies", notImplementedHandler);
  app.get("/api/policies/:policyId", notImplementedHandler);
  app.post("/api/policies/:policyId/activate", notImplementedHandler);
  app.post("/api/policies/:policyId/pause", notImplementedHandler);
};
