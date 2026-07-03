import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

import type { ContractInvocation, ContractInvocationTransport } from "@pact/sdk";
import { MilestoneEscrowClient } from "@pact/sdk";
import type { ProgramDto, TrancheDto } from "@pact/shared";
import { publicAuditService } from "./public-audit-service";

const execFileAsync = promisify(execFile);

export class SmartContractNotConfiguredError extends Error {
  public constructor() {
    super("Smart contract release is not configured");
  }
}

export class SmartContractReleaseError extends Error {}

const isCommandNotFoundError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "ENOENT";

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

const recordContractEvent = async (
  programId: string,
  eventType: string,
  txHash: string,
  payload: Record<string, unknown>
): Promise<void> => {
  await publicAuditService.recordContractEvent(programId, {
    contractId: process.env["MILESTONE_ESCROW_CONTRACT_ID"] ?? "milestone-escrow",
    eventType,
    txHash,
    ledger: 0,
    payload,
    createdAt: new Date().toISOString()
  });
};

const recordContractEventIfPresent = async (
  programId: string,
  eventType: string,
  txHash: string | undefined,
  payload: Record<string, unknown>
): Promise<void> => {
  if (!txHash) {
    return;
  }

  await recordContractEvent(programId, eventType, txHash, payload);
};

const firstConfigured = (...values: Array<string | undefined>): string | undefined =>
  values.find((value): value is string => typeof value === "string" && value.trim().length > 0);

const resolveStellarCliPath = (): string => {
  const configured = process.env["STELLAR_CLI_PATH"]?.trim();
  if (configured) {
    return configured;
  }

  const homebrewPath = "/opt/homebrew/bin/stellar";
  if (existsSync(homebrewPath)) {
    return homebrewPath;
  }

  return "stellar";
};

