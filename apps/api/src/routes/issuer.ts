import type { FastifyInstance } from "fastify";
import { CreateMockCredentialRequestSchema } from "@pact/shared";

import { notImplementedHandler } from "./not-implemented";
import { issuerService } from "../services/issuer-service";

export const registerIssuerRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/issuer/credentials/mock", async (request) => {
    const body = CreateMockCredentialRequestSchema.parse(request.body);
    return {
      data: issuerService.createMockCredential(body)
    };
  });
  app.post("/api/issuer/roots/build", notImplementedHandler);
  app.post("/api/issuer/roots/publish", notImplementedHandler);
  app.post("/api/issuer/credentials/:credentialId/revoke", notImplementedHandler);
};
