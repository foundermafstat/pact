import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

import {
  canonicalizeJson,
  type JsonValue,
  type MilestonePrivateInput,
  type MilestonePublicInput,
  type PaymentRevenuePrivateInput,
  type PaymentRevenuePublicInput
} from "@pact/shared";
import {
  hexToFieldString,
  stringToFieldString
} from "@pact/zk";

import type { PrivateCredentialPackage } from "./issuer-service";

const execFileAsync = promisify(execFile);

type CircuitName = "eligibility" | "milestone" | "payment-revenue";

type GeneratedProof = {
  publicInputsJson: Record<string, unknown>;
  proofJson: Record<string, unknown>;
};

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const sha256Hex = (value: string): `0x${string}` =>
  `0x${createHash("sha256").update(value).digest("hex")}`;

const field = (value: string | number | bigint): string =>
  ((BigInt(value) % BN254_SCALAR_FIELD) + BN254_SCALAR_FIELD).toString();

const fieldAdd = (...values: Array<string | number | bigint>): string => {
  const sum = values.reduce<bigint>((acc, value) => acc + BigInt(value), 0n);
  return field(sum);
};

const fieldMul = (left: string | number | bigint, right: string | number | bigint): string =>
  field(BigInt(left) * BigInt(right));

const fieldToBytes32Hex = (value: string): `0x${string}` =>
  `0x${BigInt(value).toString(16).padStart(64, "0").slice(-64)}`;

const findRepoRoot = async (startDir: string): Promise<string> => {
  let currentDir = resolve(startDir);
  while (currentDir !== dirname(currentDir)) {
    try {
      await readFile(join(currentDir, "circuits", "scripts", "snarkjs-pipeline.sh"));
      return currentDir;
    } catch {
      currentDir = dirname(currentDir);
    }
  }

  throw new Error("Unable to locate Pact repo root for local proving");
};

const buildDirFor = (repoRoot: string, circuit: CircuitName): string => {
  if (circuit === "eligibility") {
    return join(repoRoot, "circuits", "eligibility-proof", "build");
  }
  if (circuit === "milestone") {
    return join(repoRoot, "circuits", "milestone-unlock-proof", "build");
  }
  return join(repoRoot, "circuits", "payment-revenue-threshold-proof", "build");
};

