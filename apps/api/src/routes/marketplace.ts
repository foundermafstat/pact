import type { FastifyInstance } from "fastify";
import {
  ApplyToInvestmentPoolRequestSchema,
  CreateInvestmentCommitmentRequestSchema,
  CreateInvestmentPoolRequestSchema,
  CreateStartupProfileRequestSchema
} from "@pact/shared";
import { z } from "zod";

import { marketplaceService } from "../services/marketplace-service";
import { requireRole } from "./auth-guards";

const InvestmentPoolsQuerySchema = z.object({
  scope: z.enum(["mine", "open"]).optional()
});

export const registerMarketplaceRoutes = async (
  app: FastifyInstance
): Promise<void> => {
  app.post("/api/startups", async (request) => {
    const session = await requireRole(request, ["Project", "Admin"]);
    const body = CreateStartupProfileRequestSchema.parse(request.body);

    return {
      data: await marketplaceService.createStartupProfile(session.user.wallet, body)
    };
  });

  app.get("/api/startups/mine", async (request) => {
    const session = await requireRole(request, ["Project", "Admin"]);

    return {
      data: await marketplaceService.listFounderStartupProfiles(session.user.wallet)
    };
  });

  app.get("/api/startups", async (request) => {
    await requireRole(request, ["Investor", "Sponsor", "Admin"]);

    return {
      data: await marketplaceService.listAvailableStartupProfiles()
    };
  });

  app.post<{ Params: { startupId: string } }>(
    "/api/startups/:startupId/commitments",
    async (request) => {
      const session = await requireRole(request, ["Investor", "Sponsor", "Admin"]);
      const body = CreateInvestmentCommitmentRequestSchema.parse(request.body);

      return {
        data: await marketplaceService.createInvestmentCommitment(
          session.user.wallet,
          request.params.startupId,
          body
        )
      };
    }
  );

  app.post("/api/investment-pools", async (request) => {
    const session = await requireRole(request, ["Investor", "Sponsor", "Admin"]);
    const body = CreateInvestmentPoolRequestSchema.parse(request.body);

    return {
      data: await marketplaceService.createInvestmentPool(session.user.wallet, body)
    };
  });

  app.get("/api/investment-pools", async (request) => {
    const session = await requireRole(request, ["Project", "Investor", "Sponsor", "Admin"]);
    const query = InvestmentPoolsQuerySchema.parse(request.query);
    const useOpenScope = query.scope === "open";
    const ownerWallet =
      session.user.roles.includes("Admin") || useOpenScope ? undefined : session.user.wallet;

    return {
      data: await marketplaceService.listInvestmentPools({
        ownerWallet,
        onlyOpen: useOpenScope
      })
    };
  });

  app.post<{ Params: { poolId: string } }>(
    "/api/investment-pools/:poolId/applications",
    async (request) => {
      const session = await requireRole(request, ["Project", "Admin"]);
      const body = ApplyToInvestmentPoolRequestSchema.parse(request.body);

      return {
        data: await marketplaceService.applyToInvestmentPool(
          session.user.wallet,
          request.params.poolId,
          body
        )
      };
    }
  );

  app.get("/api/investment-pool-applications/mine", async (request) => {
    const session = await requireRole(request, ["Project", "Admin"]);

    return {
      data: await marketplaceService.listFounderPoolApplications(session.user.wallet)
    };
  });

  app.get("/api/investment-commitments/mine", async (request) => {
    const session = await requireRole(request, ["Investor", "Sponsor", "Admin"]);

    return {
      data: await marketplaceService.listInvestorCommitments(session.user.wallet)
    };
  });
};
