import { createHash, randomBytes, randomUUID } from "node:crypto";

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

const now = (): string => new Date().toISOString();
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

export class AttestorService {
  private readonly attestations = new Map<string, MilestoneAttestationDto>();
  private readonly privatePackages = new Map<string, PrivateMilestonePackage>();
  private readonly roots = new Map<string, RootDto>();

  public reset(): void {
    this.attestations.clear();
    this.privatePackages.clear();
    this.roots.clear();
  }

  public createMockEvidence(
    input: CreateMilestoneEvidenceRequest
  ): MilestoneAttestationDto {
    this.validateMilestoneMetrics(input);
    const metricSalt = generateMilestoneSalt();
    const metricCommitment = buildMilestoneCommitment(input, metricSalt);

    const attestorId =
      process.env["MILESTONE_ATTESTOR_ID"] ?? "PACT_MILESTONE_MOCK_ATTESTOR";
    const publicPolicyHash = sha256Hex(
      `${input.programId}:${input.milestoneKey}:${input.sourceRefs.join(",")}`
    );
    const attestation: MilestoneAttestationDto = {
      id: randomUUID(),
      programId: input.programId,
      milestoneKey: input.milestoneKey,
      milestoneRoot: null,
      privateMetricsEncrypted: metricCommitment,
      publicPolicyHash,
      attestorId,
      status: "Pending",
      txHash: null,
      createdAt: now()
    };

    this.attestations.set(attestation.id, attestation);
    this.privatePackages.set(attestation.id, {
      attestationId: attestation.id,
      programId: input.programId,
      milestoneKey: input.milestoneKey,
      metrics: input.metrics,
      sourceRefs: input.sourceRefs,
      metricSalt,
      metricCommitment
    });
    return attestation;
  }

  public buildMilestoneRoot(input: {
    policyId: string;
    rootType: RootType;
  }): MilestoneRootBuildResult {
    if (input.rootType !== "MilestoneMetrics") {
      throw new Error("Milestone root builder requires MilestoneMetrics root type");
    }

    const pendingPackages = [...this.privatePackages.values()]
      .filter((item) => this.attestations.get(item.attestationId)?.status === "Pending")
      .sort((left, right) => left.metricCommitment.localeCompare(right.metricCommitment));

    if (pendingPackages.length === 0) {
      throw new Error("Cannot build milestone root without pending attestations");
    }

    const commitments = pendingPackages.map((item) => item.metricCommitment);
    const tree = buildMerkleTree(commitments);
    const createdAt = now();
    const root: RootDto = {
      id: randomUUID(),
      policyId: input.policyId,
      root: tree.root,
      rootType: input.rootType,
      epoch: Date.now(),
      status: "Pending",
      txHash: null,
      validFrom: createdAt,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt
    };

    this.roots.set(root.id, root);
    for (const item of pendingPackages) {
      const attestation = this.attestations.get(item.attestationId);
      if (attestation) {
        this.attestations.set(attestation.id, {
          ...attestation,
          milestoneRoot: root.root,
          status: "Validated"
        });
      }
    }

    return { root, commitments };
  }

  public publishMilestoneRoot(rootId: string): RootDto | undefined {
    const root = this.roots.get(rootId);
    if (!root) {
      return undefined;
    }

    const publishedRoot = {
      ...root,
      status: "Active" as const,
      txHash: sha256Hex(`milestone-root-publish:${root.id}:${root.root}`)
    };

    this.roots.set(root.id, publishedRoot);
    return publishedRoot;
  }

  public buildMilestoneProofInput(input: {
    program: ProgramDto;
    tranche: TrancheDto;
  }): MilestoneProofInputPackage {
    const attestation = [...this.attestations.values()].find(
      (item) =>
        item.programId === input.program.id &&
        item.milestoneKey === input.tranche.milestoneKey &&
        item.status === "Validated" &&
        item.milestoneRoot !== null
    );

    if (!attestation || !attestation.milestoneRoot) {
      throw new Error("Validated milestone attestation was not found");
    }

    const activeRoot = [...this.roots.values()].find(
      (item) => item.root === attestation.milestoneRoot && item.status === "Active"
    );
    if (!activeRoot) {
      throw new Error("Active milestone root was not found");
    }

    const rootPackages = [...this.privatePackages.values()]
      .filter((item) => {
        const packageAttestation = this.attestations.get(item.attestationId);
        return packageAttestation?.milestoneRoot === activeRoot.root;
      })
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
        policyHash: attestation.publicPolicyHash,
        milestoneRoot: activeRoot.root,
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
