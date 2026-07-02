import type { RootDto } from "@pact/shared";

export type SafeRootSummary = {
  root: string;
  status: string;
  txHash: string | null;
};

export const toSafeRootSummary = (root: RootDto): SafeRootSummary => ({
  root: root.root,
  status: root.status,
  txHash: root.txHash
});
