import type { ContractEventDto } from "@pact/shared";

import type { IndexerConfig } from "./config";
import type { CursorStore } from "./cursor-store";
import {
  mapRpcEventToContractEvent,
  type StellarRpcEvent
} from "./event-mapper";

export type EventSource = {
  getEvents: (cursor: number | null) => Promise<StellarRpcEvent[]>;
};

export type EventSink = {
  saveEvents: (events: ContractEventDto[]) => Promise<void>;
};

export class PactEventIndexer {
  private cursor: number | null;
  private readonly allowedContractIds: Set<string>;

  public constructor(
    config: IndexerConfig,
    private readonly source: EventSource,
    private readonly sink: EventSink,
    private readonly cursorStore?: CursorStore,
    initialCursor: number | null = config.startLedger
  ) {
    this.cursor = initialCursor;
    this.allowedContractIds = new Set(config.contractIds);
  }

  public static async create(
    config: IndexerConfig,
    source: EventSource,
    sink: EventSink,
    cursorStore?: CursorStore
  ): Promise<PactEventIndexer> {
    const storedCursor = cursorStore ? await cursorStore.loadCursor() : null;
    return new PactEventIndexer(
      config,
      source,
      sink,
      cursorStore,
      storedCursor ?? config.startLedger
    );
  }

  public getCursor(): number | null {
    return this.cursor;
  }

  public async pollOnce(): Promise<ContractEventDto[]> {
    const rpcEvents = await this.source.getEvents(this.cursor);
    const mappedEvents = rpcEvents.flatMap((event) => {
      const mapped = mapRpcEventToContractEvent(event, this.allowedContractIds);
      return mapped ? [mapped] : [];
    });

    if (mappedEvents.length > 0) {
      await this.sink.saveEvents(mappedEvents);
      this.cursor = Math.max(...mappedEvents.map((event) => event.ledger));
      await this.cursorStore?.saveCursor(this.cursor);
    }

    return mappedEvents;
  }
}
