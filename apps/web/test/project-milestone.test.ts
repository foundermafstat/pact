import { describe, expect, it } from "vitest";

import { summarizeMilestoneInput } from "../src/features/project/milestone-model";

describe("project milestone model", () => {
  it("summarizes only public milestone proof inputs", () => {
    const summary = summarizeMilestoneInput({
      data: {
        publicInputs: {
          milestoneRoot: "0xroot",
          nullifier: "0xnullifier",
          recipient: "GPROJECT",
          trancheAmount: "50000000"
        },
        privateInputs: {
          activeUsers: 735,
          pilotPartners: 4
        }
      }
    });

    expect(summary).toEqual({
      milestoneRoot: "0xroot",
      nullifier: "0xnullifier",
      recipient: "GPROJECT",
      trancheAmount: "50000000"
    });
    expect(JSON.stringify(summary)).not.toContain("activeUsers");
  });
});
