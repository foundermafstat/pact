import { createHash, createHmac, randomBytes } from "node:crypto";

import type {
  StripeConnectionStatusDto,
  StripeOAuthStartDto
} from "@pact/shared";

import type { StripeIntegrationConfig } from "../config";
import { prisma } from "../db/client";

export type StripeConnectionStatus =
  | "pending"
  | "connected"
  | "deauthorized";

export type StripeConnectionRecord = {
  id: string;
  programId: string;
  stripeAccountId: string;
  stripeAccountHash: `0x${string}`;
  accountSalt: string;
  livemode: boolean;
  scope: string;
  status: StripeConnectionStatus;
  createdAt: string;
  updatedAt: string;
  deauthorizedAt: string | null;
};

type StripeOAuthStateRecord = {
  id: string;
  stateHash: string;
  programId: string;
  redirectUri: string;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
};

type StoreConnectionInput = {
  programId: string;
  stripeAccountId: string;
  livemode: boolean;
  scope: string;
};

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const sha256Hex = (value: string): `0x${string}` =>
  `0x${createHash("sha256").update(value).digest("hex")}`;

const requireStripeOAuthConfig = (config: StripeIntegrationConfig): void => {
  if (!config.connectClientId || !config.oauthRedirectUri) {
    throw new Error("Stripe Connect OAuth is not configured");
  }
  if (!config.oauthStateSecret) {
    throw new Error("STRIPE_OAUTH_STATE_SECRET is required for Stripe OAuth state");
  }
};

const stateHash = (state: string, secret: string): string =>
  createHmac("sha256", secret).update(state).digest("hex");

export class StripeOAuthService {
  public async reset(): Promise<void> {
    await prisma.stripeOAuthState.deleteMany();
    await prisma.stripeConnection.deleteMany();
  }

  public async createOAuthStart(
    config: StripeIntegrationConfig,
    programId: string
  ): Promise<StripeOAuthStartDto> {
    requireStripeOAuthConfig(config);

    const state = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();
    const redirectUri = config.oauthRedirectUri ?? "";
    await prisma.stripeOAuthState.create({
      data: {
        stateHash: stateHash(state, config.oauthStateSecret ?? ""),
        programId,
        redirectUri,
        expiresAt: new Date(expiresAt),
        consumedAt: null
      }
    });
    const authorizeUrl = new URL("https://connect.stripe.com/oauth/authorize");
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", config.connectClientId ?? "");
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", "read_write");
    authorizeUrl.searchParams.set("state", state);

    return {
      authorizeUrl: authorizeUrl.toString(),
      stateExpiresAt: expiresAt
    };
  }

  public consumeOAuthState(
    config: StripeIntegrationConfig,
    state: string
  ): Promise<StripeOAuthStateRecord | undefined> {
    if (!config.oauthStateSecret) {
      throw new Error("STRIPE_OAUTH_STATE_SECRET is required for Stripe OAuth state");
    }

    const hash = stateHash(state, config.oauthStateSecret);
    return prisma.$transaction(async (tx) => {
      const record = await tx.stripeOAuthState.findUnique({
        where: { stateHash: hash }
      });
      if (!record || record.consumedAt) {
        return undefined;
      }
      if (record.expiresAt.getTime() <= Date.now()) {
        return undefined;
      }

      const consumed = await tx.stripeOAuthState.update({
        where: { id: record.id },
        data: { consumedAt: new Date() }
      });

      return {
        id: consumed.id,
        stateHash: consumed.stateHash,
        programId: consumed.programId,
        redirectUri: consumed.redirectUri,
        expiresAt: consumed.expiresAt.toISOString(),
        consumedAt: consumed.consumedAt?.toISOString() ?? null,
        createdAt: consumed.createdAt.toISOString()
      };
    });
  }

