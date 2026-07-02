import { sharedPackageName } from "@pact/shared";

export const sdkPackageName = "@pact/sdk";
export const sdkSharedDependency = sharedPackageName;
export {
  MilestoneEscrowClient,
  MissingContractIdError,
  NullifierRegistryClient,
  PolicyRegistryClient,
  RootRegistryClient,
  VerifierAdapterClient,
  assertContractId
} from "./contracts";
export type {
  ContractInvocation,
  ContractInvocationResult,
  ContractInvocationTransport
} from "./contracts";
export {
  STELLAR_SECRET_KEY_ENV_KEYS,
  loadStellarConfig
} from "./stellar/config";
export type {
  StellarConfig,
  StellarNetwork,
  StellarSecretKeyEnvKey
} from "./stellar/config";
