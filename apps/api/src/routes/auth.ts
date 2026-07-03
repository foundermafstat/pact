import type { FastifyInstance } from "fastify";
import {
  AssignWalletRoleRequestSchema,
  AuthChallengeRequestSchema,
  AuthVerifyRequestSchema,
  SelectAccountRoleRequestSchema
} from "@pact/shared";
import { stringifySetCookie } from "cookie";

import { AUTH_COOKIE_NAME, authService } from "../services/auth-service";
import { ApiError } from "../errors";
import { getSessionToken, requireRole, requireSession } from "./auth-guards";

const isCookieSecure = (): boolean => process.env["COOKIE_SECURE"] === "true";

const getCookieOptions = (secure: boolean) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure,
  path: "/"
});

export const registerAuthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/auth/challenge", async (request) => {
    const body = AuthChallengeRequestSchema.parse(request.body);
    return {
      data: await authService.createChallenge({
        wallet: body.wallet,
        walletProvider: body.walletProvider
      })
    };
  });

  app.post("/api/auth/verify", async (request, reply) => {
    const body = AuthVerifyRequestSchema.parse(request.body);
    const result = await authService.verifyChallenge({
      challengeId: body.challengeId,
      wallet: body.wallet,
      signature: body.signature,
      walletProvider: body.walletProvider
    });
    if (!result) {
      throw new ApiError(401, "wallet_signature_invalid", "Wallet signature is invalid");
    }

    reply.header(
      "set-cookie",
      stringifySetCookie({
        name: AUTH_COOKIE_NAME,
        value: result.token,
        ...getCookieOptions(isCookieSecure()),
        expires: new Date(result.session.expiresAt)
      })
    );

    return { data: result.session };
  });

  app.get("/api/auth/me", async (request) => {
    const session = await requireSession(request);
    return {
      data: {
        user: session.user,
        expiresAt: session.expiresAt.toISOString()
      }
    };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const token = getSessionToken(request);
    if (token) {
      await authService.revokeToken(token);
    }
    reply.header(
      "set-cookie",
      stringifySetCookie({
        name: AUTH_COOKIE_NAME,
        value: "",
        ...getCookieOptions(isCookieSecure()),
        expires: new Date(0)
      })
    );

    return { data: { ok: true } };
  });

  app.post("/api/auth/select-role", async (request) => {
    const session = await requireSession(request);
    const body = SelectAccountRoleRequestSchema.parse(request.body);
    return {
      data: {
        user: await authService.selectAccountRole({
          wallet: session.user.wallet,
          role: body.role
        }),
        expiresAt: session.expiresAt.toISOString()
      }
    };
  });

  app.get("/api/admin/wallet-roles", async (request) => {
    await requireRole(request, ["Admin"]);
    return {
      data: await authService.listWalletRoles()
    };
  });

  app.post("/api/admin/wallet-roles", async (request) => {
    const session = await requireRole(request, ["Admin"]);
    const body = AssignWalletRoleRequestSchema.parse(request.body);
    return {
      data: await authService.assignRole({
        ...body,
        grantedByWallet: session.user.wallet
      })
    };
  });
};
