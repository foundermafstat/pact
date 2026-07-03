CREATE TYPE "StartupProfileStatus" AS ENUM ('Draft', 'Submitted', 'Listed', 'Archived');
CREATE TYPE "InvestmentPoolType" AS ENUM ('Investment', 'Grant');
CREATE TYPE "InvestmentPoolStatus" AS ENUM ('Draft', 'Open', 'Closed', 'Archived');

CREATE TABLE "startup_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "founder_wallet" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "website" TEXT,
  "requested_amount" NUMERIC NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USDC',
  "funding_use" TEXT NOT NULL,
  "requirements" TEXT NOT NULL,
  "traction" TEXT NOT NULL,
  "status" "StartupProfileStatus" NOT NULL DEFAULT 'Submitted',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "startup_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investment_pools" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_wallet" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "pool_type" "InvestmentPoolType" NOT NULL,
  "thesis" TEXT NOT NULL,
  "target_industry" TEXT NOT NULL,
  "total_amount" NUMERIC NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USDC',
  "requirements" TEXT NOT NULL,
  "status" "InvestmentPoolStatus" NOT NULL DEFAULT 'Open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "investment_pools_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "startup_profiles_founder_wallet_created_at_idx"
  ON "startup_profiles"("founder_wallet", "created_at");
CREATE INDEX "startup_profiles_status_created_at_idx"
  ON "startup_profiles"("status", "created_at");
CREATE INDEX "investment_pools_owner_wallet_created_at_idx"
  ON "investment_pools"("owner_wallet", "created_at");
CREATE INDEX "investment_pools_status_pool_type_created_at_idx"
  ON "investment_pools"("status", "pool_type", "created_at");

ALTER TABLE "startup_profiles" ADD CONSTRAINT "startup_profiles_founder_wallet_fkey"
  FOREIGN KEY ("founder_wallet") REFERENCES "wallet_accounts"("wallet") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investment_pools" ADD CONSTRAINT "investment_pools_owner_wallet_fkey"
  FOREIGN KEY ("owner_wallet") REFERENCES "wallet_accounts"("wallet") ON DELETE CASCADE ON UPDATE CASCADE;
