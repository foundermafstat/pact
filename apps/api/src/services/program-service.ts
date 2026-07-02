import { randomUUID } from "node:crypto";

import type { CreateProgramRequest, ProgramDto, TrancheDto } from "@pact/shared";

type ProgramRecord = {
  program: ProgramDto;
  tranches: TrancheDto[];
};

export type ProgramAuditEntry = {
  type: string;
  message: string;
  createdAt: string;
  publicFields: Record<string, string>;
};

export type ProgramAudit = {
  program: ProgramDto;
  tranches: TrancheDto[];
  timeline: ProgramAuditEntry[];
};

const now = (): string => new Date().toISOString();

export class ProgramService {
  private readonly programs = new Map<string, ProgramRecord>();

  public reset(): void {
    this.programs.clear();
  }

  public createProgram(input: CreateProgramRequest): ProgramRecord {
    const createdAt = now();
    const program: ProgramDto = {
      id: randomUUID(),
      programKey: input.programKey,
      sponsorWallet: input.sponsorWallet,
      projectWallet: input.projectWallet,
      assetContract: input.assetContract,
      totalAmount: input.totalAmount,
      fundedAmount: "0",
      status: "Draft",
      eligibilityPolicyId: input.eligibilityPolicyId,
      createdAt,
      updatedAt: createdAt
    };

    const tranches = input.tranches.map<TrancheDto>((tranche) => ({
      id: randomUUID(),
      programId: program.id,
      milestoneKey: tranche.milestoneKey,
      milestonePolicyId: tranche.milestonePolicyId,
      amount: tranche.amount,
      releaseToWallet: tranche.releaseToWallet,
      status: "Locked",
      releasedAt: null,
      txHash: null
    }));

    const record = { program, tranches };
    this.programs.set(program.id, record);
    return record;
  }

  public getProgram(programId: string): ProgramRecord | undefined {
    return this.programs.get(programId);
  }

  public fundProgram(programId: string, amount: string): ProgramRecord | undefined {
    const record = this.programs.get(programId);
    if (!record) {
      return undefined;
    }

    const nextFundedAmount = BigInt(record.program.fundedAmount) + BigInt(amount);
    const totalAmount = BigInt(record.program.totalAmount);
    record.program = {
      ...record.program,
      fundedAmount: nextFundedAmount > totalAmount ? totalAmount.toString() : nextFundedAmount.toString(),
      updatedAt: now()
    };

    return record;
  }

  public activateProgram(programId: string): ProgramRecord | undefined {
    const record = this.programs.get(programId);
    if (!record) {
      return undefined;
    }

    record.program = {
      ...record.program,
      status: "Active",
      updatedAt: now()
    };

    return record;
  }

  public releaseTranche(
    programId: string,
    milestoneKey: string,
    txHash: string
  ): TrancheDto | undefined {
    const record = this.programs.get(programId);
    if (!record) {
      return undefined;
    }

    const trancheIndex = record.tranches.findIndex(
      (item) => item.milestoneKey === milestoneKey
    );
    const tranche = record.tranches[trancheIndex];
    if (!tranche || tranche.status === "Released") {
      return undefined;
    }

    const releasedTranche: TrancheDto = {
      ...tranche,
      status: "Released",
      releasedAt: now(),
      txHash
    };
    record.tranches[trancheIndex] = releasedTranche;

    return releasedTranche;
  }

  public getAudit(programId: string): ProgramAudit | undefined {
    const record = this.programs.get(programId);
    if (!record) {
      return undefined;
    }

    return {
      ...record,
      timeline: [
        {
          type: "ProgramCreated",
          message: "Program created",
          createdAt: record.program.createdAt,
          publicFields: {
            programId: record.program.id,
            programKey: record.program.programKey,
            status: record.program.status
          }
        },
        {
          type: "EscrowFunded",
          message: "Escrow funding status updated",
          createdAt: record.program.updatedAt,
          publicFields: {
            fundedAmount: record.program.fundedAmount,
            totalAmount: record.program.totalAmount
          }
        }
      ]
    };
  }
}

export const programService = new ProgramService();
