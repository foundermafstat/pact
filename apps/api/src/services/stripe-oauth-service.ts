import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";

import type {
  StripeConnectionStatusDto,
  StripeOAuthStartDto
} from "@pact/shared";

import type { StripeIntegrationConfig } from "../config";

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

const now = (): string => new Date().toISOString();

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
  private readonly states = new Map<string, StripeOAuthStateRecord>();
  private readonly connections = new Map<string, StripeConnectionRecord>();

  public reset(): void {
    this.states.clear();
    this.connections.clear();
  }

  public createOAuthStart(
    config: StripeIntegrationConfig,
    programId: string
  ): StripeOAuthStartDto {
    requireStripeOAuthConfig(config);

    const state = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();
    const redirectUri = config.oauthRedirectUri ?? "";
    const record: StripeOAuthStateRecord = {
      id: randomUUID(),
      stateHash: stateHash(state, config.oauthStateSecret ?? ""),
      programId,
      redirectUri,
      expiresAt,
      consumedAt: null,
      createdAt: now()
    };
    this.states.set(record.stateHash, record);

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
  ): StripeOAuthStateRecord | undefined {
    if (!config.oauthStateSecret) {
      throw new Error("STRIPE_OAUTH_STATE_SECRET is required for Stripe OAuth state");
    }

    const hash = stateHash(state, config.oauthStateSecret);
    const record = this.states.get(hash);
    if (!record || record.consumedAt) {
      return undefined;
    }
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      return undefined;
    }

    const consumed = {
      ...record,
      consumedAt: now()
    };
    this.states.set(hash, consumed);
    return consumed;
  }

  public storeConnection(input: StoreConnectionInput): StripeConnectionRecord {
    const accountSalt = randomBytes(16).toString("hex");
    const createdAt = now();
    const connection: StripeConnectionRecord = {
      id: randomUUID(),
      programId: input.programId,
      stripeAccountId: input.stripeAccountId,
      stripeAccountHash: sha256Hex(
        `stripe-account:${input.stripeAccountId}:${accountSalt}`
      ),
      accountSalt,
      livemode: input.livemode,
      scope: input.scope,
      status: "connected",
      createdAt,
      updatedAt: createdAt,
      deauthorizedAt: null
    };
    this.connections.set(input.programId, connection);
    return connection;
  }

  public getConnection(programId: string): StripeConnectionRecord | undefined {
    const connection = this.connections.get(programId);
    if (!connection || connection.status !== "connected") {
      return undefined;
    }
    return connection;
  }

  public getStatus(programId: string): StripeConnectionStatusDto {
    const connection = this.connections.get(programId);
    if (!connection) {
      const pendingState = [...this.states.values()].find(
        (state) =>
          state.programId === programId &&
          !state.consumedAt &&
          new Date(state.expiresAt).getTime() > Date.now()
      );
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
          updatedAt: pendingState.createdAt
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
      status: connection.status,
      connectedAccountHash: connection.stripeAccountHash,
      livemode: connection.livemode,
      scope: connection.scope,
      connectedAt: connection.createdAt,
      deauthorizedAt: connection.deauthorizedAt,
      updatedAt: connection.updatedAt
    };
  }

  public disconnect(programId: string): StripeConnectionRecord | undefined {
    const connection = this.connections.get(programId);
    if (!connection) {
      return undefined;
    }

    const disconnected = {
      ...connection,
      status: "deauthorized" as const,
      updatedAt: now(),
      deauthorizedAt: now()
    };
    this.connections.set(programId, disconnected);
    return disconnected;
  }
}

export const stripeOAuthService = new StripeOAuthService();
