import type { FastifyInstance } from "fastify";
import {
  CreateMockCredentialRequestSchema,
  RootBuildRequestSchema,
  RootPublishRequestSchema
} from "@pact/shared";

import { notImplementedHandler } from "./not-implemented";
import { ApiError } from "../errors";
import { issuerService } from "../services/issuer-service";

export const registerIssuerRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/issuer/credentials/mock", async (request) => {
    const body = CreateMockCredentialRequestSchema.parse(request.body);
    return {
      data: issuerService.createMockCredential(body)
    };
  });
  app.post("/api/issuer/roots/build", async (request) => {
    const body = RootBuildRequestSchema.parse(request.body);
    try {
      return {
        data: issuerService.buildCredentialRoot(body)
      };
    } catch (error) {
      throw new ApiError(
        400,
        "credential_root_build_failed",
        error instanceof Error ? error.message : "Credential root build failed"
      );
    }
  });
  app.post("/api/issuer/roots/publish", async (request) => {
    const body = RootPublishRequestSchema.parse(request.body);
    const root = issuerService.publishRoot(body.rootId);
    if (!root) {
      throw new ApiError(404, "root_not_found", "Root was not found");
    }

    return { data: root };
  });
  app.post("/api/issuer/credentials/:credentialId/revoke", notImplementedHandler);
};
