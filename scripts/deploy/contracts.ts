import { copyFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type ContractTarget = {
  packageName: string;
  artifactName: string;
  envKey: string;
};

const targets: ContractTarget[] = [
  {
    packageName: "policy-registry",
    artifactName: "policy_registry.wasm",
    envKey: "POLICY_REGISTRY_CONTRACT_ID"
  },
  {
    packageName: "root-registry",
    artifactName: "root_registry.wasm",
    envKey: "ROOT_REGISTRY_CONTRACT_ID"
  },
  {
    packageName: "nullifier-registry",
    artifactName: "nullifier_registry.wasm",
    envKey: "NULLIFIER_REGISTRY_CONTRACT_ID"
  },
  {
    packageName: "verifier-adapter",
    artifactName: "verifier_adapter.wasm",
    envKey: "VERIFIER_ADAPTER_CONTRACT_ID"
  },
  {
    packageName: "milestone-escrow",
    artifactName: "milestone_escrow.wasm",
    envKey: "MILESTONE_ESCROW_CONTRACT_ID"
  },
  {
    packageName: "gated-asset-controller",
    artifactName: "gated_asset_controller.wasm",
    envKey: "GATED_ASSET_CONTROLLER_CONTRACT_ID"
  }
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const outDir = resolve("contracts/target/wasm32v1-none/release");
const artifactPath = resolve("contracts/deployments/latest.contracts.json");

const ensureDeployableWasm = (artifactName: string): string => {
  const rootWasmPath = resolve(outDir, artifactName);
  const depsWasmPath = resolve(outDir, "deps", artifactName);
  const rootSize = statSync(rootWasmPath, { throwIfNoEntry: false })?.size ?? 0;

  if (rootSize > 0) {
    return rootWasmPath;
  }

  const depsSize = statSync(depsWasmPath, { throwIfNoEntry: false })?.size ?? 0;
  if (depsSize <= 0) {
    throw new Error(`Missing deployable WASM artifact: ${artifactName}`);
  }

  copyFileSync(depsWasmPath, rootWasmPath);
  return rootWasmPath;
};

const run = (command: string, commandArgs: string[]): string => {
  if (dryRun) {
    const printable = [command, ...commandArgs].join(" ");
    console.log(`[dry-run] ${printable}`);
    return `dry-run:${printable}`;
  }

  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} failed`);
  }

  return result.stdout.trim();
};

const sourceAccount =
  process.env["STELLAR_DEPLOYER_SECRET_KEY"] ??
  process.env["PACT_CONTRACT_SOURCE_ACCOUNT"] ??
  (process.env["APP_ENV"] === "local" ? "pact-deployer" : undefined);
if (!dryRun && !sourceAccount) {
  throw new Error(
    "STELLAR_DEPLOYER_SECRET_KEY or PACT_CONTRACT_SOURCE_ACCOUNT is required for contract deployment"
  );
}

const network = process.env["STELLAR_NETWORK"] ?? "testnet";
const rpcUrl = process.env["STELLAR_RPC_URL"] ?? "https://soroban-testnet.stellar.org";
const networkPassphrase =
  process.env["STELLAR_NETWORK_PASSPHRASE"] ?? "Test SDF Network ; September 2015";

run("stellar", [
  "contract",
  "build",
  "--manifest-path",
  "contracts/Cargo.toml",
  "--out-dir",
  outDir
]);

const contracts: Record<string, string> = {};

for (const target of targets) {
  const wasmPath = dryRun
    ? resolve(outDir, target.artifactName)
    : ensureDeployableWasm(target.artifactName);
  const deployOutput = run("stellar", [
    "contract",
    "deploy",
    "--source-account",
    sourceAccount ?? "DRY_RUN_SOURCE",
    "--wasm",
    wasmPath,
    "--network",
    network,
    "--rpc-url",
    rpcUrl,
    "--network-passphrase",
    networkPassphrase,
    "--alias",
    target.packageName
  ]);

  contracts[target.envKey] = deployOutput;
}

const artifact = {
  generatedAt: new Date().toISOString(),
  dryRun,
  network,
  rpcUrl,
  contracts
};

mkdirSync(dirname(artifactPath), { recursive: true });
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Wrote ${artifactPath}`);
