import { describe, expect, it } from "vitest";

import { attackCases, getAttackExpectedCode } from "../src/features/attacks/attack-model";

describe("attack panel model", () => {
  it("maps attacks to expected rejection codes", () => {
    expect(attackCases).toHaveLength(4);
    expect(getAttackExpectedCode("replay_milestone")).toBe("NullifierAlreadyUsed");
    expect(getAttackExpectedCode("revoked_credential")).toBe("InactiveRoot");
    expect(getAttackExpectedCode("cross_market_replay")).toBe("InvalidProof");
    expect(getAttackExpectedCode("wrong_recipient")).toBe("WrongRecipient");
  });
});
