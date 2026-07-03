import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";

import type { ContractInvocation, ContractInvocationTransport } from "@pact/sdk";
import { MilestoneEscrowClient } from "@pact/sdk";
import type { ProgramDto, TrancheDto } from "@pact/shared";

const execFileAsync = promisify(execFile);

export class SmartContractNotConfiguredError extends Error {
  public constructor() {
    super("Smart contract release is not configured");
  }
}

export class SmartContractReleaseError extends Error {}

const MOCK_PROOF_MARKER = "a5".repeat(32);

const sha256Bytes32 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const normalizeBytes32 = (value: string): string => {
  const trimmed = value.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed.slice(2).toLowerCase();
  }
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return sha256Bytes32(trimmed);
};

const isStellarAddress = (value: string | undefined): value is string =>
  typeof value === "string" && /^[CG][A-Z2-7]{55}$/.test(value);

const extractTxHash = (output: string): string | undefined => {
  const match = output.match(/(?:hash|tx|transaction)[^0-9a-fA-F]*([0-9a-fA-F]{64})/i)
    ?? output.match(/\b([0-9a-fA-F]{64})\b/);
  return match?.[1] ? `0x${match[1].toLowerCase()}` : undefined;
};

class StellarCliTransport implements ContractInvocationTransport {
  public constructor(
    private readonly sourceAccount: string,
    private readonly network: string,
    private readonly rpcUrl: string,
    private readonly networkPassphrase: string
  ) {}

  public async invoke<T>(invocation: ContractInvocation) {
    const commandArgs = [
      "contract",
      "invoke",
      "--id",
      invocation.contractId,
      "--source-account",
      this.sourceAccount,
      "--network",
      this.network,
      "--rpc-url",
      this.rpcUrl,
      "--network-passphrase",
      this.networkPassphrase,
      "--send",
      "yes",
      "--",
      invocation.method,
      ...this.toMethodArgs(invocation)
    ];

    const { stdout, stderr } = await execFileAsync("stellar", commandArgs, {
      maxBuffer: 1024 * 1024 * 4
    });
    const output = `${stdout}\n${stderr}`;
    const txHash = extractTxHash(output);
    if (!txHash) {
      throw new SmartContractReleaseError(
        `Stellar CLI did not return a transaction hash for ${invocation.method}`
      );
    }

    return {
      txHash,
      result: undefined as T
    };
  }

  private toMethodArgs(invocation: ContractInvocation): string[] {
    const [a, b, c, d, e] = invocation.args;
    switch (invocation.method) {
      case "create_program":
        return [
          "--program_id",
          normalizeBytes32(String(a)),
          "--project",
          String(b),
          "--asset",
          String(c),
          "--total_amount",
          String(d),
          "--eligibility_policy_id",
          normalizeBytes32(String(e))
        ];
      case "add_tranche":
        return [
          "--program_id",
          normalizeBytes32(String(a)),
          "--milestone_id",
          normalizeBytes32(String(b)),
          "--milestone_policy_id",
          normalizeBytes32(String(c)),
          "--amount",
          String(d),
          "--release_to",
          String(e)
        ];
      case "fund_program":
        return ["--program_id", normalizeBytes32(String(a)), "--amount", String(b)];
      case "activate_program":
        return ["--program_id", normalizeBytes32(String(a))];
      case "release_tranche":
        return [
          "--program_id",
          normalizeBytes32(String(a)),
          "--milestone_id",
          normalizeBytes32(String(b))
        ];
      case "set_policy_active":
        return [
          "--policy_id",
          normalizeBytes32(String(a)),
          ...(b === true ? ["--active"] : [])
        ];
      case "set_root_active":
        return [
          "--root",
          normalizeBytes32(String(a)),
          ...(b === true ? ["--active"] : [])
        ];
      case "submit_project_eligibility":
        return [
          "--program_id",
          normalizeBytes32(String(a)),
          "--proof",
          normalizeBytes32(String(b)),
          "--public_inputs",
          JSON.stringify(c)
        ];
      case "submit_milestone_proof":
        return [
          "--program_id",
          normalizeBytes32(String(a)),
          "--milestone_id",
          normalizeBytes32(String(b)),
          "--proof",
          normalizeBytes32(String(c)),
          "--public_inputs",
          JSON.stringify(d)
        ];
      default:
        throw new SmartContractReleaseError(`Unsupported MilestoneEscrow method: ${invocation.method}`);
    }
  }
}

