import { sharedPackageName } from "@pact/shared";
import { sdkPackageName } from "@pact/sdk";
import { zkPackageName } from "@pact/zk";

export const apiAppName = "Pact API";
export const apiWorkspaceDependencies = [
  sharedPackageName,
  sdkPackageName,
  zkPackageName
] as const;
