import { describe, expect, it } from "vitest";

import {
  auditTimelineFixture,
  toPublicAuditText
} from "../src/features/audit/audit-model";

describe("public audit view model", () => {
  it("contains required public events without private fields", () => {
    const text = toPublicAuditText(auditTimelineFixture);

    expect(text).toContain("Program created");
    expect(text).toContain("Escrow funded");
    expect(text).toContain("Policy activated");
    expect(text).toContain("Root activated");
    expect(text).toContain("Eligibility verified");
    expect(text).toContain("Milestone verified");
    expect(text).toContain("Tranche released");
    expect(text).not.toMatch(/activeUsers|pilotPartners|credential_secret|project_secret/);
  });
});
