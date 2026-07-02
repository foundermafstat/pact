import { sharedPackageName } from "@pact/shared";
import { sdkPackageName } from "@pact/sdk";

export const webAppName = "Pact Web";
export const webWorkspaceDependencies = [sharedPackageName, sdkPackageName] as const;
