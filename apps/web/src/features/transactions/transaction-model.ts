export type TransactionStatus =
  | "pending"
  | "simulating"
  | "submitted"
  | "confirmed"
  | "failed";

export const transactionStatusLabels: Record<TransactionStatus, string> = {
  pending: "Pending",
  simulating: "Simulating",
  submitted: "Submitted",
  confirmed: "Confirmed",
  failed: "Failed"
};

const errorMessages: Record<string, string> = {
  NullifierAlreadyUsed: "Proof was already used",
  WrongRecipient: "Recipient does not match the tranche",
  InactiveRoot: "Root is inactive or revoked",
  InvalidProof: "Proof does not match the public inputs",
  program_not_found: "Program was not found"
};

export const mapTransactionError = (code: string): string =>
  errorMessages[code] ?? "Transaction failed";
