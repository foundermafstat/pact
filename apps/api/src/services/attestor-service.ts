import { createHash, randomBytes, randomUUID } from "node:crypto";

import type {
  CreateMilestoneEvidenceRequest,
  MilestoneAttestationDto,
  RootDto,
  RootType
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
