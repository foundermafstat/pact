import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type CommandResult = {
  name: string;
  ok: boolean;
  details: {
    command: string;
    status: number | null;
    output: string;
  };
};

type ContractDeployment = {
  network: string;
  rpcUrl: string;
  contracts: Record<string, string>;
};

const artifactPath = resolve("docs/deployment/frontend-demo.latest.json");
const contractArtifactPath = resolve("contracts/deployments/latest.contracts.json");
const deployedUrl = process.env["WEB_DEPLOY_URL"] || "http://127.0.0.1:3100";
const apiUrl = process.env["NEXT_PUBLIC_API_URL"] || "http://127.0.0.1:4000";

const lastLines = (value: string): string =>
  value.trim().split("\n").slice(-12).join("\n");

const run = (
  name: string,
  args: string[],
  env: Record<string, string>
): CommandResult => {
  const result = spawnSync("pnpm", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      ...env
    },
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

const loadContractDeployment = async (): Promise<ContractDeployment> => {
  const raw = await readFile(contractArtifactPath, "utf8");
  return JSON.parse(raw) as ContractDeployment;
};

const main = async (): Promise<void> => {
  const deployment = await loadContractDeployment();
  const contracts = deployment.contracts;
  const publicEnv = {
    NEXT_PUBLIC_APP_URL: deployedUrl,
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_STELLAR_NETWORK: deployment.network,
    NEXT_PUBLIC_STELLAR_RPC_URL: deployment.rpcUrl,
    NEXT_PUBLIC_POLICY_REGISTRY_CONTRACT_ID:
      contracts["POLICY_REGISTRY_CONTRACT_ID"] ?? "",
    NEXT_PUBLIC_ROOT_REGISTRY_CONTRACT_ID:
      contracts["ROOT_REGISTRY_CONTRACT_ID"] ?? "",
    NEXT_PUBLIC_NULLIFIER_REGISTRY_CONTRACT_ID:
      contracts["NULLIFIER_REGISTRY_CONTRACT_ID"] ?? "",
    NEXT_PUBLIC_VERIFIER_ADAPTER_CONTRACT_ID:
      contracts["VERIFIER_ADAPTER_CONTRACT_ID"] ?? "",
    NEXT_PUBLIC_MILESTONE_ESCROW_CONTRACT_ID:
      contracts["MILESTONE_ESCROW_CONTRACT_ID"] ?? "",
    NEXT_PUBLIC_DEMO_ASSET_CONTRACT_ID:
      process.env["NEXT_PUBLIC_DEMO_ASSET_CONTRACT_ID"] ?? ""
  };
  const requiredPublicKeys = Object.entries(publicEnv)
    .filter(([key]) => key !== "NEXT_PUBLIC_DEMO_ASSET_CONTRACT_ID")
    .filter(([, value]) => !value)
    .map(([key]) => key);

  const checks = [
    {
      name: "public frontend env",
      ok: requiredPublicKeys.length === 0,
      details: {
        deployedUrl,
        apiUrl,
        network: deployment.network,
        missingKeys: requiredPublicKeys
      }
    },
    run("next build", ["--filter", "@pact/web", "build"], publicEnv),
    run("playwright smoke", ["--filter", "@pact/web", "test:e2e"], publicEnv)
  ];

  const artifact = {
    generatedAt: new Date().toISOString(),
    mode: process.env["WEB_DEPLOY_URL"] ? "external-demo" : "local-demo",
    deployedUrl,
    apiUrl,
    routes: ["/", "/sponsor", "/project", "/issuer", "/attestor", "/audit"],
    contractArtifactPath,
    publicContractIds: {
      policyRegistry: publicEnv.NEXT_PUBLIC_POLICY_REGISTRY_CONTRACT_ID,
      rootRegistry: publicEnv.NEXT_PUBLIC_ROOT_REGISTRY_CONTRACT_ID,
      nullifierRegistry: publicEnv.NEXT_PUBLIC_NULLIFIER_REGISTRY_CONTRACT_ID,
      verifierAdapter: publicEnv.NEXT_PUBLIC_VERIFIER_ADAPTER_CONTRACT_ID,
      milestoneEscrow: publicEnv.NEXT_PUBLIC_MILESTONE_ESCROW_CONTRACT_ID
    },
    checks,
    ok: checks.every((check) => check.ok)
  };

  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify(artifact, null, 2));

  if (!artifact.ok) {
    process.exitCode = 1;
  }
};

void main();
