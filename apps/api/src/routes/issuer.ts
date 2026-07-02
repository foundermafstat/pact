import type { FastifyInstance } from "fastify";

import { notImplementedHandler } from "./not-implemented";

export const registerIssuerRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/issuer/credentials/mock", notImplementedHandler);
  app.post("/api/issuer/roots/build", notImplementedHandler);
  app.post("/api/issuer/roots/publish", notImplementedHandler);
  app.post("/api/issuer/credentials/:credentialId/revoke", notImplementedHandler);
};
