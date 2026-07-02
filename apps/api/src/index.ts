import { sharedPackageName } from "@pact/shared";
import { sdkPackageName } from "@pact/sdk";
import { zkPackageName } from "@pact/zk";

import { loadApiConfig } from "./config";
import { buildApiServer } from "./server";

export const apiAppName = "Pact API";
export const apiWorkspaceDependencies = [
  sharedPackageName,
  sdkPackageName,
  zkPackageName
] as const;

const start = async (): Promise<void> => {
  const config = loadApiConfig();
  const app = await buildApiServer(config);
  await app.listen({ host: config.host, port: config.port });
};

if (process.env["NODE_ENV"] !== "test") {
  start().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
