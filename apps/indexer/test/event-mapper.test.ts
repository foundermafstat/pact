import { describe, expect, it } from "vitest";

import { MemoryCursorStore } from "../src/cursor-store";
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
        cursorPath: ":memory:",
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

  it("resumes from stored cursor and avoids duplicate records", async () => {
    const saved: unknown[] = [];
    const cursorStore = new MemoryCursorStore();
    const config = {
      rpcUrl: "http://localhost:8000",
      pollIntervalMs: 1000,
      startLedger: 10,
      cursorPath: ":memory:",
      contractIds: ["escrow"]
    };
    const source = {
      getEvents: async (cursor: number | null) =>
        cursor !== null && cursor >= 12
          ? []
          : [
              {
                contractId: "escrow",
                eventType: "released",
                txHash: "tx-1",
                ledger: 12,
                payload: {}
              }
            ]
    };
    const sink = {
      saveEvents: async (events: unknown[]) => {
        saved.push(...events);
      }
    };

    const firstIndexer = await PactEventIndexer.create(
      config,
      source,
      sink,
      cursorStore
    );
    await firstIndexer.pollOnce();
    const resumedIndexer = await PactEventIndexer.create(
      config,
      source,
      sink,
      cursorStore
    );
    await resumedIndexer.pollOnce();

    expect(saved).toHaveLength(1);
    expect(resumedIndexer.getCursor()).toBe(12);
  });
});
