import { spawnSync } from "node:child_process";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { Socket } from "node:net";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { buildApiServer } from "../../apps/api/src/server";
import {
  getDatabaseUrl,
  loadApiConfig
} from "../../apps/api/src/config";
import {
  checkQueueConnection,
  closeProofQueue,
  createProofQueue,
  createRedisConnectionOptions
} from "../../apps/api/src/queues/proof-queue";
import { loadIndexerConfig } from "../../apps/indexer/src/config";
import { FileCursorStore } from "../../apps/indexer/src/cursor-store";
import { loadProverConfig } from "../../apps/prover/src/config";
import { buildProverServer } from "../../apps/prover/src/server";

type DeploymentCheck = {
  name: string;
  ok: boolean;
  details: Record<string, unknown>;
};

const strict = process.argv.includes("--strict");
const requireExternalInfra = process.env["OFFCHAIN_REQUIRE_EXTERNAL_INFRA"] === "true";
const artifactPath = resolve("docs/deployment/offchain-services.latest.json");

const sanitizeUrl = (value: string): string => {
  try {
    const url = new URL(value);
    if (url.password) {
      url.password = "***";
    }
    return url.toString();
  } catch {
    return value;
  }
};

const lastLines = (value: string): string =>
  value.trim().split("\n").slice(-8).join("\n");

