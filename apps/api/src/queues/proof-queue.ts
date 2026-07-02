import { Queue, type ConnectionOptions } from "bullmq";

import { getRedisUrl, loadApiConfig } from "../config";

export const PROOF_QUEUE_NAME = "proof-jobs";

export type PingableQueueClient = {
  ping: () => Promise<string>;
};

export type QueueHealthSource = {
  client: Promise<PingableQueueClient>;
};

export const createRedisConnectionOptions = (
  redisUrl = getRedisUrl()
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

export const createProofQueue = (
  connection = createRedisConnectionOptions(),
  prefix = loadApiConfig().bullmqPrefix
): Queue =>
  new Queue(PROOF_QUEUE_NAME, {
    connection,
    prefix
  });

export const checkQueueConnection = async (
  queue: QueueHealthSource
): Promise<{ ok: boolean; ping: string }> => {
  const client = await queue.client;
  const ping = await client.ping();

  return {
    ok: ping.toUpperCase() === "PONG",
    ping
  };
};

let proofQueue: Queue | null = null;

export const getProofQueue = (): Queue => {
  proofQueue ??= createProofQueue();
  return proofQueue;
};

export const closeProofQueue = async (): Promise<void> => {
  if (!proofQueue) {
    return;
  }

  await proofQueue.close();
  proofQueue = null;
};
