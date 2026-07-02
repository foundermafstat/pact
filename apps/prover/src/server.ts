import Fastify, { type FastifyInstance } from "fastify";

import { loadProverConfig, type ProverConfig } from "./config";

export type ProverHealthSource = {
  ping: () => Promise<string>;
};

export const buildProverServer = async (
  config: ProverConfig = loadProverConfig(),
  healthSource?: ProverHealthSource
): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: config.nodeEnv === "test" ? false : true
  });

  app.get("/health", async () => {
    const ping = healthSource ? await healthSource.ping() : "MOCK";
    return {
      ok: true,
      service: "pact-prover",
      mode: config.proverMode,
      queue: {
        name: "proof-jobs",
        ok: ping === "MOCK" || ping.toUpperCase() === "PONG",
        ping
      }
    };
  });

  return app;
};
