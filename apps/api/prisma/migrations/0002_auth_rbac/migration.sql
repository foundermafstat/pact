CREATE TYPE "AccountRole" AS ENUM (
  'Sponsor',
  'Project',
  'Investor',
  'Issuer',
  'Attestor',
  'Observer',
  'Admin'
);

CREATE TABLE "wallet_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "wallet" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "wallet_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallet_roles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "wallet_account_id" UUID NOT NULL,
  "role" "AccountRole" NOT NULL,
  "granted_by_wallet" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "wallet_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_challenges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "wallet_account_id" UUID,
  "wallet" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "wallet_provider" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "wallet_account_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "wallet_provider" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallet_accounts_wallet_key" ON "wallet_accounts"("wallet");
CREATE UNIQUE INDEX "wallet_roles_wallet_account_id_role_key" ON "wallet_roles"("wallet_account_id", "role");
CREATE INDEX "wallet_roles_role_idx" ON "wallet_roles"("role");
CREATE UNIQUE INDEX "auth_challenges_nonce_key" ON "auth_challenges"("nonce");
CREATE INDEX "auth_challenges_wallet_expires_at_idx" ON "auth_challenges"("wallet", "expires_at");
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");
CREATE INDEX "auth_sessions_wallet_account_id_expires_at_idx" ON "auth_sessions"("wallet_account_id", "expires_at");

ALTER TABLE "wallet_roles"
  ADD CONSTRAINT "wallet_roles_wallet_account_id_fkey"
  FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_challenges"
  ADD CONSTRAINT "auth_challenges_wallet_account_id_fkey"
  FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_wallet_account_id_fkey"
  FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
