import { randomUUID } from "node:crypto";

import type { ContractEventDto } from "@pact/shared";

export type StellarRpcEvent = {
  contractId: string;
  eventType: string;
  txHash: string;
  ledger: number;
  payload: Record<string, unknown>;
};

export const mapRpcEventToContractEvent = (
  event: StellarRpcEvent,
  allowedContractIds: Set<string>,
  now = new Date().toISOString()
): ContractEventDto | null => {
  if (!allowedContractIds.has(event.contractId)) {
    return null;
  }

  return {
    id: randomUUID(),
    contractId: event.contractId,
    eventType: event.eventType,
    txHash: event.txHash,
    ledger: event.ledger,
    payload: event.payload,
    createdAt: now
  };
};
