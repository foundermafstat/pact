export type AttackCase = {
  key: string;
  label: string;
  expectedCode: string;
};

export const attackCases: AttackCase[] = [
  {
    key: "replay_milestone",
    label: "Replay milestone proof",
    expectedCode: "NullifierAlreadyUsed"
  },
  {
    key: "revoked_credential",
    label: "Revoked credential",
    expectedCode: "InactiveRoot"
  },
  {
    key: "cross_market_replay",
    label: "Cross-market replay",
    expectedCode: "InvalidProof"
  },
  {
    key: "wrong_recipient",
    label: "Wrong recipient",
    expectedCode: "WrongRecipient"
  }
];

export const getAttackExpectedCode = (key: string): string | null =>
  attackCases.find((attack) => attack.key === key)?.expectedCode ?? null;
