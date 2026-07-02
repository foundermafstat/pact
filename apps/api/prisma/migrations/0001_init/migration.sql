CREATE TYPE "ProgramStatus" AS ENUM ('Draft', 'Active', 'Paused', 'Cancelled', 'Completed');
CREATE TYPE "TrancheStatus" AS ENUM ('Locked', 'Ready', 'Released', 'Cancelled');
CREATE TYPE "PolicyType" AS ENUM ('Eligibility', 'Milestone', 'AssetAction');
CREATE TYPE "PolicyStatus" AS ENUM ('Draft', 'Active', 'Paused', 'Deprecated');
CREATE TYPE "RootType" AS ENUM ('Credential', 'MilestoneMetrics', 'Revocation');
CREATE TYPE "RootStatus" AS ENUM ('Pending', 'Active', 'Inactive', 'Expired');
CREATE TYPE "CredentialStatus" AS ENUM ('Active', 'Revoked', 'Expired');
CREATE TYPE "MilestoneAttestationStatus" AS ENUM ('Pending', 'Validated', 'Rejected', 'Published');
CREATE TYPE "ProofType" AS ENUM ('Eligibility', 'MilestoneUnlock');
CREATE TYPE "ProofJobStatus" AS ENUM ('Queued', 'Running', 'Succeeded', 'Failed');

CREATE TABLE "programs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "program_key" TEXT NOT NULL UNIQUE,
  "sponsor_wallet" TEXT NOT NULL,
  "project_wallet" TEXT NOT NULL,
  "asset_contract" TEXT NOT NULL,
  "total_amount" NUMERIC NOT NULL,
  "funded_amount" NUMERIC NOT NULL DEFAULT 0,
  "status" "ProgramStatus" NOT NULL,
  "eligibility_policy_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "tranches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "program_id" UUID NOT NULL REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "milestone_key" TEXT NOT NULL,
  "milestone_policy_id" TEXT NOT NULL,
  "amount" NUMERIC NOT NULL,
  "release_to_wallet" TEXT NOT NULL,
  "status" "TrancheStatus" NOT NULL,
  "released_at" TIMESTAMP(3),
  "tx_hash" TEXT,
  CONSTRAINT "tranches_program_id_milestone_key_key" UNIQUE ("program_id", "milestone_key")
);

CREATE TABLE "policies" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "policy_key" TEXT NOT NULL UNIQUE,
  "policy_hash" TEXT NOT NULL,
  "policy_type" "PolicyType" NOT NULL,
  "status" "PolicyStatus" NOT NULL,
  "raw_policy_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "roots" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "policy_id" UUID NOT NULL REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "root" TEXT NOT NULL,
  "root_type" "RootType" NOT NULL,
  "epoch" INTEGER NOT NULL,
  "status" "RootStatus" NOT NULL,
  "tx_hash" TEXT,
  "valid_from" TIMESTAMP(3) NOT NULL,
  "valid_until" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "credentials" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "credential_key" TEXT NOT NULL UNIQUE,
  "wallet" TEXT NOT NULL,
  "subject_commitment" TEXT NOT NULL,
  "issuer_id" TEXT NOT NULL,
  "credential_leaf" TEXT NOT NULL,
  "status" "CredentialStatus" NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "milestone_attestations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "program_id" UUID NOT NULL REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "milestone_key" TEXT NOT NULL,
  "milestone_root" TEXT,
  "private_metrics_encrypted" TEXT NOT NULL,
  "public_policy_hash" TEXT NOT NULL,
  "attestor_id" TEXT NOT NULL,
  "status" "MilestoneAttestationStatus" NOT NULL,
  "tx_hash" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "proof_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "proof_type" "ProofType" NOT NULL,
  "status" "ProofJobStatus" NOT NULL,
  "request_json" JSONB NOT NULL,
  "public_inputs_json" JSONB,
  "proof_json" JSONB,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3)
);

CREATE TABLE "contract_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contract_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "tx_hash" TEXT NOT NULL,
  "ledger" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_events_tx_hash_event_type_key" UNIQUE ("tx_hash", "event_type")
);

CREATE INDEX "roots_policy_id_root_type_status_idx" ON "roots"("policy_id", "root_type", "status");
CREATE INDEX "credentials_wallet_status_idx" ON "credentials"("wallet", "status");
CREATE INDEX "milestone_attestations_program_id_milestone_key_status_idx" ON "milestone_attestations"("program_id", "milestone_key", "status");
CREATE INDEX "proof_jobs_proof_type_status_idx" ON "proof_jobs"("proof_type", "status");
CREATE INDEX "contract_events_contract_id_ledger_idx" ON "contract_events"("contract_id", "ledger");
