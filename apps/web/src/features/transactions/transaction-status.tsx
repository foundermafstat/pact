import {
  mapTransactionError,
  transactionStatusLabels,
  type TransactionStatus
} from "./transaction-model";

export function TransactionStatusBadge({
  status,
  errorCode
}: {
  status: TransactionStatus;
  errorCode?: string;
}) {
  return (
    <span className={`status-pill status-${status === "failed" ? "rejected" : status}`}>
      {status === "failed" && errorCode
        ? mapTransactionError(errorCode)
        : transactionStatusLabels[status]}
    </span>
  );
}
