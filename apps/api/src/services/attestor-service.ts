import { createHash, randomBytes } from "node:crypto";

import { Prisma, type MilestoneAttestation, type Root } from "@prisma/client";
import type {
  CreateMilestoneEvidenceRequest,
  MilestonePrivateInput,
  MilestonePublicInput,
  MilestoneAttestationDto,
  ProgramDto,
  RootDto,
  RootType,
  TrancheDto
} from "@pact/shared";
import { buildMerkleTree } from "@pact/zk";

import { loadStripeIntegrationConfig } from "../config";
import { prisma } from "../db/client";
import {
  decryptJson,
  encryptJson,
  encryptionKeyFromConfig
} from "./encryption-service";

export type PrivateMilestonePackage = {
  attestationId: string;
  programId: string;
  milestoneKey: string;
  metrics: CreateMilestoneEvidenceRequest["metrics"];
  sourceRefs: string[];
  metricSalt: `0x${string}`;
  metricCommitment: `0x${string}`;
};

export type MilestoneRootBuildResult = {
  root: RootDto;
  commitments: `0x${string}`[];
};

export type MilestoneProofInputPackage = {
  attestationId: string;
  metricCommitment: `0x${string}`;
  publicInputs: MilestonePublicInput;
  privateInputs: MilestonePrivateInput;
};

const hex = (bytes = 32): `0x${string}` => `0x${randomBytes(bytes).toString("hex")}`;
const sha256Hex = (value: string): `0x${string}` =>
  `0x${createHash("sha256").update(value).digest("hex")}`;

export const generateMilestoneSalt = (): `0x${string}` => hex();

export const buildMilestoneCommitment = (
  input: CreateMilestoneEvidenceRequest,
  metricSalt: `0x${string}`
): `0x${string}` =>
  sha256Hex(
    JSON.stringify({
      programId: input.programId,
      milestoneKey: input.milestoneKey,
      metrics: input.metrics,
      sourceRefs: input.sourceRefs,
      metricSalt
    })
  );

const toAttestationDto = (attestation: MilestoneAttestation): MilestoneAttestationDto => ({
  id: attestation.id,
  programId: attestation.programId,
  milestoneKey: attestation.milestoneKey,
  milestoneRoot: attestation.milestoneRoot as `0x${string}` | null,
  privateMetricsEncrypted: attestation.privateMetricsEncrypted,
  publicPolicyHash: attestation.publicPolicyHash as `0x${string}`,
  attestorId: attestation.attestorId,
  status: attestation.status,
  txHash: attestation.txHash,
  createdAt: attestation.createdAt.toISOString()
});

const toRootDto = (root: Root): RootDto => ({
  id: root.id,
  policyId: root.policyId,
  root: root.root as `0x${string}`,
  rootType: root.rootType,
  epoch: root.epoch,
  status: root.status,
  txHash: root.txHash,
  validFrom: root.validFrom.toISOString(),
  validUntil: root.validUntil.toISOString(),
  createdAt: root.createdAt.toISOString()
});

const encryptPrivatePackage = (value: PrivateMilestonePackage): string =>
  encryptJson(value, encryptionKeyFromConfig(loadStripeIntegrationConfig()));

const decryptPrivatePackage = (value: string): PrivateMilestonePackage =>
  decryptJson<PrivateMilestonePackage>(
    value,
    encryptionKeyFromConfig(loadStripeIntegrationConfig())
  );

const ensureRootPolicy = async (policyId: string): Promise<void> => {
  await prisma.policy.upsert({
    where: { id: policyId },
    update: {},
    create: {
      id: policyId,
      policyKey: policyId,
      policyHash: sha256Hex(`policy:${policyId}`),
      policyType: "Milestone",
      status: "Active",
      rawPolicyJson: {
        source: "attestor-root-build",
        policyId
      } as Prisma.InputJsonValue
    }
  });
};

export class AttestorService {
  public async reset(): Promise<void> {
    await prisma.milestoneAttestation.deleteMany();
    await prisma.root.deleteMany({ where: { rootType: "MilestoneMetrics" } });
  }

  public async createMockEvidence(
    input: CreateMilestoneEvidenceRequest
  ): Promise<MilestoneAttestationDto> {
    this.validateMilestoneMetrics(input);
    const metricSalt = generateMilestoneSalt();
    const metricCommitment = buildMilestoneCommitment(input, metricSalt);

    const attestorId =
      process.env["MILESTONE_ATTESTOR_ID"] ?? "PACT_MILESTONE_SIGNED_ATTESTOR";
    const publicPolicyHash = sha256Hex(
      `${input.programId}:${input.milestoneKey}:${input.sourceRefs.join(",")}`
    );

    const attestation = await prisma.$transaction(async (tx) => {
      const created = await tx.milestoneAttestation.create({
        data: {
          programId: input.programId,
          milestoneKey: input.milestoneKey,
          milestoneRoot: null,
          privateMetricsEncrypted: metricCommitment,
          privatePackageEncrypted: "",
          publicPolicyHash,
          attestorId,
          status: "Pending",
          txHash: null
        }
      });
      const privatePackage: PrivateMilestonePackage = {
        attestationId: created.id,
        programId: input.programId,
        milestoneKey: input.milestoneKey,
        metrics: input.metrics,
        sourceRefs: input.sourceRefs,
        metricSalt,
        metricCommitment
      };

      return tx.milestoneAttestation.update({
        where: { id: created.id },
        data: {
          privatePackageEncrypted: encryptPrivatePackage(privatePackage)
        }
      });
    });

    return toAttestationDto(attestation);
  }

