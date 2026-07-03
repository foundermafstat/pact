ALTER TYPE "ProofType" ADD VALUE IF NOT EXISTS 'PaymentRevenueThreshold';

CREATE TABLE "stripe_connections" (
  "id" UUID NOT NULL,
  "program_id" UUID NOT NULL,
  "stripe_account_id" TEXT NOT NULL,
  "stripe_account_hash" TEXT NOT NULL,
  "livemode" BOOLEAN NOT NULL,
  "scope" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deauthorized_at" TIMESTAMP(3),

  CONSTRAINT "stripe_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stripe_oauth_states" (
  "id" UUID NOT NULL,
  "state_hash" TEXT NOT NULL,
  "program_id" UUID NOT NULL,
  "redirect_uri" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stripe_oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_revenue_snapshots" (
  "id" UUID NOT NULL,
  "program_id" UUID NOT NULL,
  "stripe_connection_id" UUID NOT NULL,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL,
  "threshold_cents" DECIMAL(65,30) NOT NULL,
  "gross_paid_cents_encrypted" TEXT NOT NULL,
  "refund_cents_encrypted" TEXT NOT NULL,
  "fee_cents_encrypted" TEXT NOT NULL,
  "net_revenue_cents_encrypted" TEXT NOT NULL,
  "successful_charge_count_encrypted" TEXT NOT NULL,
  "snapshot_commitment" TEXT NOT NULL,
  "source_refs_commitment" TEXT NOT NULL,
  "raw_source_refs_encrypted" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_revenue_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stripe_webhook_events" (
  "id" UUID NOT NULL,
  "stripe_event_id" TEXT NOT NULL,
  "stripe_account_id" TEXT,
  "type" TEXT NOT NULL,
  "livemode" BOOLEAN NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),

  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stripe_oauth_states_state_hash_key" ON "stripe_oauth_states"("state_hash");
CREATE INDEX "stripe_oauth_states_program_id_expires_at_idx" ON "stripe_oauth_states"("program_id", "expires_at");
CREATE INDEX "stripe_connections_program_id_status_idx" ON "stripe_connections"("program_id", "status");
CREATE INDEX "payment_revenue_snapshots_program_id_generated_at_idx" ON "payment_revenue_snapshots"("program_id", "generated_at");
CREATE INDEX "payment_revenue_snapshots_stripe_connection_id_idx" ON "payment_revenue_snapshots"("stripe_connection_id");
CREATE UNIQUE INDEX "stripe_webhook_events_stripe_event_id_key" ON "stripe_webhook_events"("stripe_event_id");
CREATE INDEX "stripe_webhook_events_stripe_account_id_type_idx" ON "stripe_webhook_events"("stripe_account_id", "type");

ALTER TABLE "stripe_connections" ADD CONSTRAINT "stripe_connections_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stripe_oauth_states" ADD CONSTRAINT "stripe_oauth_states_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_revenue_snapshots" ADD CONSTRAINT "payment_revenue_snapshots_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_revenue_snapshots" ADD CONSTRAINT "payment_revenue_snapshots_stripe_connection_id_fkey"
  FOREIGN KEY ("stripe_connection_id") REFERENCES "stripe_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