  public async storeConnection(input: StoreConnectionInput): Promise<StripeConnectionRecord> {
    const accountSalt = randomBytes(16).toString("hex");
    const stripeAccountHash = sha256Hex(
      `stripe-account:${input.stripeAccountId}:${accountSalt}`
    );
    await prisma.stripeConnection.updateMany({
      where: {
        programId: input.programId,
        status: "connected"
      },
      data: {
        status: "deauthorized",
        deauthorizedAt: new Date()
      }
    });
    const connection = await prisma.stripeConnection.create({
      data: {
        programId: input.programId,
        stripeAccountId: input.stripeAccountId,
        stripeAccountHash,
        accountSalt,
        livemode: input.livemode,
        scope: input.scope,
        status: "connected"
      }
    });

    return {
      id: connection.id,
      programId: connection.programId,
      stripeAccountId: connection.stripeAccountId,
      stripeAccountHash: connection.stripeAccountHash as `0x${string}`,
      accountSalt: connection.accountSalt,
      livemode: connection.livemode,
      scope: connection.scope,
      status: connection.status as StripeConnectionStatus,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
      deauthorizedAt: connection.deauthorizedAt?.toISOString() ?? null
    };
  }

  public async getConnection(programId: string): Promise<StripeConnectionRecord | undefined> {
    const connection = await prisma.stripeConnection.findFirst({
      where: {
        programId,
        status: "connected"
      },
      orderBy: { createdAt: "desc" }
    });
    if (!connection) {
      return undefined;
    }
    return {
      id: connection.id,
      programId: connection.programId,
      stripeAccountId: connection.stripeAccountId,
      stripeAccountHash: connection.stripeAccountHash as `0x${string}`,
      accountSalt: connection.accountSalt,
      livemode: connection.livemode,
      scope: connection.scope,
      status: connection.status as StripeConnectionStatus,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
      deauthorizedAt: connection.deauthorizedAt?.toISOString() ?? null
    };
  }

  public async getStatus(programId: string): Promise<StripeConnectionStatusDto> {
    const connection = await prisma.stripeConnection.findFirst({
      where: { programId },
      orderBy: { createdAt: "desc" }
    });
    if (!connection) {
      const pendingState = await prisma.stripeOAuthState.findFirst({
        where: {
          programId,
          consumedAt: null,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: "desc" }
      });
      if (pendingState) {
        return {
          source: "stripe",
          mode: "test",
          programId,
          status: "pending",
          connectedAccountHash: null,
          livemode: null,
          scope: null,
          connectedAt: null,
          deauthorizedAt: null,
          updatedAt: pendingState.createdAt.toISOString()
        };
      }

      return {
        source: "stripe",
        mode: "test",
        programId,
        status: "disconnected",
        connectedAccountHash: null,
        livemode: null,
        scope: null,
        connectedAt: null,
        deauthorizedAt: null,
        updatedAt: null
      };
    }

    return {
      source: "stripe",
      mode: "test",
      programId,
      status: connection.status as StripeConnectionStatus,
      connectedAccountHash: connection.stripeAccountHash,
      livemode: connection.livemode,
      scope: connection.scope,
      connectedAt: connection.createdAt.toISOString(),
      deauthorizedAt: connection.deauthorizedAt?.toISOString() ?? null,
      updatedAt: connection.updatedAt.toISOString()
    };
  }

  public async disconnect(programId: string): Promise<StripeConnectionRecord | undefined> {
    const connection = await prisma.stripeConnection.findFirst({
      where: { programId, status: "connected" },
      orderBy: { createdAt: "desc" }
    });
    if (!connection) {
      return undefined;
    }

    const disconnected = await prisma.stripeConnection.update({
      where: { id: connection.id },
      data: {
        status: "deauthorized",
        deauthorizedAt: new Date()
      }
    });
    return {
      id: disconnected.id,
      programId: disconnected.programId,
      stripeAccountId: disconnected.stripeAccountId,
      stripeAccountHash: disconnected.stripeAccountHash as `0x${string}`,
      accountSalt: disconnected.accountSalt,
      livemode: disconnected.livemode,
      scope: disconnected.scope,
      status: "deauthorized",
      createdAt: disconnected.createdAt.toISOString(),
      updatedAt: disconnected.updatedAt.toISOString(),
      deauthorizedAt: disconnected.deauthorizedAt?.toISOString() ?? null
    };
  }
}

export const stripeOAuthService = new StripeOAuthService();
