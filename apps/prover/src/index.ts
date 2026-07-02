import { loadProverConfig } from "./config";
import { buildProverServer } from "./server";
import { createProofWorker } from "./worker";

const config = loadProverConfig();
const app = await buildProverServer(config);
const worker = config.workerEnabled ? createProofWorker(config) : undefined;

const shutdown = async (): Promise<void> => {
  await worker?.close();
  await app.close();
};

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});
process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});

await app.listen({
  host: config.host,
  port: config.port
});
