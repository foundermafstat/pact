export const STELLAR_SECRET_KEY_ENV_KEYS = [
  "STELLAR_DEPLOYER_SECRET_KEY",
  "STELLAR_SPONSOR_SECRET_KEY",
  "STELLAR_PROJECT_SECRET_KEY",
  "STELLAR_ISSUER_SECRET_KEY",
  "STELLAR_ATTESTOR_SECRET_KEY"
] as const;

export type StellarSecretKeyEnvKey = (typeof STELLAR_SECRET_KEY_ENV_KEYS)[number];

export type StellarNetwork = "testnet" | "mainnet" | "local";

export type StellarConfig = {
  network: StellarNetwork;
  networkPassphrase: string;
  rpcUrl: string;
  horizonUrl: string;
  secretKeys: Record<StellarSecretKeyEnvKey, string | undefined>;
};

type EnvSource = Record<string, string | undefined>;

const DEFAULT_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

const readRequired = (env: EnvSource, key: string): string => {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required Stellar environment variable: ${key}`);
  }

  return value;
};

const normalizeNetwork = (value: string | undefined): StellarNetwork => {
  if (value === undefined || value === "testnet") {
    return "testnet";
  }

  if (value === "mainnet" || value === "local") {
    return value;
  }

  throw new Error(`Unsupported Stellar network: ${value}`);
};

export const loadStellarConfig = (env: EnvSource): StellarConfig => {
  const network = normalizeNetwork(env["STELLAR_NETWORK"]);
  const appEnv = env["APP_ENV"] ?? "local";

  const config: StellarConfig = {
    network,
    networkPassphrase:
      env["STELLAR_NETWORK_PASSPHRASE"] ?? DEFAULT_TESTNET_PASSPHRASE,
    rpcUrl: env["STELLAR_RPC_URL"] ?? "https://soroban-testnet.stellar.org",
    horizonUrl:
      env["STELLAR_HORIZON_URL"] ?? "https://horizon-testnet.stellar.org",
    secretKeys: {
      STELLAR_DEPLOYER_SECRET_KEY: env["STELLAR_DEPLOYER_SECRET_KEY"],
      STELLAR_SPONSOR_SECRET_KEY: env["STELLAR_SPONSOR_SECRET_KEY"],
      STELLAR_PROJECT_SECRET_KEY: env["STELLAR_PROJECT_SECRET_KEY"],
      STELLAR_ISSUER_SECRET_KEY: env["STELLAR_ISSUER_SECRET_KEY"],
      STELLAR_ATTESTOR_SECRET_KEY: env["STELLAR_ATTESTOR_SECRET_KEY"]
    }
  };

  if (appEnv !== "local" && appEnv !== "test") {
    readRequired(env, "STELLAR_NETWORK_PASSPHRASE");
    readRequired(env, "STELLAR_RPC_URL");
    readRequired(env, "STELLAR_HORIZON_URL");

    for (const key of STELLAR_SECRET_KEY_ENV_KEYS) {
      readRequired(env, key);
    }
  }

  return config;
};
