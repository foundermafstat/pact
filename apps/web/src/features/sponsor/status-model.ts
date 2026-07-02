export type TrancheStatusRow = {
  milestoneKey: string;
  amount: string;
  status: "Locked" | "Ready" | "Released" | "Cancelled" | "Rejected";
  proofEvent: string;
  txHash: string | null;
};

export const sponsorStatusFixture: TrancheStatusRow[] = [
  {
    milestoneKey: "M1",
    amount: "50000000",
    status: "Locked",
    proofEvent: "Awaiting milestone proof",
    txHash: null
  },
  {
    milestoneKey: "M2",
    amount: "50000000",
    status: "Released",
    proofEvent: "MilestoneUnlock proof accepted",
    txHash: "0xabc123"
  }
];

export const getRejectedTrancheRow = (
  milestoneKey: string,
  reason: string
): TrancheStatusRow => ({
  milestoneKey,
  amount: "0",
  status: "Rejected",
  proofEvent: reason,
  txHash: null
});
