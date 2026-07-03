ALTER TABLE "startup_pool_applications"
  ADD COLUMN "program_id" UUID;

ALTER TABLE "tranches"
  ADD COLUMN "mrr_threshold_cents" NUMERIC,
  ADD COLUMN "mrr_currency" TEXT,
  ADD COLUMN "mrr_period_start" TIMESTAMP(3),
  ADD COLUMN "mrr_period_end" TIMESTAMP(3);

CREATE UNIQUE INDEX "startup_pool_applications_program_id_key"
  ON "startup_pool_applications"("program_id");

ALTER TABLE "startup_pool_applications" ADD CONSTRAINT "startup_pool_applications_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
