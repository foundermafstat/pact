import { describe, expect, it } from "vitest";

import { mapRpcEventToContractEvent } from "../src/event-mapper";
import { PactEventIndexer } from "../src/indexer";

describe("Pact event indexer", () => {
  it("maps only configured Pact contract events", () => {
    const mapped = mapRpcEventToContractEvent(
      {
        contractId: "escrow",
        eventType: "released",
        txHash: "tx-1",
        ledger: 100,
        payload: {
          programId: "program-1"
        }
      },
      new Set(["escrow"]),
      "2026-01-01T00:00:00.000Z"
    );

    expect(mapped).toMatchObject({
      contractId: "escrow",
      eventType: "released",
      txHash: "tx-1",
      ledger: 100,
      payload: {
        programId: "program-1"
      },
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    expect(
      mapRpcEventToContractEvent(
        {
          contractId: "other",
          eventType: "released",
          txHash: "tx-2",
          ledger: 101,
          payload: {}
        },
        new Set(["escrow"])
      )
    ).toBeNull();
  });

  it("polls, saves mapped events, and advances cursor", async () => {
    const saved: unknown[] = [];
    const indexer = new PactEventIndexer(
      {
        rpcUrl: "http://localhost:8000",
        pollIntervalMs: 1000,
        startLedger: 10,
        contractIds: ["escrow"]
      },
      {
        getEvents: async (cursor) => [
          {
            contractId: "escrow",
            eventType: "mile_ok",
            txHash: `tx-${cursor}`,
            ledger: 12,
            payload: {}
          }
        ]
      },
      {
        saveEvents: async (events) => {
          saved.push(...events);
        }
      }
    );

    const events = await indexer.pollOnce();

    expect(events).toHaveLength(1);
    expect(saved).toHaveLength(1);
    expect(indexer.getCursor()).toBe(12);
  });
});
