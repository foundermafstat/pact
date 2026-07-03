import type { FastifyInstance } from "fastify";
import {
  CreateMockCredentialRequestSchema,
  RootBuildRequestSchema,
  RootPublishRequestSchema
} from "@pact/shared";

import { notImplementedHandler } from "./not-implemented";
import { ApiError } from "../errors";
import { issuerService } from "../services/issuer-service";
import { requireRole } from "./auth-guards";

export const registerIssuerRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/issuer/credentials/mock", async (request) => {
    await requireRole(request, ["Issuer", "Admin"]);
    const body = CreateMockCredentialRequestSchema.parse(request.body);
    return {
      data: issuerService.createMockCredential(body)
    };
  });
  app.post("/api/issuer/roots/build", async (request) => {
    await requireRole(request, ["Issuer", "Admin"]);
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
    await requireRole(request, ["Issuer", "Admin"]);
    const body = RootPublishRequestSchema.parse(request.body);
    const root = issuerService.publishRoot(body.rootId);
    if (!root) {
      throw new ApiError(404, "root_not_found", "Root was not found");
    }

    return { data: root };
  });
  app.post<{ Params: { credentialId: string } }>(
    "/api/issuer/credentials/:credentialId/revoke",
    async (request) => {
      await requireRole(request, ["Issuer", "Admin"]);
      const credential = issuerService.revokeCredential(request.params.credentialId);
      if (!credential) {
        throw new ApiError(404, "credential_not_found", "Credential was not found");
      }

      return { data: credential };
    }
  );
};