const resolveContractAddress = (
  applicationAddress: string,
  envKey: "DEMO_SPONSOR_WALLET" | "DEMO_PROJECT_WALLET"
): string => {
  const configured = process.env[envKey]?.trim();
  if (isStellarAddress(configured)) {
    return configured;
  }

  return applicationAddress;
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

    let stdout = "";
    let stderr = "";
    try {
      const result = await execFileAsync(resolveStellarCliPath(), commandArgs, {
        maxBuffer: 1024 * 1024 * 4
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      if (isCommandNotFoundError(error)) {
        throw new SmartContractNotConfiguredError();
      }
      throw error;
    }
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
          "--sponsor",
          String(b),
          "--project",
          String(c),
          "--asset",
          String(d),
          "--total_amount",
          String(e),
          "--eligibility_policy_id",
          normalizeBytes32(String(invocation.args[5]))
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
      case "set_verifier_mode":
        return ["--mode", JSON.stringify(String(a))];
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
    const sourceAccount = firstConfigured(
      process.env["STELLAR_SPONSOR_SECRET_KEY"],
      process.env["PACT_CONTRACT_SOURCE_ACCOUNT"],
      process.env["STELLAR_DEPLOYER_SECRET_KEY"],
      process.env["APP_ENV"] === "local" ? "pact-deployer" : undefined
    );
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
      process.env["NEXT_PUBLIC_DEMO_ASSET_CONTRACT_ID"];
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
    const sponsorWallet = resolveContractAddress(input.program.sponsorWallet, "DEMO_SPONSOR_WALLET");
    const projectWallet = resolveContractAddress(input.program.projectWallet, "DEMO_PROJECT_WALLET");
    let lastTxHash = "";

    lastTxHash = (await client.createProgram({
      programId: input.program.id,
      sponsor: sponsorWallet,
      project: projectWallet,
      asset: assetAddress,
      totalAmount: input.program.totalAmount,
      eligibilityPolicyId: input.program.eligibilityPolicyId
    })).txHash ?? "";
    if (lastTxHash) {
      await recordContractEvent(input.program.id, "ProgramCreatedOnChain", lastTxHash, {
        programId: input.program.id,
        sponsorWallet: input.program.sponsorWallet,
        projectWallet: input.program.projectWallet,
        contractSponsorWallet: sponsorWallet,
        contractProjectWallet: projectWallet,
        assetContract: assetAddress,
        totalAmount: input.program.totalAmount
      });
    }

    for (const tranche of input.tranches) {
      const releaseToWallet = resolveContractAddress(
        tranche.releaseToWallet,
        "DEMO_PROJECT_WALLET"
      );
      const trancheTxHash = (await client.addTranche({
        programId: input.program.id,
        milestoneId: tranche.milestoneKey,
        milestonePolicyId: tranche.milestonePolicyId,
        amount: tranche.amount,
        releaseTo: releaseToWallet
      })).txHash;
      lastTxHash = trancheTxHash ?? lastTxHash;
      if (trancheTxHash) {
        await recordContractEvent(input.program.id, "TrancheAddedOnChain", trancheTxHash, {
          programId: input.program.id,
          milestoneKey: tranche.milestoneKey,
          amount: tranche.amount,
          releaseToWallet: tranche.releaseToWallet,
          contractReleaseToWallet: releaseToWallet
        });
      }
    }

    const fundTxHash = (await client.fundProgram(input.program.id, input.program.totalAmount)).txHash;
    lastTxHash = fundTxHash ?? lastTxHash;
    if (fundTxHash) {
      await recordContractEvent(input.program.id, "EscrowFundedOnChain", fundTxHash, {
        programId: input.program.id,
        amount: input.program.totalAmount,
        assetContract: assetAddress
      });
    }

    const activateTxHash = (await client.activateProgram(input.program.id)).txHash;
    lastTxHash = activateTxHash ?? lastTxHash;
    if (activateTxHash) {
      await recordContractEvent(input.program.id, "ProgramActivatedOnChain", activateTxHash, {
        programId: input.program.id
      });
    }
    return lastTxHash;
  }

  public async submitStripeMilestoneAndRelease(input: {
    program: ProgramDto;
    tranche: TrancheDto;
    milestoneRoot: string;
    milestoneNullifier: string;
    proofDigest: string;
  }): Promise<string> {
    const client = this.createClient();
    const projectWallet = resolveContractAddress(input.program.projectWallet, "DEMO_PROJECT_WALLET");
    const releaseToWallet = resolveContractAddress(
      input.tranche.releaseToWallet,
      "DEMO_PROJECT_WALLET"
    );
    const eligibilityPolicyId = normalizeBytes32(input.program.eligibilityPolicyId);
    const eligibilityRoot = sha256Bytes32(`eligibility-root:${input.program.id}`);
    const eligibilityNullifier = sha256Bytes32(
      `eligibility:${input.program.id}:${input.tranche.milestoneKey}:${projectWallet}`
    );
    const milestonePolicyId = normalizeBytes32(input.tranche.milestonePolicyId);
    const milestoneRoot = normalizeBytes32(input.milestoneRoot);
    const milestoneNullifier = normalizeBytes32(input.milestoneNullifier);
    const proofDigest = normalizeBytes32(input.proofDigest || milestoneNullifier);

    await recordContractEventIfPresent(
      input.program.id,
      "VerifierModeSetOnChain",
      (await client.setVerifierMode("Groth16Bn254")).txHash,
      { mode: "Groth16Bn254" }
    );
    await recordContractEventIfPresent(
      input.program.id,
      "EligibilityPolicyActivatedOnChain",
      (await client.setPolicyActive(eligibilityPolicyId, true)).txHash,
      { policyId: eligibilityPolicyId, active: true }
    );
    await recordContractEventIfPresent(
      input.program.id,
      "EligibilityRootActivatedOnChain",
      (await client.setRootActive(eligibilityRoot, true)).txHash,
      { root: eligibilityRoot, active: true }
    );
    const eligibilityProof = sha256Bytes32(
      `eligibility-proof:${input.program.id}:${projectWallet}:${eligibilityNullifier}`
    );
    await recordContractEventIfPresent(
      input.program.id,
      "EligibilityProofSubmittedOnChain",
      (await client.submitProjectEligibility({
        programId: input.program.id,
        proof: eligibilityProof,
        publicInputs: {
          account_binding: projectWallet,
          credential_root: eligibilityRoot,
          nullifier: eligibilityNullifier,
          proof_digest: eligibilityProof,
          policy_hash: sha256Bytes32(`eligibility-policy:${input.program.eligibilityPolicyId}`),
          policy_id: eligibilityPolicyId
        }
      })).txHash,
      { eligibilityRoot, eligibilityNullifier, proofDigest: eligibilityProof }
    );

    await recordContractEventIfPresent(
      input.program.id,
      "MilestonePolicyActivatedOnChain",
      (await client.setPolicyActive(milestonePolicyId, true)).txHash,
      { policyId: milestonePolicyId, active: true }
    );
    await recordContractEventIfPresent(
      input.program.id,
      "MilestoneRootActivatedOnChain",
      (await client.setRootActive(milestoneRoot, true)).txHash,
      { root: milestoneRoot, active: true }
    );
    await recordContractEventIfPresent(
      input.program.id,
      "MilestoneProofSubmittedOnChain",
      (await client.submitMilestoneProof({
        programId: input.program.id,
        milestoneId: input.tranche.milestoneKey,
        proof: proofDigest,
        publicInputs: {
          milestone_root: milestoneRoot,
          nullifier: milestoneNullifier,
          proof_digest: proofDigest,
          policy_id: milestonePolicyId,
          recipient: releaseToWallet,
          tranche_amount: input.tranche.amount
        }
      })).txHash,
      {
        milestoneKey: input.tranche.milestoneKey,
        milestoneRoot,
        milestoneNullifier,
        proofDigest,
        releaseToWallet
      }
    );

    const result = await client.releaseTranche(input.program.id, input.tranche.milestoneKey);
    if (!result.txHash) {
      throw new SmartContractReleaseError("MilestoneEscrow release did not return a tx hash");
    }
    await recordContractEvent(input.program.id, "TrancheReleasedOnChain", result.txHash, {
      programId: input.program.id,
      milestoneKey: input.tranche.milestoneKey,
      amount: input.tranche.amount,
      releaseToWallet: input.tranche.releaseToWallet,
      contractReleaseToWallet: releaseToWallet,
      proofDigest
    });
    return result.txHash;
  }

  public async submitVerifiedMilestoneAndRelease(input: {
    program: ProgramDto;
    tranche: TrancheDto;
    milestoneRoot: string;
    milestoneNullifier: string;
    proofDigest: string;
  }): Promise<string> {
    const client = this.createClient();
    const projectWallet = resolveContractAddress(input.program.projectWallet, "DEMO_PROJECT_WALLET");
    const releaseToWallet = resolveContractAddress(
      input.tranche.releaseToWallet,
      "DEMO_PROJECT_WALLET"
    );
    const eligibilityPolicyId = normalizeBytes32(input.program.eligibilityPolicyId);
    const eligibilityRoot = sha256Bytes32(`eligibility-root:${input.program.id}`);
    const eligibilityNullifier = sha256Bytes32(
      `eligibility:${input.program.id}:${input.tranche.milestoneKey}:${projectWallet}`
    );
    const eligibilityProof = sha256Bytes32(`eligibility-proof:${input.program.id}:${eligibilityNullifier}`);
    const milestonePolicyId = normalizeBytes32(input.tranche.milestonePolicyId);
    const milestoneRoot = normalizeBytes32(input.milestoneRoot);
    const milestoneNullifier = normalizeBytes32(input.milestoneNullifier);
    const proofDigest = normalizeBytes32(input.proofDigest || milestoneNullifier);

    await recordContractEventIfPresent(
      input.program.id,
      "VerifierModeSetOnChain",
      (await client.setVerifierMode("Groth16Bn254")).txHash,
      { mode: "Groth16Bn254" }
    );
    await recordContractEventIfPresent(
      input.program.id,
      "EligibilityPolicyActivatedOnChain",
      (await client.setPolicyActive(eligibilityPolicyId, true)).txHash,
      { policyId: eligibilityPolicyId, active: true }
    );
    await recordContractEventIfPresent(
      input.program.id,
      "EligibilityRootActivatedOnChain",
      (await client.setRootActive(eligibilityRoot, true)).txHash,
      { root: eligibilityRoot, active: true }
    );
    await recordContractEventIfPresent(
      input.program.id,
      "EligibilityProofSubmittedOnChain",
      (await client.submitProjectEligibility({
        programId: input.program.id,
        proof: sha256Bytes32(`eligibility-proof:${input.program.id}:${eligibilityNullifier}`),
        publicInputs: {
          account_binding: projectWallet,
          credential_root: eligibilityRoot,
          nullifier: eligibilityNullifier,
          proof_digest: eligibilityProof,
          policy_hash: sha256Bytes32(`eligibility-policy:${input.program.eligibilityPolicyId}`),
          policy_id: eligibilityPolicyId
        }
      })).txHash,
      { eligibilityRoot, eligibilityNullifier, proofDigest: eligibilityProof }
    );

    await recordContractEventIfPresent(
      input.program.id,
      "MilestonePolicyActivatedOnChain",
      (await client.setPolicyActive(milestonePolicyId, true)).txHash,
      { policyId: milestonePolicyId, active: true }
    );
    await recordContractEventIfPresent(
      input.program.id,
      "MilestoneRootActivatedOnChain",
      (await client.setRootActive(milestoneRoot, true)).txHash,
      { root: milestoneRoot, active: true }
    );
    await recordContractEventIfPresent(
      input.program.id,
      "MilestoneProofSubmittedOnChain",
      (await client.submitMilestoneProof({
        programId: input.program.id,
        milestoneId: input.tranche.milestoneKey,
        proof: proofDigest,
        publicInputs: {
          milestone_root: milestoneRoot,
          nullifier: milestoneNullifier,
          proof_digest: proofDigest,
          policy_id: milestonePolicyId,
          recipient: releaseToWallet,
          tranche_amount: input.tranche.amount
        }
      })).txHash,
      {
        milestoneKey: input.tranche.milestoneKey,
        milestoneRoot,
        milestoneNullifier,
        proofDigest,
        releaseToWallet
      }
    );

    const result = await client.releaseTranche(input.program.id, input.tranche.milestoneKey);
    if (!result.txHash) {
      throw new SmartContractReleaseError("MilestoneEscrow release did not return a tx hash");
    }
    await recordContractEvent(input.program.id, "TrancheReleasedOnChain", result.txHash, {
      programId: input.program.id,
      milestoneKey: input.tranche.milestoneKey,
      amount: input.tranche.amount,
      releaseToWallet: input.tranche.releaseToWallet,
      contractReleaseToWallet: releaseToWallet,
      proofDigest
    });
    return result.txHash;
  }
}

export const escrowContractService = new EscrowContractService();
