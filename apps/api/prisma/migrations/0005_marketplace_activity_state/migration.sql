CREATE TYPE "PoolApplicationStatus" AS ENUM ('Submitted', 'Reviewed', 'Accepted', 'Rejected');
CREATE TYPE "InvestmentCommitmentStatus" AS ENUM ('Pending', 'Accepted', 'Declined');

ALTER TABLE "investment_pools"
  ADD COLUMN "stages" TEXT NOT NULL DEFAULT '';

CREATE TABLE "startup_pool_applications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "founder_wallet" TEXT NOT NULL,
  "startup_profile_id" UUID NOT NULL,
  "investment_pool_id" UUID NOT NULL,
  "note" TEXT NOT NULL,
  "status" "PoolApplicationStatus" NOT NULL DEFAULT 'Submitted',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "startup_pool_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investment_commitments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "investor_wallet" TEXT NOT NULL,
  "startup_profile_id" UUID NOT NULL,
  "amount" NUMERIC NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USDC',
  "note" TEXT NOT NULL,
  "status" "InvestmentCommitmentStatus" NOT NULL DEFAULT 'Pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "investment_commitments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "startup_pool_applications_startup_profile_id_investment_pool_id_key"
  ON "startup_pool_applications"("startup_profile_id", "investment_pool_id");
CREATE INDEX "startup_pool_applications_founder_wallet_created_at_idx"
  ON "startup_pool_applications"("founder_wallet", "created_at");
CREATE INDEX "startup_pool_applications_investment_pool_id_status_idx"
  ON "startup_pool_applications"("investment_pool_id", "status");
CREATE INDEX "investment_commitments_investor_wallet_created_at_idx"
  ON "investment_commitments"("investor_wallet", "created_at");
CREATE INDEX "investment_commitments_startup_profile_id_status_idx"
  ON "investment_commitments"("startup_profile_id", "status");

ALTER TABLE "startup_pool_applications" ADD CONSTRAINT "startup_pool_applications_founder_wallet_fkey"
  FOREIGN KEY ("founder_wallet") REFERENCES "wallet_accounts"("wallet") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "startup_pool_applications" ADD CONSTRAINT "startup_pool_applications_startup_profile_id_fkey"
  FOREIGN KEY ("startup_profile_id") REFERENCES "startup_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "startup_pool_applications" ADD CONSTRAINT "startup_pool_applications_investment_pool_id_fkey"
  FOREIGN KEY ("investment_pool_id") REFERENCES "investment_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investment_commitments" ADD CONSTRAINT "investment_commitments_investor_wallet_fkey"
  FOREIGN KEY ("investor_wallet") REFERENCES "wallet_accounts"("wallet") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investment_commitments" ADD CONSTRAINT "investment_commitments_startup_profile_id_fkey"
  FOREIGN KEY ("startup_profile_id") REFERENCES "startup_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
