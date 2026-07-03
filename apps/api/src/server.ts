import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import { loadApiConfig, type ApiConfig } from "./config";
import { registerPrismaShutdown } from "./db/client";
import { registerErrorHandler } from "./errors";
import { registerApiRoutes } from "./routes";

const localHostAliases = (origin: string): string[] => [
  origin,
  origin.replace("127.0.0.1", "localhost"),
  origin.replace("localhost", "127.0.0.1")
];

const parseCorsOrigins = (origin: string): string[] =>
  [...new Set(origin.split(",").flatMap((item) => localHostAliases(item.trim())).filter(Boolean))];

export const buildApiServer = async (
  config: ApiConfig = loadApiConfig()
): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: config.nodeEnv === "test" ? false : true
  });

  await app.register(cors, {
    origin: parseCorsOrigins(config.corsOrigin),
    credentials: true
  });

  registerErrorHandler(app);
  registerPrismaShutdown(app);

  app.get("/health", async () => ({
    ok: true,
    service: "pact-api",
    environment: config.appEnv
  }));

  await registerApiRoutes(app);

  return app;
};
