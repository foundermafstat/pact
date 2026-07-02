import { sharedPackageName } from "@pact/shared";

export const sdkPackageName = "@pact/sdk";
export const sdkSharedDependency = sharedPackageName;
export {
  STELLAR_SECRET_KEY_ENV_KEYS,
  loadStellarConfig
} from "./stellar/config";
export type {
  StellarConfig,
  StellarNetwork,
  StellarSecretKeyEnvKey
} from "./stellar/config";
