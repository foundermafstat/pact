import { config as loadDotenv } from "dotenv";

loadDotenv({ quiet: true });

export type ApiConfig = {
  nodeEnv: string;
  appEnv: string;
  host: string;
  port: number;
  corsOrigin: string;
  cookieSecure?: boolean;
  redisUrl: string;
  bullmqPrefix: string;
};

export type StripeIntegrationConfig = {
  apiVersion: string;
  testMode: boolean;
  secretKey: string | undefined;
  connectClientId: string | undefined;
  oauthRedirectUri: string | undefined;
  webhookSecret: string | undefined;
  oauthStateSecret: string | undefined;
  paymentProofEncryptionKey: string | undefined;
  publicApiBaseUrl: string;
  webPublicApiBaseUrl: string;
  proverUrl: string;
};

const readNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue)) {
    throw new Error(`Invalid numeric environment value: ${value}`);
  }

  return parsedValue;
};

export const loadApiConfig = (): ApiConfig => ({
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  appEnv: process.env["APP_ENV"] ?? "local",
  host: process.env["API_HOST"] ?? "127.0.0.1",
  port: readNumber(process.env["API_PORT"], 4000),
  corsOrigin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
  cookieSecure: process.env["COOKIE_SECURE"] === "true",
  redisUrl: getRedisUrl(),
  bullmqPrefix: process.env["BULLMQ_PREFIX"] ?? "pact"
});

export const getDatabaseUrl = (): string =>
  process.env["DATABASE_URL"] ?? "postgresql://pact:pact@localhost:5432/pact";

export const getRedisUrl = (): string =>
  process.env["REDIS_URL"] ?? "redis://localhost:6379";

export const loadStripeIntegrationConfig = (): StripeIntegrationConfig => ({
  apiVersion: process.env["STRIPE_API_VERSION"] ?? "2026-02-25.clover",
  testMode: process.env["STRIPE_TEST_MODE"] !== "false",
  secretKey: process.env["STRIPE_SECRET_KEY"],
  connectClientId: process.env["STRIPE_CONNECT_CLIENT_ID"],
  oauthRedirectUri:
    process.env["STRIPE_OAUTH_REDIRECT_URI"] ??
    "http://127.0.0.1:4000/api/integrations/stripe/oauth/callback",
  webhookSecret: process.env["STRIPE_WEBHOOK_SECRET"],
  oauthStateSecret: process.env["STRIPE_OAUTH_STATE_SECRET"],
  paymentProofEncryptionKey: process.env["PAYMENT_PROOF_ENCRYPTION_KEY"],
  publicApiBaseUrl: process.env["PUBLIC_API_BASE_URL"] ?? "http://127.0.0.1:4000",
  webPublicApiBaseUrl:
    process.env["WEB_PUBLIC_API_BASE_URL"] ?? "http://127.0.0.1:4000",
  proverUrl: process.env["PROVER_URL"] ?? "http://127.0.0.1:4001"
});
