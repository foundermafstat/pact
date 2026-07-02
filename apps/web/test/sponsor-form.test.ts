import { describe, expect, it } from "vitest";

import {
  buildCreateProgramPayload,
  defaultCreateProgramForm
} from "../src/features/sponsor/form-model";

describe("sponsor create program form model", () => {
  it("builds API payload with a single milestone tranche", () => {
    expect(buildCreateProgramPayload(defaultCreateProgramForm)).toMatchObject({
      programKey: "PACT-DEMO-001",
      sponsorWallet: "GSPONSOR",
      projectWallet: "GPROJECT",
      tranches: [
        {
          milestoneKey: "M1",
          amount: "50000000",
          releaseToWallet: "GPROJECT"
        }
      ]
    });
  });
});
