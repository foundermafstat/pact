import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";

import { getDatabaseUrl } from "../config";

type GlobalWithPrisma = typeof globalThis & {
  pactPrisma?: PrismaClient;
};

export const createPrismaClient = (): PrismaClient => {
  const adapter = new PrismaPg({
    connectionString: getDatabaseUrl()
  });

  return new PrismaClient({
    adapter,
    log:
      process.env["NODE_ENV"] === "test"
        ? []
        : ["error", "warn"]
  });
};

const globalWithPrisma = globalThis as GlobalWithPrisma;

export const prisma =
  globalWithPrisma.pactPrisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalWithPrisma.pactPrisma = prisma;
}

export const registerPrismaShutdown = (app: FastifyInstance): void => {
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
};
