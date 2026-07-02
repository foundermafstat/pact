import { loadIndexerConfig } from "./config";
import { PactEventIndexer } from "./indexer";

const config = loadIndexerConfig();

const indexer = new PactEventIndexer(
  config,
  {
    getEvents: async () => []
  },
  {
    saveEvents: async () => undefined
  }
);

await indexer.pollOnce();
