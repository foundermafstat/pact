import { randomUUID } from "node:crypto";

import type { ProofJobDto, ProofType } from "@pact/shared";

type CreateProofJobInput = {
  proofType: ProofType;
  requestJson: Record<string, unknown>;
  publicInputsJson?: Record<string, unknown> | null;
};

type CompleteProofJobInput = {
  publicInputsJson?: Record<string, unknown> | null;
  proofJson: Record<string, unknown>;
};

const now = (): string => new Date().toISOString();

export class ProofJobService {
  private readonly jobs = new Map<string, ProofJobDto>();

  public reset(): void {
    this.jobs.clear();
  }

  public createJob(input: CreateProofJobInput): ProofJobDto {
    const job: ProofJobDto = {
      id: randomUUID(),
      proofType: input.proofType,
      status: "Queued",
      requestJson: input.requestJson,
      publicInputsJson: input.publicInputsJson ?? null,
      proofJson: null,
      error: null,
      createdAt: now(),
      completedAt: null
    };

    this.jobs.set(job.id, job);
    return job;
  }

  public getJob(proofJobId: string): ProofJobDto | undefined {
    return this.jobs.get(proofJobId);
  }

  public startJob(proofJobId: string): ProofJobDto | undefined {
    const job = this.jobs.get(proofJobId);
    if (!job) {
      return undefined;
    }

    return this.save({
      ...job,
      status: "Running",
      error: null
    });
  }

  public completeJob(
    proofJobId: string,
    input: CompleteProofJobInput
  ): ProofJobDto | undefined {
    const job = this.jobs.get(proofJobId);
    if (!job) {
      return undefined;
    }

    return this.save({
      ...job,
      status: "Succeeded",
      publicInputsJson: input.publicInputsJson ?? job.publicInputsJson,
      proofJson: input.proofJson,
      error: null,
      completedAt: now()
    });
  }

  public failJob(proofJobId: string, error: string): ProofJobDto | undefined {
    const job = this.jobs.get(proofJobId);
    if (!job) {
      return undefined;
    }

    return this.save({
      ...job,
      status: "Failed",
      proofJson: null,
      error,
      completedAt: now()
    });
  }

  private save(job: ProofJobDto): ProofJobDto {
    this.jobs.set(job.id, job);
    return job;
  }
}

export const proofJobService = new ProofJobService();
