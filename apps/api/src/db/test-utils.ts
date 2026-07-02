import type { PrismaClient } from "@prisma/client";

const TABLES = [
  "contract_events",
  "proof_jobs",
  "milestone_attestations",
  "credentials",
  "roots",
  "policies",
  "tranches",
  "programs"
] as const;

export const getTruncateSql = (): string =>
  `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE;`;

export const resetTestDatabase = async (client: PrismaClient): Promise<void> => {
  await client.$executeRawUnsafe(getTruncateSql());
};
