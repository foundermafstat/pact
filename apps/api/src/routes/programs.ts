import type { FastifyInstance } from "fastify";
import {
  CreateProgramRequestSchema,
  FundProgramRequestSchema
} from "@pact/shared";

import { ApiError } from "../errors";
import { programService } from "../services/program-service";
import { publicAuditService } from "../services/public-audit-service";
import { requireProgramAccess, requireRole } from "./auth-guards";

export const registerProgramRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/programs", async (request) => {
    const body = CreateProgramRequestSchema.parse(request.body);
    const session = await requireRole(request, ["Investor", "Sponsor", "Admin"]);
    if (
      !session.user.roles.includes("Admin") &&
      body.sponsorWallet.toUpperCase() !== session.user.wallet.toUpperCase()
    ) {
      throw new ApiError(
        403,
        "sponsor_wallet_forbidden",
        "Investor wallet must match sponsor wallet"
      );
    }

    return {
      data: programService.createProgram(body)
    };
  });

  app.get<{ Params: { programId: string } }>(
    "/api/programs/:programId",
    async (request) => {
      const record = programService.getProgram(request.params.programId);
      if (!record) {
        throw new ApiError(404, "program_not_found", "Program was not found");
      }
      await requireProgramAccess(request, record.program, "audit");

      return { data: record };
    }
  );

  app.post<{ Params: { programId: string } }>(
    "/api/programs/:programId/fund",
    async (request) => {
      const body = FundProgramRequestSchema.parse(request.body);
      const currentRecord = programService.getProgram(request.params.programId);
      if (!currentRecord) {
        throw new ApiError(404, "program_not_found", "Program was not found");
      }
      await requireProgramAccess(request, currentRecord.program, "investor");

      const record = programService.fundProgram(request.params.programId, body.amount);
      if (!record) {
        throw new ApiError(404, "program_not_found", "Program was not found");
      }

      return { data: record };
    }
  );

  app.post<{ Params: { programId: string } }>(
    "/api/programs/:programId/activate",
    async (request) => {
      const currentRecord = programService.getProgram(request.params.programId);
      if (!currentRecord) {
        throw new ApiError(404, "program_not_found", "Program was not found");
      }
      await requireProgramAccess(request, currentRecord.program, "investor");

      const record = programService.activateProgram(request.params.programId);
      if (!record) {
        throw new ApiError(404, "program_not_found", "Program was not found");
      }

      return { data: record };
    }
  );

  app.get<{ Params: { programId: string } }>(
    "/api/programs/:programId/audit",
    async (request) => {
      const audit = publicAuditService.getProgramAudit(request.params.programId);
      if (!audit) {
        throw new ApiError(404, "program_not_found", "Program was not found");
      }
      await requireProgramAccess(request, audit.program, "audit");

      return { data: audit };
    }
  );
};
