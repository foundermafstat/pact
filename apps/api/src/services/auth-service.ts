import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { Role } from "@pact/shared";
import { Keypair } from "@stellar/stellar-sdk";

import { prisma } from "../db/client";

export const AUTH_COOKIE_NAME = "pact_session";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SEP53_PREFIX = "Stellar Signed Message:\n";

const rolePriority: Role[] = [
  "Admin",
  "Issuer",
  "Attestor",
  "Project",
  "Investor",
  "Sponsor",
  "Observer"
];

const normalizeWallet = (wallet: string): string => wallet.trim().toUpperCase();

const tokenHash = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const readBootstrapAdminWallets = (): Set<string> =>
  new Set(
    (process.env["PACT_ADMIN_WALLETS"] ?? "")
      .split(",")
      .map((wallet) => normalizeWallet(wallet))
      .filter(Boolean)
  );

const toAuthUser = (wallet: string, roles: Role[]) => {
  const uniqueRoles = [...new Set(roles)];
  const primaryRole =
    rolePriority.find((role) => uniqueRoles.includes(role)) ?? "Investor";

  return {
    wallet,
    roles: uniqueRoles,
    primaryRole
  };
};

const decodeSignatureCandidates = (signature: string): Buffer[] => {
  const trimmed = signature.trim();
  const candidates: Buffer[] = [];

  if (/^[0-9a-f]+$/i.test(trimmed) && trimmed.length === 128) {
    candidates.push(Buffer.from(trimmed, "hex"));
  }

  const normalizedBase64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = normalizedBase64.padEnd(
    normalizedBase64.length + ((4 - (normalizedBase64.length % 4)) % 4),
    "="
  );
  candidates.push(Buffer.from(paddedBase64, "base64"));

  return candidates.filter((candidate) => candidate.length === 64);
};

const buildSep53MessageHash = (message: string): Buffer =>
  createHash("sha256")
    .update(SEP53_PREFIX, "utf8")
    .update(Buffer.from(message, "utf8"))
    .digest();

export const verifySignature = (
  message: string,
  wallet: string,
  signature: string
): boolean => {
  if (process.env["NODE_ENV"] === "test" && signature === "test-signature") {
    return true;
  }

  try {
    const keypair = Keypair.fromPublicKey(wallet);
    const messageBuffer = Buffer.from(message, "utf8");
    const sep53MessageHash = buildSep53MessageHash(message);
    return decodeSignatureCandidates(signature).some(
      (signatureBuffer) =>
        keypair.verify(sep53MessageHash, signatureBuffer) ||
        keypair.verify(messageBuffer, signatureBuffer)
    );
  } catch {
    return false;
  }
};

export class AuthService {
  public normalizeWallet(wallet: string): string {
    return normalizeWallet(wallet);
  }

  public hashToken(token: string): string {
    return tokenHash(token);
  }

  public async createChallenge(input: {
    wallet: string;
    walletProvider?: string | undefined;
  }) {
    const wallet = normalizeWallet(input.wallet);
    const nonce = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
    const message = [
      "Pact wallet login",
      `Wallet: ${wallet}`,
      `Nonce: ${nonce}`,
      `Expires: ${expiresAt.toISOString()}`
    ].join("\n");

    const account = await prisma.walletAccount.findUnique({
      where: { wallet }
    });

    const challenge = await prisma.authChallenge.create({
      data: {
        wallet,
        walletAccountId: account?.id ?? null,
        walletProvider: input.walletProvider ?? null,
        nonce,
        message,
        expiresAt
      }
    });

    return {
      challengeId: challenge.id,
      wallet,
      message,
      expiresAt: expiresAt.toISOString()
    };
  }

