import "dotenv/config";

export type ProverMode = "mock" | "local";

export type ProverConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  redisUrl: string;
  bullmqPrefix: string;
  proverMode: ProverMode;
  workerEnabled: boolean;
};

const parsePort = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const loadProverConfig = (): ProverConfig => ({
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  host: process.env["PROVER_HOST"] ?? "127.0.0.1",
  port: parsePort(process.env["PROVER_PORT"], 4001),
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
  bullmqPrefix: process.env["BULLMQ_PREFIX"] ?? "pact",
  proverMode: (process.env["PROVER_MODE"] as ProverMode | undefined) ?? "mock",
  workerEnabled: process.env["PROVER_ENABLE_WORKER"] !== "false"
});
