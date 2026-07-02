import "dotenv/config";

export type IndexerConfig = {
  rpcUrl: string;
  pollIntervalMs: number;
  startLedger: number | null;
  cursorPath: string;
  contractIds: string[];
};

const readNumber = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const loadIndexerConfig = (): IndexerConfig => ({
  rpcUrl: process.env["STELLAR_RPC_URL"] ?? "https://soroban-testnet.stellar.org",
  pollIntervalMs: readNumber(process.env["INDEXER_POLL_INTERVAL_MS"]) ?? 5_000,
  startLedger: readNumber(process.env["INDEXER_START_LEDGER"]),
  cursorPath: process.env["INDEXER_CURSOR_PATH"] ?? "./.pact-indexer-cursor.json",
  contractIds: [
    process.env["POLICY_REGISTRY_CONTRACT_ID"],
    process.env["ROOT_REGISTRY_CONTRACT_ID"],
    process.env["NULLIFIER_REGISTRY_CONTRACT_ID"],
    process.env["VERIFIER_ADAPTER_CONTRACT_ID"],
    process.env["MILESTONE_ESCROW_CONTRACT_ID"]
  ].filter((value): value is string => Boolean(value))
});
