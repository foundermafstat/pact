import type { FastifyInstance } from "fastify";

import { notImplementedHandler } from "./not-implemented";

export const registerProofRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/proofs/eligibility/generate", notImplementedHandler);
  app.post("/api/proofs/milestone/generate", notImplementedHandler);
  app.post("/api/proofs/milestone/submit", notImplementedHandler);
  app.get("/api/proofs/:proofId", notImplementedHandler);
};
