import { describe, expect, it } from "vitest";
import {
  EligibilityPrivateInputSchema,
  EligibilityPublicInputSchema,
  MilestonePrivateInputSchema,
  MilestonePublicInputSchema
} from "@pact/shared";

import {
  belowThresholdMilestoneFixture,
  expiredEligibilityFixture,
  sanctionsFalseEligibilityFixture,
  validEligibilityFixture,
  validMilestoneFixture,
  wrongRecipientMilestoneFixture
} from "../src/fixtures";

describe("ZK fixtures", () => {
  it("validates eligibility fixtures against shared schemas", () => {
    for (const fixture of [
      validEligibilityFixture,
      expiredEligibilityFixture,
      sanctionsFalseEligibilityFixture
    ]) {
      expect(() => EligibilityPrivateInputSchema.parse(fixture.privateInput)).not.toThrow();
      expect(() => EligibilityPublicInputSchema.parse(fixture.publicInput)).not.toThrow();
    }
  });

  it("validates milestone fixtures against shared schemas", () => {
    for (const fixture of [
      validMilestoneFixture,
      belowThresholdMilestoneFixture,
      wrongRecipientMilestoneFixture
    ]) {
      expect(() => MilestonePrivateInputSchema.parse(fixture.privateInput)).not.toThrow();
      expect(() => MilestonePublicInputSchema.parse(fixture.publicInput)).not.toThrow();
    }
  });
});