  public async verifyChallenge(input: {
    challengeId: string;
    wallet: string;
    signature: string;
    walletProvider?: string | undefined;
  }) {
    const wallet = normalizeWallet(input.wallet);
    const challenge = await prisma.authChallenge.findUnique({
      where: { id: input.challengeId }
    });
    if (!challenge || challenge.wallet !== wallet) {
      return undefined;
    }
    if (challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) {
      return undefined;
    }
    if (!verifySignature(challenge.message, wallet, input.signature)) {
      return undefined;
    }

    const account = await prisma.walletAccount.upsert({
      where: { wallet },
      update: {},
      create: { wallet },
      include: { roles: true }
    });

    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: {
        consumedAt: new Date(),
        walletAccountId: account.id
      }
    });

    await this.ensureDefaultRoles(account.id, wallet);

    const refreshedAccount = await prisma.walletAccount.findUniqueOrThrow({
      where: { id: account.id },
      include: { roles: true }
    });
    const roles = refreshedAccount.roles.map((item) => item.role as Role);
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await prisma.authSession.create({
      data: {
        walletAccountId: account.id,
        tokenHash: tokenHash(token),
        walletProvider: input.walletProvider ?? null,
        expiresAt
      }
    });

    return {
      token,
      session: {
        user: toAuthUser(wallet, roles),
        expiresAt: expiresAt.toISOString()
      }
    };
  }

  public async getSessionByToken(token: string) {
    const hash = tokenHash(token);
    const session = await prisma.authSession.findUnique({
      where: { tokenHash: hash },
      include: {
        account: {
          include: { roles: true }
        }
      }
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      return undefined;
    }

    const tokenHashBuffer = Buffer.from(session.tokenHash);
    const requestHashBuffer = Buffer.from(hash);
    if (
      tokenHashBuffer.length !== requestHashBuffer.length ||
      !timingSafeEqual(tokenHashBuffer, requestHashBuffer)
    ) {
      return undefined;
    }

    await prisma.authSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() }
    });

    return {
      sessionId: session.id,
      user: toAuthUser(
        session.account.wallet,
        session.account.roles.map((item) => item.role as Role)
      ),
      expiresAt: session.expiresAt
    };
  }

  public async revokeToken(token: string): Promise<void> {
    await prisma.authSession.updateMany({
      where: {
        tokenHash: tokenHash(token),
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }

  public async listWalletRoles() {
    const accounts = await prisma.walletAccount.findMany({
      include: { roles: true },
      orderBy: { createdAt: "desc" }
    });

    return accounts.map((account) => ({
      wallet: account.wallet,
      roles: account.roles.map((item) => item.role as Role)
    }));
  }

  public async assignRole(input: {
    wallet: string;
    role: Role;
    grantedByWallet?: string | undefined;
  }) {
    const wallet = normalizeWallet(input.wallet);
    const account = await prisma.walletAccount.upsert({
      where: { wallet },
      update: {},
      create: { wallet }
    });

    await prisma.walletRole.upsert({
      where: {
        walletAccountId_role: {
          walletAccountId: account.id,
          role: input.role
        }
      },
      update: {
        grantedByWallet: input.grantedByWallet ?? null
      },
      create: {
        walletAccountId: account.id,
        role: input.role,
        grantedByWallet: input.grantedByWallet ?? null
      }
    });

    const updated = await prisma.walletAccount.findUniqueOrThrow({
      where: { id: account.id },
      include: { roles: true }
    });

    return {
      wallet: updated.wallet,
      roles: updated.roles.map((item) => item.role as Role)
    };
  }

  private async ensureDefaultRoles(accountId: string, wallet: string): Promise<void> {
    const existingRoles = await prisma.walletRole.findMany({
      where: { walletAccountId: accountId }
    });
    const roles = new Set(existingRoles.map((item) => item.role as Role));
    const bootstrapAdmins = readBootstrapAdminWallets();
    const requiredRoles: Role[] = [];

    if (roles.size === 0) {
      requiredRoles.push("Investor");
    }
    if (bootstrapAdmins.has(wallet) && !roles.has("Admin")) {
      requiredRoles.push("Admin");
    }

    for (const role of requiredRoles) {
      await prisma.walletRole.upsert({
        where: {
          walletAccountId_role: {
            walletAccountId: accountId,
            role
          }
        },
        update: {},
        create: {
          walletAccountId: accountId,
          role,
          grantedByWallet: "bootstrap"
        }
      });
    }
  }
}

export const authService = new AuthService();
