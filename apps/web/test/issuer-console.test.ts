import { describe, expect, it } from "vitest";

import { toSafeRootSummary } from "../src/features/issuer/issuer-model";

describe("issuer console model", () => {
  it("exposes safe root fields only", () => {
    const summary = toSafeRootSummary({
      id: "11111111-1111-4111-8111-111111111111",
      policyId: "22222222-2222-4222-8222-222222222222",
      root: "0xabc",
      rootType: "Credential",
      epoch: 1,
      status: "Active",
      txHash: "0xtx",
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2026-02-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    expect(summary).toEqual({
      root: "0xabc",
      status: "Active",
      txHash: "0xtx"
    });
    expect(JSON.stringify(summary)).not.toContain("credentialSecret");
  });
});
