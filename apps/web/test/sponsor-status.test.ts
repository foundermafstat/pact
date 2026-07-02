import { describe, expect, it } from "vitest";

import {
  getRejectedTrancheRow,
  sponsorStatusFixture
} from "../src/features/sponsor/status-model";

describe("sponsor milestone status model", () => {
  it("renders fixture statuses and rejection state", () => {
    expect(sponsorStatusFixture.map((row) => row.status)).toEqual([
      "Locked",
      "Released"
    ]);
    expect(getRejectedTrancheRow("M3", "wrong recipient")).toMatchObject({
      milestoneKey: "M3",
      status: "Rejected",
      proofEvent: "wrong recipient"
    });
  });
});
