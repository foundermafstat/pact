import { Worker, type ConnectionOptions } from "bullmq";

import type { ProverConfig } from "./config";
import {
  processProofJob,
  PROOF_QUEUE_NAME,
  type ProofJobPayload
} from "./proof-processor";

export const createRedisConnectionOptions = (
  redisUrl: string
): ConnectionOptions => {
  const parsedUrl = new URL(redisUrl);
  const options: ConnectionOptions = {
    host: parsedUrl.hostname,
    port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 6379,
    lazyConnect: true,
    maxRetriesPerRequest: null
  };

  if (parsedUrl.username) {
    options.username = decodeURIComponent(parsedUrl.username);
  }

  if (parsedUrl.password) {
    options.password = decodeURIComponent(parsedUrl.password);
  }

  if (parsedUrl.pathname.length > 1) {
    options.db = Number.parseInt(parsedUrl.pathname.slice(1), 10);
  }

  return options;
};

export const createProofWorker = (config: ProverConfig): Worker<ProofJobPayload> =>
  new Worker<ProofJobPayload>(
    PROOF_QUEUE_NAME,
    async (job) => processProofJob(job.data, config),
    {
      connection: createRedisConnectionOptions(config.redisUrl),
      prefix: config.bullmqPrefix
    }
  );
