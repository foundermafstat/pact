import type { FastifyInstance } from "fastify";
import { CreatePolicyRequestSchema } from "@pact/shared";

import { ApiError } from "../errors";
import { policyService } from "../services/policy-service";

export const registerPolicyRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/policies", async (request) => {
    const body = CreatePolicyRequestSchema.parse(request.body);
    return {
      data: policyService.createPolicy(body)
    };
  });

  app.get<{ Params: { policyId: string } }>(
    "/api/policies/:policyId",
    async (request) => {
      const policy = policyService.getPolicy(request.params.policyId);
      if (!policy) {
        throw new ApiError(404, "policy_not_found", "Policy was not found");
      }

      return { data: policy };
    }
  );

  app.post<{ Params: { policyId: string } }>(
    "/api/policies/:policyId/activate",
    async (request) => {
      const policy = policyService.setStatus(request.params.policyId, "Active");
      if (!policy) {
        throw new ApiError(404, "policy_not_found", "Policy was not found");
      }

      return { data: policy };
    }
  );

  app.post<{ Params: { policyId: string } }>(
    "/api/policies/:policyId/pause",
    async (request) => {
      const policy = policyService.setStatus(request.params.policyId, "Paused");
      if (!policy) {
        throw new ApiError(404, "policy_not_found", "Policy was not found");
      }

      return { data: policy };
    }
  );
};