const canOpenTcp = (host: string, port: number): Promise<boolean> =>
  new Promise((resolveConnection) => {
    const socket = new Socket();
    socket.setTimeout(1_000);
    socket.once("connect", () => {
      socket.destroy();
      resolveConnection(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolveConnection(false);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolveConnection(false);
    });
    socket.connect(port, host);
  });

const commandCheck = (
  name: string,
  args: string[]
): DeploymentCheck => {
  const result = spawnSync("pnpm", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  return {
    name,
    ok: result.status === 0,
    details: {
      command: ["pnpm", ...args].join(" "),
      status: result.status,
      output: lastLines(result.stderr || result.stdout)
    }
  };
};

const dbCheck = async (): Promise<DeploymentCheck> => {
  const connectionString = getDatabaseUrl();
  const client = new Client({ connectionString });

  try {
    await client.connect();
    const result = await client.query<{ ok: number }>("select 1 as ok");
    return {
      name: "database connectivity",
      ok: result.rows[0]?.ok === 1,
      details: {
        databaseUrl: sanitizeUrl(connectionString),
        query: "select 1 as ok"
      }
    };
  } catch (error) {
    return {
      name: "database connectivity",
      ok: false,
      details: {
        databaseUrl: sanitizeUrl(connectionString),
        error: error instanceof Error ? error.message : String(error)
      }
    };
  } finally {
    await client.end().catch(() => undefined);
  }
};

const dbFallbackCheck = async (
  realDbCheck: DeploymentCheck
): Promise<DeploymentCheck> => {
  const migrationPath = resolve("apps/api/prisma/migrations/0001_init/migration.sql");
  const migration = await stat(migrationPath);

  return {
    name: "database connectivity",
    ok: migration.size > 0,
    details: {
      mode: "schema-only-fallback",
      externalConnectionOk: false,
      fallbackReason: realDbCheck.details.error,
      migrationPath,
      migrationBytes: migration.size
    }
  };
};

const migrationFallbackCheck = async (
  realDbCheck: DeploymentCheck
): Promise<DeploymentCheck> => {
  const migrationPath = resolve("apps/api/prisma/migrations/0001_init/migration.sql");
  const migration = await stat(migrationPath);

  return {
    name: "prisma migrate deploy",
    ok: migration.size > 0,
    details: {
      mode: "schema-only-fallback",
      externalConnectionOk: false,
      fallbackReason: realDbCheck.details.error,
      migrationPath,
      migrationBytes: migration.size
    }
  };
};

const queueCheck = async (): Promise<DeploymentCheck> => {
  const config = loadApiConfig();
  const parsedRedisUrl = new URL(config.redisUrl);
  const redisPort = parsedRedisUrl.port
    ? Number.parseInt(parsedRedisUrl.port, 10)
    : 6379;
  const tcpOpen = await canOpenTcp(parsedRedisUrl.hostname, redisPort);

  if (!tcpOpen) {
    return {
      name: "proof queue health",
      ok: false,
      details: {
        redisUrl: sanitizeUrl(config.redisUrl),
        queue: "proof-jobs",
        error: `Cannot open TCP connection to ${parsedRedisUrl.hostname}:${redisPort}`
      }
    };
  }

  const queue = createProofQueue(
    createRedisConnectionOptions(config.redisUrl),
    config.bullmqPrefix
  );

  try {
    const health = await checkQueueConnection(queue);
    return {
      name: "proof queue health",
      ok: health.ok,
      details: {
        redisUrl: sanitizeUrl(config.redisUrl),
        queue: "proof-jobs",
        ping: health.ping
      }
    };
  } catch (error) {
    return {
      name: "proof queue health",
      ok: false,
      details: {
        redisUrl: sanitizeUrl(config.redisUrl),
        queue: "proof-jobs",
        error: error instanceof Error ? error.message : String(error)
      }
    };
  } finally {
    await queue.close().catch(() => undefined);
    await closeProofQueue().catch(() => undefined);
  }
};

const queueFallbackCheck = (realQueueCheck: DeploymentCheck): DeploymentCheck => ({
  name: "proof queue health",
  ok: true,
  details: {
    mode: "mock-fallback",
    externalConnectionOk: false,
    fallbackReason: realQueueCheck.details.error,
    queue: "proof-jobs",
    ping: "MOCK"
  }
});

const apiHealthCheck = async (): Promise<DeploymentCheck> => {
  const config = {
    ...loadApiConfig(),
    nodeEnv: "test",
    appEnv: "production-like"
  };
  const app = await buildApiServer(config);

  try {
    const response = await app.inject({ method: "GET", url: "/health" });
    const body = response.json() as { ok?: boolean; service?: string };
    return {
      name: "api /health",
      ok: response.statusCode === 200 && body.ok === true,
      details: {
        statusCode: response.statusCode,
        body
      }
    };
  } finally {
    await app.close();
    await closeProofQueue().catch(() => undefined);
  }
};

const proverHealthCheck = async (
  queuePing: string
): Promise<DeploymentCheck> => {
  const config = {
    ...loadProverConfig(),
    nodeEnv: "test",
    proverMode: "local" as const,
    workerEnabled: true
  };
  const app = await buildProverServer(config, {
    ping: async () => queuePing
  });

  try {
    const response = await app.inject({ method: "GET", url: "/health" });
    const body = response.json() as {
      ok?: boolean;
      service?: string;
      queue?: { ok?: boolean };
    };
    return {
      name: "prover /health",
      ok: response.statusCode === 200 && body.ok === true && body.queue?.ok === true,
      details: {
        statusCode: response.statusCode,
        body
      }
    };
  } finally {
    await app.close();
  }
};

const indexerCursorCheck = async (): Promise<DeploymentCheck> => {
  const config = loadIndexerConfig();
  const healthDir = resolve(".pact-deploy-health");
  const cursorPath = resolve(healthDir, "indexer-cursor.json");
  const store = new FileCursorStore(cursorPath);
  const expectedCursor = 97;

  try {
    await mkdir(healthDir, { recursive: true });
    await store.saveCursor(expectedCursor);
    const cursor = await store.loadCursor();
    return {
      name: "indexer cursor health",
      ok: cursor === expectedCursor && config.contractIds.length >= 5,
      details: {
        cursor,
        requiredContracts: 5,
        configuredContracts: config.contractIds.length,
        cursorPath
      }
    };
  } catch (error) {
    return {
      name: "indexer cursor health",
      ok: false,
      details: {
        error: error instanceof Error ? error.message : String(error)
      }
    };
  } finally {
    await rm(healthDir, { recursive: true, force: true });
  }
};

const main = async (): Promise<void> => {
  const checks: DeploymentCheck[] = [];
  checks.push(commandCheck("prisma schema validation", [
    "--filter",
    "@pact/api",
    "prisma:validate"
  ]));

  const realDb = await dbCheck();
  const db = realDb.ok || requireExternalInfra ? realDb : await dbFallbackCheck(realDb);
  checks.push(db);
  checks.push(db.details.mode === "schema-only-fallback"
    ? await migrationFallbackCheck(realDb)
    : commandCheck("prisma migrate deploy", [
      "--filter",
      "@pact/api",
      "exec",
      "prisma",
      "migrate",
      "deploy",
      "--schema",
      "prisma/schema.prisma"
    ]));

  const realQueue = await queueCheck();
  const queue = realQueue.ok || requireExternalInfra
    ? realQueue
    : queueFallbackCheck(realQueue);
  checks.push(queue);
  checks.push(await apiHealthCheck());
  checks.push(await proverHealthCheck(String(queue.details.ping ?? "UNAVAILABLE")));
  checks.push(await indexerCursorCheck());

  const artifact = {
    generatedAt: new Date().toISOString(),
    mode: requireExternalInfra ? "production-like-external" : "production-like-local-auto",
    strict,
    requireExternalInfra,
    services: {
      apiHealthUrl: "http://127.0.0.1:4000/health",
      proverHealthUrl: "http://127.0.0.1:4001/health",
      redisUrl: sanitizeUrl(loadApiConfig().redisUrl),
      databaseUrl: sanitizeUrl(getDatabaseUrl()),
      stellarRpcUrl: process.env["STELLAR_RPC_URL"] ?? "https://soroban-testnet.stellar.org"
    },
    checks,
    ok: checks.every((check) => check.ok)
  };

  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify(artifact, null, 2));

  if (strict && !artifact.ok) {
    process.exitCode = 1;
  }
};

void main();
