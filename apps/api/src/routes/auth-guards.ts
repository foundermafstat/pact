import type { FastifyRequest } from "fastify";
import type { Role } from "@pact/shared";
import { parseCookie } from "cookie";

import { ApiError } from "../errors";
import { AUTH_COOKIE_NAME, authService } from "../services/auth-service";

export type AuthenticatedSession = Awaited<
  ReturnType<typeof authService.getSessionByToken>
> & {};

const roleAllows = (roles: Role[], allowedRoles: Role[]): boolean =>
  roles.includes("Admin") || allowedRoles.some((role) => roles.includes(role));

export const getSessionToken = (request: FastifyRequest): string | undefined => {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }

  return parseCookie(cookieHeader)[AUTH_COOKIE_NAME];
};

export const requireSession = async (request: FastifyRequest) => {
  const token = getSessionToken(request);
  const session = token ? await authService.getSessionByToken(token) : undefined;
  if (!session) {
    throw new ApiError(401, "auth_required", "Wallet authentication is required");
  }

  return session;
};

export const requireRole = async (
  request: FastifyRequest,
  allowedRoles: Role[]
) => {
  const session = await requireSession(request);
  if (!roleAllows(session.user.roles, allowedRoles)) {
    throw new ApiError(403, "role_forbidden", "Wallet role is not allowed");
  }

  return session;
};

export const requireProgramAccess = async (
  request: FastifyRequest,
  program: { sponsorWallet: string; projectWallet: string },
  mode: "investor" | "startup" | "audit"
) => {
  const session = await requireSession(request);
  const wallet = authService.normalizeWallet(session.user.wallet);
  const sponsorWallet = authService.normalizeWallet(program.sponsorWallet);
  const projectWallet = authService.normalizeWallet(program.projectWallet);

  if (session.user.roles.includes("Admin")) {
    return session;
  }

  if (mode === "startup" && session.user.roles.includes("Project") && wallet === projectWallet) {
    return session;
  }

  if (
    mode === "investor" &&
    (session.user.roles.includes("Investor") || session.user.roles.includes("Sponsor")) &&
    wallet === sponsorWallet
  ) {
    return session;
  }

  if (
    mode === "audit" &&
    (session.user.roles.includes("Observer") ||
      wallet === sponsorWallet ||
      wallet === projectWallet)
  ) {
    return session;
  }

  throw new ApiError(403, "program_forbidden", "Wallet cannot access this program");
};
