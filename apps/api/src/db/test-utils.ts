import type { PrismaClient } from "@prisma/client";

const TABLES = [
  "auth_sessions",
  "auth_challenges",
  "investment_commitments",
  "startup_pool_applications",
  "investment_pools",
  "startup_profiles",
  "wallet_roles",
  "wallet_accounts",
  "contract_events",
  "proof_jobs",
  "stripe_webhook_events",
  "payment_revenue_snapshots",
  "stripe_connections",
  "stripe_oauth_states",
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
