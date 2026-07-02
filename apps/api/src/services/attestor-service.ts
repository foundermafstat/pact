import { createHash, randomUUID } from "node:crypto";

import type {
  CreateMilestoneEvidenceRequest,
  MilestoneAttestationDto
} from "@pact/shared";

const now = (): string => new Date().toISOString();
const sha256Hex = (value: string): `0x${string}` =>
  `0x${createHash("sha256").update(value).digest("hex")}`;

const encodePrivateMetrics = (input: CreateMilestoneEvidenceRequest): string =>
  sha256Hex(JSON.stringify(input.metrics));

export class AttestorService {
  private readonly attestations = new Map<string, MilestoneAttestationDto>();

  public createMockEvidence(
    input: CreateMilestoneEvidenceRequest
  ): MilestoneAttestationDto {
    this.validateMilestoneMetrics(input);

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
      privateMetricsEncrypted: encodePrivateMetrics(input),
      publicPolicyHash,
      attestorId,
      status: "Pending",
      txHash: null,
      createdAt: now()
    };

    this.attestations.set(attestation.id, attestation);
    return attestation;
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