export class EscrowContractService {
  public createClient(): MilestoneEscrowClient {
    const contractId = process.env["MILESTONE_ESCROW_CONTRACT_ID"];
    const sourceAccount =
      process.env["PACT_CONTRACT_SOURCE_ACCOUNT"] ??
      process.env["STELLAR_SPONSOR_SECRET_KEY"] ??
      process.env["STELLAR_DEPLOYER_SECRET_KEY"] ??
      (process.env["APP_ENV"] === "local" ? "pact-deployer" : undefined);
    if (!contractId || !sourceAccount) {
      throw new SmartContractNotConfiguredError();
    }

    return new MilestoneEscrowClient(
      contractId,
      new StellarCliTransport(
        sourceAccount,
        process.env["STELLAR_NETWORK"] ?? "testnet",
        process.env["STELLAR_RPC_URL"] ?? "https://soroban-testnet.stellar.org",
        process.env["STELLAR_NETWORK_PASSPHRASE"] ?? "Test SDF Network ; September 2015"
      )
    );
  }

  public resolveAssetAddress(assetContract: string): string {
    if (isStellarAddress(assetContract)) {
      return assetContract;
    }
    const fallback =
      process.env["DEMO_ASSET_CONTRACT_ID"] ??
      process.env["NEXT_PUBLIC_DEMO_ASSET_CONTRACT_ID"] ??
      process.env["MILESTONE_ESCROW_CONTRACT_ID"];
    if (!isStellarAddress(fallback)) {
      throw new SmartContractNotConfiguredError();
    }
    return fallback;
  }

  public async createAndActivateProgram(input: {
    program: ProgramDto;
    tranches: TrancheDto[];
  }): Promise<string> {
    const client = this.createClient();
    const assetAddress = this.resolveAssetAddress(input.program.assetContract);
    let lastTxHash = "";

    lastTxHash = (await client.createProgram({
      programId: input.program.id,
      project: input.program.projectWallet,
      asset: assetAddress,
      totalAmount: input.program.totalAmount,
      eligibilityPolicyId: input.program.eligibilityPolicyId
    })).txHash ?? "";

    for (const tranche of input.tranches) {
      lastTxHash = (await client.addTranche({
        programId: input.program.id,
        milestoneId: tranche.milestoneKey,
        milestonePolicyId: tranche.milestonePolicyId,
        amount: tranche.amount,
        releaseTo: tranche.releaseToWallet
      })).txHash ?? lastTxHash;
    }

    lastTxHash = (await client.fundProgram(input.program.id, input.program.totalAmount)).txHash ?? lastTxHash;
    lastTxHash = (await client.activateProgram(input.program.id)).txHash ?? lastTxHash;
    return lastTxHash;
  }

  public async submitStripeMilestoneAndRelease(input: {
    program: ProgramDto;
    tranche: TrancheDto;
    milestoneRoot: string;
    milestoneNullifier: string;
  }): Promise<string> {
    const client = this.createClient();
    const eligibilityPolicyId = normalizeBytes32(input.program.eligibilityPolicyId);
    const eligibilityRoot = sha256Bytes32(`eligibility-root:${input.program.id}`);
    const eligibilityNullifier = sha256Bytes32(
      `eligibility:${input.program.id}:${input.tranche.milestoneKey}:${input.program.projectWallet}`
    );
    const milestonePolicyId = normalizeBytes32(input.tranche.milestonePolicyId);
    const milestoneRoot = normalizeBytes32(input.milestoneRoot);
    const milestoneNullifier = normalizeBytes32(input.milestoneNullifier);

    await client.setPolicyActive(eligibilityPolicyId, true);
    await client.setRootActive(eligibilityRoot, true);
    await client.submitProjectEligibility({
      programId: input.program.id,
      proof: MOCK_PROOF_MARKER,
      publicInputs: {
        account_binding: input.program.projectWallet,
        credential_root: eligibilityRoot,
        nullifier: eligibilityNullifier,
        policy_hash: sha256Bytes32(`eligibility-policy:${input.program.eligibilityPolicyId}`),
        policy_id: eligibilityPolicyId
      }
    });

    await client.setPolicyActive(milestonePolicyId, true);
    await client.setRootActive(milestoneRoot, true);
    await client.submitMilestoneProof({
      programId: input.program.id,
      milestoneId: input.tranche.milestoneKey,
      proof: MOCK_PROOF_MARKER,
      publicInputs: {
        milestone_root: milestoneRoot,
        nullifier: milestoneNullifier,
        policy_id: milestonePolicyId,
        recipient: input.tranche.releaseToWallet,
        tranche_amount: input.tranche.amount
      }
    });

    const result = await client.releaseTranche(input.program.id, input.tranche.milestoneKey);
    if (!result.txHash) {
      throw new SmartContractReleaseError("MilestoneEscrow release did not return a tx hash");
    }
    return result.txHash;
  }
}

export const escrowContractService = new EscrowContractService();
