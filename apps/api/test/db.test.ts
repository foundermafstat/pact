import { describe, expect, it } from "vitest";

import { getTruncateSql } from "../src/db/test-utils";

describe("database helpers", () => {
  it("builds deterministic truncate SQL for test cleanup", () => {
    expect(getTruncateSql()).toBe(
      'TRUNCATE TABLE "auth_sessions", "auth_challenges", "investment_commitments", "startup_pool_applications", "investment_pools", "startup_profiles", "wallet_roles", "wallet_accounts", "contract_events", "proof_jobs", "stripe_webhook_events", "payment_revenue_snapshots", "stripe_connections", "stripe_oauth_states", "milestone_attestations", "credentials", "roots", "policies", "tranches", "programs" RESTART IDENTITY CASCADE;'
    );
  });
});
