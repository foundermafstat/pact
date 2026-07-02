import { describe, expect, it } from "vitest";

import {
  assertPublicText,
  stripPrivateFields
} from "../src/features/privacy/privacy-guards";

describe("frontend privacy guards", () => {
  it("strips private fields from public payloads", () => {
    expect(
      stripPrivateFields({
        programId: "program-1",
        activeUsers: 735,
        credential_secret: "secret",
        project_secret: "secret",
        releasedAmount: "1000"
      })
    ).toEqual({
      programId: "program-1",
      releasedAmount: "1000"
    });
  });

  it("throws when private field names are rendered", () => {
    expect(() => assertPublicText("credential_secret")).toThrow(
      "Private field leaked"
    );
  });
});
