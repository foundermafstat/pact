import { describe, expect, it } from "vitest";

import { getTruncateSql } from "../src/db/test-utils";

describe("database helpers", () => {
  it("builds deterministic truncate SQL for test cleanup", () => {
    expect(getTruncateSql()).toBe(
      'TRUNCATE TABLE "contract_events", "proof_jobs", "milestone_attestations", "credentials", "roots", "policies", "tranches", "programs" RESTART IDENTITY CASCADE;'
    );
  });
});
