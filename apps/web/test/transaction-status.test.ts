import { describe, expect, it } from "vitest";

import {
  mapTransactionError,
  transactionStatusLabels
} from "../src/features/transactions/transaction-model";

describe("transaction status model", () => {
  it("renders lifecycle labels and maps errors", () => {
    expect(transactionStatusLabels.pending).toBe("Pending");
    expect(transactionStatusLabels.simulating).toBe("Simulating");
    expect(transactionStatusLabels.submitted).toBe("Submitted");
    expect(transactionStatusLabels.confirmed).toBe("Confirmed");
    expect(transactionStatusLabels.failed).toBe("Failed");
    expect(mapTransactionError("WrongRecipient")).toBe(
      "Recipient does not match the tranche"
    );
    expect(mapTransactionError("unknown")).toBe("Transaction failed");
  });
});