const runCircuit = async (
  circuit: CircuitName,
  fixture: Record<string, unknown>,
  publicInputsJson: Record<string, unknown>
): Promise<GeneratedProof> => {
  const repoRoot = await findRepoRoot(process.cwd());
  const dir = await mkdtemp(join(tmpdir(), `pact-${circuit}-`));
  const fixturePath = join(dir, "fixture.json");
  try {
    await writeFile(fixturePath, JSON.stringify(fixture, null, 2));
    await execFileAsync(
      "bash",
      [join(repoRoot, "circuits", "scripts", "snarkjs-pipeline.sh"), circuit, "all", fixturePath],
      {
        cwd: repoRoot,
        maxBuffer: 1024 * 1024 * 8
      }
    );

    const buildDir = buildDirFor(repoRoot, circuit);
    const proof = JSON.parse(await readFile(join(buildDir, "proof.json"), "utf8")) as Record<string, unknown>;
    const orderedPublicInputs = JSON.parse(
      await readFile(join(buildDir, "public.json"), "utf8")
    ) as string[];
    const verificationKey = JSON.parse(
      await readFile(join(buildDir, "verification_key.json"), "utf8")
    ) as Record<string, unknown>;
    const verificationKeyHash = sha256Hex(canonicalizeJson(verificationKey as JsonValue));
    const proofDigest = sha256Hex(canonicalizeJson({ proof, orderedPublicInputs } as JsonValue));

    return {
      publicInputsJson: {
        ...publicInputsJson,
        orderedPublicInputs
      },
      proofJson: {
        mode: "local",
        proofSystem: "groth16",
        proof,
        generatedAt: new Date().toISOString(),
        verification: {
          verified: true,
          verificationKeyHash,
          proofDigest
        }
      }
    };
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
};

export const generateEligibilityProof = async (
  credential: PrivateCredentialPackage
): Promise<GeneratedProof> => {
  const credentialSecret = hexToFieldString(credential.credentialSecret);
  const subjectId = stringToFieldString(credential.wallet);
  const chainId = "1";
  const contractId = stringToFieldString("pact");
  const marketId = "1";
  const assetId = "1";
  const actionType = "1";
  const nullifier = fieldAdd(
    credentialSecret,
    fieldMul(chainId, 3),
    fieldMul(contractId, 5),
    fieldMul(marketId, 7),
    fieldMul(assetId, 11),
    fieldMul(actionType, 13)
  );
  const policyHash = stringToFieldString(`eligibility-policy:${credential.issuerId}`);
  const credentialRoot = stringToFieldString(`credential-root:${credential.credentialId}`);
  const fixture = {
    credentialSecret,
    credentialSalt: hexToFieldString(credential.credentialSalt),
    subjectId,
    jurisdictionCode: stringToFieldString(credential.jurisdictionCode),
    isAccredited: credential.isAccredited ? "1" : "0",
    isNonUs: credential.isNonUs ? "1" : "0",
    sanctionsPassed: credential.sanctionsPassed ? "1" : "0",
    expiresAt: String(credential.expiresAt),
    issuerId: stringToFieldString(credential.issuerId),
    merklePathElements: [credentialRoot, policyHash, "0", "0", "0", "0", "0", "0"],
    merklePathIndices: ["0", "0", "0", "0", "0", "0", "0", "0"],
    policyHash,
    credentialRoot,
    nullifier,
    chainId,
    contractId,
    marketId,
    assetId,
    actionType,
    accountBinding: subjectId,
    currentEpoch: String(Math.floor(Date.now() / 1000))
  };

  return runCircuit("eligibility", fixture, {
    proofType: "Eligibility",
    credentialId: credential.credentialId,
    nullifier: fieldToBytes32Hex(nullifier)
  });
};

export const generateMilestoneProof = async (input: {
  publicInputs: MilestonePublicInput;
  privateInputs: MilestonePrivateInput;
}): Promise<GeneratedProof> => {
  const projectSecret = hexToFieldString(input.privateInputs.projectSecret);
  const programId = stringToFieldString(input.publicInputs.programId);
  const milestoneId = stringToFieldString(input.publicInputs.milestoneId);
  const recipient = stringToFieldString(input.publicInputs.recipient);
  const policyHash = hexToFieldString(input.publicInputs.policyHash);
  const milestoneRoot = hexToFieldString(input.publicInputs.milestoneRoot);
  const trancheAmount = input.publicInputs.trancheAmount;
  const nullifier = fieldAdd(
    projectSecret,
    fieldMul(programId, 17),
    fieldMul(milestoneId, 19)
  );
  const fixture = {
    projectSecret,
    attestationSecret: hexToFieldString(input.privateInputs.attestationSecret),
    activeUsers: String(input.privateInputs.activeUsers),
    pilotPartners: String(input.privateInputs.pilotPartners),
    auditPassed: input.privateInputs.auditPassed ? "1" : "0",
    metricSalts: [
      hexToFieldString(input.privateInputs.metricSalts[0] ?? "0x00"),
      "0",
      "0",
      "0"
    ],
    attestationMerklePathElements: [
      milestoneRoot,
      policyHash,
      recipient,
      trancheAmount,
      "0",
      "0",
      "0",
      "0"
    ],
    attestationMerklePathIndices: ["0", "0", "0", "0", "0", "0", "0", "0"],
    policyHash,
    milestoneRoot,
    nullifier,
    programId,
    milestoneId,
    recipient,
    trancheAmount,
    currentEpoch: String(input.publicInputs.currentEpoch)
  };

  return runCircuit("milestone", fixture, input.publicInputs as unknown as Record<string, unknown>);
};

export const generatePaymentRevenueProof = async (input: {
  publicInput: PaymentRevenuePublicInput;
  privateInput: PaymentRevenuePrivateInput;
  thresholdPassed: boolean;
}): Promise<GeneratedProof> => {
  const connectorSecret = hexToFieldString(input.privateInput.connectorSecret);
  const snapshotSalt = hexToFieldString(input.privateInput.snapshotSalt);
  const netRevenueCents = input.privateInput.netRevenueCents;
  const grossPaidCents = input.privateInput.grossPaidCents;
  const refundCents = input.privateInput.refundCents;
  const feeCents = input.privateInput.feeCents;
  const successfulChargeCount = String(input.privateInput.successfulChargeCount);
  const thresholdCents = input.publicInput.thresholdCents;
  const programId = stringToFieldString(input.publicInput.programId);
  const milestoneId = stringToFieldString(input.publicInput.milestoneId);
  const currencyCode = stringToFieldString(input.publicInput.currencyCode);
  const sourceRefsCommitment = fieldAdd(successfulChargeCount, 17);
  const connectedAccountHash = fieldAdd(connectorSecret, 18);
  const snapshotCommitment = fieldAdd(
    connectorSecret,
    snapshotSalt,
    netRevenueCents,
    sourceRefsCommitment
  );
  const policyHash = fieldAdd(programId, milestoneId, thresholdCents, currencyCode);
  const nullifier = fieldAdd(snapshotSalt, fieldMul(programId, 17), fieldMul(milestoneId, 19));
  const fixture = {
    connectorSecret,
    snapshotSalt,
    netRevenueCents,
    grossPaidCents,
    refundCents,
    feeCents,
    successfulChargeCount,
    sourceRefSalts: ["17", "18", "0", "0"],
    policyHash,
    snapshotCommitment,
    sourceRefsCommitment,
    connectedAccountHash,
    programId,
    milestoneId,
    thresholdCents,
    currencyCode,
    periodStartEpoch: String(input.publicInput.periodStartEpoch),
    periodEndEpoch: String(input.publicInput.periodEndEpoch),
    currentEpoch: String(input.publicInput.currentEpoch),
    nullifier
  };

  return runCircuit("payment-revenue", fixture, input.publicInput as unknown as Record<string, unknown>);
};
