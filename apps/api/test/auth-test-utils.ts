import { randomBytes } from "node:crypto";

import type { Role } from "@pact/shared";
import type { FastifyInstance } from "fastify";

import { AUTH_COOKIE_NAME, authService } from "../src/services/auth-service";
import { prisma } from "../src/db/client";

const ensureAccount = async (wallet: string) => {
  const normalizedWallet = authService.normalizeWallet(wallet);
  try {
    return await prisma.walletAccount.upsert({
      where: { wallet: normalizedWallet },
      update: {},
      create: { wallet: normalizedWallet }
    });
  } catch {
    return prisma.walletAccount.findUniqueOrThrow({
      where: { wallet: normalizedWallet }
    });
  }
};

const ensureRole = async (walletAccountId: string, role: Role): Promise<void> => {
  try {
    await prisma.walletRole.upsert({
      where: {
        walletAccountId_role: {
          walletAccountId,
          role
        }
      },
      update: {
        grantedByWallet: "test"
      },
      create: {
        walletAccountId,
        role,
        grantedByWallet: "test"
      }
    });
  } catch {
    // A parallel test may have inserted the same role between the read and write.
  }
};

export const authHeaders = async (
  wallet: string,
  role: Role = "Admin"
): Promise<{ cookie: string }> => {
  const account = await ensureAccount(wallet);
  await ensureRole(account.id, role);
  const token = randomBytes(32).toString("base64url");
  await prisma.authSession.create({
    data: {
      walletAccountId: account.id,
      tokenHash: authService.hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    }
  });

  return {
    cookie: `${AUTH_COOKIE_NAME}=${token}`
  };
};

export const useDefaultAuth = async (
  app: FastifyInstance,
  wallet: string,
  role: Role = "Admin"
): Promise<void> => {
  const headers = await authHeaders(wallet, role);
  app.addHook("onRequest", async (request) => {
    if (!request.headers.cookie) {
      request.headers.cookie = headers.cookie;
    }
  });
};