  public async buildMilestoneRoot(input: {
    policyId: string;
    rootType: RootType;
  }): Promise<MilestoneRootBuildResult> {
    if (input.rootType !== "MilestoneMetrics") {
      throw new Error("Milestone root builder requires MilestoneMetrics root type");
    }

    const pendingAttestations = await prisma.milestoneAttestation.findMany({
      where: { status: "Pending" },
      orderBy: { privateMetricsEncrypted: "asc" }
    });
    const pendingPackages = pendingAttestations
      .filter((item) => item.privatePackageEncrypted)
      .map((item) => decryptPrivatePackage(item.privatePackageEncrypted ?? ""))
      .sort((left, right) => left.metricCommitment.localeCompare(right.metricCommitment));

    if (pendingPackages.length === 0) {
      throw new Error("Cannot build milestone root without pending attestations");
    }

    const commitments = pendingPackages.map((item) => item.metricCommitment);
    const tree = buildMerkleTree(commitments);
    const createdAt = new Date();
    await ensureRootPolicy(input.policyId);

    const root = await prisma.$transaction(async (tx) => {
      const createdRoot = await tx.root.create({
        data: {
          policyId: input.policyId,
          root: tree.root,
          rootType: input.rootType,
          epoch: Math.floor(Date.now() / 1000),
          status: "Pending",
          txHash: null,
          validFrom: createdAt,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
      await tx.milestoneAttestation.updateMany({
        where: {
          id: {
            in: pendingPackages.map((item) => item.attestationId)
          }
        },
        data: {
          milestoneRoot: createdRoot.root,
          status: "Validated"
        }
      });
      return createdRoot;
    });

    return { root: toRootDto(root), commitments };
  }

  public async publishMilestoneRoot(rootId: string): Promise<RootDto | undefined> {
    const root = await prisma.root.findUnique({ where: { id: rootId } });
    if (!root) {
      return undefined;
    }

    const publishedRoot = await prisma.$transaction(async (tx) => {
      const updatedRoot = await tx.root.update({
        where: { id: root.id },
        data: {
          status: "Active",
          txHash: sha256Hex(`milestone-root-publish:${root.id}:${root.root}`)
        }
      });
      await tx.milestoneAttestation.updateMany({
        where: { milestoneRoot: root.root, status: "Validated" },
        data: { status: "Published" }
      });
      return updatedRoot;
    });

    return toRootDto(publishedRoot);
  }

  public async buildMilestoneProofInput(input: {
    program: ProgramDto;
    tranche: TrancheDto;
  }): Promise<MilestoneProofInputPackage> {
    const attestation = await prisma.milestoneAttestation.findFirst({
      where: {
        programId: input.program.id,
        milestoneKey: input.tranche.milestoneKey,
        status: { in: ["Validated", "Published"] },
        milestoneRoot: { not: null }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!attestation || !attestation.milestoneRoot) {
      throw new Error("Validated milestone attestation was not found");
    }

    const activeRoot = await prisma.root.findFirst({
      where: {
        root: attestation.milestoneRoot,
        status: "Active"
      }
    });
    if (!activeRoot) {
      throw new Error("Active milestone root was not found");
    }

    const rootAttestations = await prisma.milestoneAttestation.findMany({
      where: { milestoneRoot: activeRoot.root },
      orderBy: { privateMetricsEncrypted: "asc" }
    });
    const rootPackages = rootAttestations
      .filter((item) => item.privatePackageEncrypted)
      .map((item) => decryptPrivatePackage(item.privatePackageEncrypted ?? ""))
      .sort((left, right) => left.metricCommitment.localeCompare(right.metricCommitment));
    const packageIndex = rootPackages.findIndex(
      (item) => item.attestationId === attestation.id
    );
    const privatePackage = rootPackages[packageIndex];
    if (!privatePackage) {
      throw new Error("Private milestone package was not found");
    }

    const tree = buildMerkleTree(rootPackages.map((item) => item.metricCommitment));
    const proof = tree.getProof(packageIndex);
    const nullifier = sha256Hex(
      `milestone-nullifier:${input.program.id}:${input.tranche.milestoneKey}:${input.tranche.releaseToWallet}:${activeRoot.root}`
    );

    return {
      attestationId: attestation.id,
      metricCommitment: privatePackage.metricCommitment,
      publicInputs: {
        policyHash: attestation.publicPolicyHash as `0x${string}`,
        milestoneRoot: activeRoot.root as `0x${string}`,
        nullifier,
        programId: input.program.id,
        milestoneId: input.tranche.milestoneKey,
        recipient: input.tranche.releaseToWallet,
        trancheAmount: input.tranche.amount,
        currentEpoch: Math.floor(Date.now() / 1000)
      },
      privateInputs: {
        projectSecret: sha256Hex(`project:${input.program.projectWallet}`),
        attestationSecret: privatePackage.metricSalt,
        activeUsers: privatePackage.metrics.activeUsers,
        pilotPartners: privatePackage.metrics.pilotPartners,
        auditPassed: privatePackage.metrics.auditPassed,
        metricSalts: [privatePackage.metricSalt],
        attestationMerklePath: {
          elements: proof.pathElements,
          indices: proof.pathIndices
        }
      }
    };
  }

  private validateMilestoneMetrics(input: CreateMilestoneEvidenceRequest): void {
    if (input.metrics.activeUsers < 500) {
      throw new Error("active_users below threshold");
    }

    if (input.metrics.pilotPartners < 3) {
      throw new Error("pilot_partners below threshold");
    }

    if (!input.metrics.auditPassed) {
      throw new Error("audit_passed must be true");
    }
  }
}

export const attestorService = new AttestorService();
