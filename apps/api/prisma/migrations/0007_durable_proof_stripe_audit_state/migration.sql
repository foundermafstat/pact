ALTER TABLE "credentials"
  ADD COLUMN "private_package_encrypted" TEXT;

ALTER TABLE "milestone_attestations"
  ADD COLUMN "private_package_encrypted" TEXT;

ALTER TABLE "stripe_connections"
  ADD COLUMN "account_salt" TEXT NOT NULL DEFAULT '';

ALTER TABLE "payment_revenue_snapshots"
  ADD COLUMN "connected_account_hash" TEXT NOT NULL DEFAULT '0x0000000000000000000000000000000000000000000000000000000000000000',
  ADD COLUMN "policy_hash" TEXT NOT NULL DEFAULT '0x0000000000000000000000000000000000000000000000000000000000000000',
  ADD COLUMN "connected_account_id_encrypted" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "connector_secret_encrypted" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "snapshot_salt_encrypted" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "source_ref_salts_encrypted" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "threshold_passed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "contract_events"
  ADD COLUMN "program_id" UUID;

CREATE INDEX "contract_events_program_id_created_at_idx"
  ON "contract_events"("program_id", "created_at");

ALTER TABLE "contract_events"
  ADD CONSTRAINT "contract_events_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "programs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
