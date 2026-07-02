import { loadIndexerConfig } from "./config";
import { FileCursorStore } from "./cursor-store";
import { PactEventIndexer } from "./indexer";

const config = loadIndexerConfig();

const indexer = await PactEventIndexer.create(
  config,
  {
    getEvents: async () => []
  },
  {
    saveEvents: async () => undefined
  },
  new FileCursorStore(config.cursorPath)
);

await indexer.pollOnce();
