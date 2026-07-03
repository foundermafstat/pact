import { Prisma, type ProofJob } from "@prisma/client";
import type { ProofJobDto, ProofType } from "@pact/shared";

import { prisma } from "../db/client";

type CreateProofJobInput = {
  proofType: ProofType;
  requestJson: Record<string, unknown>;
  publicInputsJson?: Record<string, unknown> | null;
};

type CompleteProofJobInput = {
  publicInputsJson?: Record<string, unknown> | null;
  proofJson: Record<string, unknown>;
};

const toRecord = (value: Prisma.JsonValue | null): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toProofJobDto = (job: ProofJob): ProofJobDto => ({
  id: job.id,
  proofType: job.proofType as ProofType,
  status: job.status as ProofJobDto["status"],
  requestJson: toRecord(job.requestJson) ?? {},
  publicInputsJson: toRecord(job.publicInputsJson),
  proofJson: toRecord(job.proofJson),
  error: job.error,
  createdAt: job.createdAt.toISOString(),
  completedAt: job.completedAt?.toISOString() ?? null
});

const toJsonInput = (
  value: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);

export class ProofJobService {
  public async reset(): Promise<void> {
    await prisma.proofJob.deleteMany();
  }

  public async createJob(input: CreateProofJobInput): Promise<ProofJobDto> {
    const job = await prisma.proofJob.create({
      data: {
        proofType: input.proofType,
        status: "Queued",
        requestJson: input.requestJson as Prisma.InputJsonValue,
        publicInputsJson: toJsonInput(input.publicInputsJson),
        proofJson: Prisma.JsonNull,
        error: null
      }
    });

    return toProofJobDto(job);
  }

  public async getJob(proofJobId: string): Promise<ProofJobDto | undefined> {
    const job = await prisma.proofJob.findUnique({ where: { id: proofJobId } });
    return job ? toProofJobDto(job) : undefined;
  }

  public async startJob(proofJobId: string): Promise<ProofJobDto | undefined> {
    const job = await prisma.proofJob.update({
      where: { id: proofJobId },
      data: {
        status: "Running",
        error: null
      }
    }).catch(() => undefined);

    return job ? toProofJobDto(job) : undefined;
  }

  public async completeJob(
    proofJobId: string,
    input: CompleteProofJobInput
  ): Promise<ProofJobDto | undefined> {
    const current = await prisma.proofJob.findUnique({ where: { id: proofJobId } });
    if (!current) {
      return undefined;
    }

    const data: Prisma.ProofJobUpdateInput = {
      status: "Succeeded",
      proofJson: input.proofJson as Prisma.InputJsonValue,
      error: null,
      completedAt: new Date()
    };
    if (input.publicInputsJson !== undefined) {
      data.publicInputsJson = toJsonInput(input.publicInputsJson);
    } else if (current.publicInputsJson == null) {
      data.publicInputsJson = Prisma.JsonNull;
    }

    const job = await prisma.proofJob.update({
      where: { id: proofJobId },
      data
    });

    return toProofJobDto(job);
  }

  public async failJob(proofJobId: string, error: string): Promise<ProofJobDto | undefined> {
    const job = await prisma.proofJob.update({
      where: { id: proofJobId },
      data: {
        status: "Failed",
        proofJson: Prisma.JsonNull,
        error,
        completedAt: new Date()
      }
    }).catch(() => undefined);

    return job ? toProofJobDto(job) : undefined;
  }

  public async saveGeneratedProof(
    proofJobId: string,
    input: CompleteProofJobInput
  ): Promise<ProofJobDto | undefined> {
    await this.startJob(proofJobId);
    return this.completeJob(proofJobId, input);
  }

  public async createSucceededJob(input: CreateProofJobInput & CompleteProofJobInput) {
    const queued = await this.createJob(input);
    await this.startJob(queued.id);
    return this.completeJob(queued.id, input);
  }

  public async listJobsByType(proofType: ProofType): Promise<ProofJobDto[]> {
    const jobs = await prisma.proofJob.findMany({
      where: { proofType },
      orderBy: { createdAt: "desc" }
    });
    return jobs.map(toProofJobDto);
  }
}

export const proofJobService = new ProofJobService();
