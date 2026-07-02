export type MilestoneInputSummary = {
  milestoneRoot: string;
  nullifier: string;
  recipient: string;
  trancheAmount: string;
};

export const summarizeMilestoneInput = (packageJson: unknown): MilestoneInputSummary => {
  const publicInputs = (packageJson as { data?: { publicInputs?: Record<string, unknown> } })
    .data?.publicInputs;

  return {
    milestoneRoot: String(publicInputs?.["milestoneRoot"] ?? ""),
    nullifier: String(publicInputs?.["nullifier"] ?? ""),
    recipient: String(publicInputs?.["recipient"] ?? ""),
    trancheAmount: String(publicInputs?.["trancheAmount"] ?? "")
  };
};
