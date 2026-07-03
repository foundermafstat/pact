import type { Program, Tranche } from "@prisma/client";

import type { CreateProgramRequest, ProgramDto, TrancheDto } from "@pact/shared";

import { prisma } from "../db/client";

export type ProgramRecord = {
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

const normalizeWallet = (wallet: string): string => wallet.trim().toUpperCase();

const amountToString = (value: { toFixed: (digits?: number) => string }): string =>
  value.toFixed(0);

const toProgramDto = (program: Program): ProgramDto => ({
  id: program.id,
  programKey: program.programKey,
  sponsorWallet: program.sponsorWallet,
  projectWallet: program.projectWallet,
  assetContract: program.assetContract,
  totalAmount: amountToString(program.totalAmount),
  fundedAmount: amountToString(program.fundedAmount),
  status: program.status,
  eligibilityPolicyId: program.eligibilityPolicyId,
  createdAt: program.createdAt.toISOString(),
  updatedAt: program.updatedAt.toISOString()
});

const toTrancheDto = (tranche: Tranche): TrancheDto => ({
  id: tranche.id,
  programId: tranche.programId,
  milestoneKey: tranche.milestoneKey,
  milestonePolicyId: tranche.milestonePolicyId,
  amount: amountToString(tranche.amount),
  releaseToWallet: tranche.releaseToWallet,
  status: tranche.status,
  releasedAt: tranche.releasedAt?.toISOString() ?? null,
  txHash: tranche.txHash
});

const toProgramRecord = (input: Program & { tranches: Tranche[] }): ProgramRecord => ({
  program: toProgramDto(input),
  tranches: input.tranches.map(toTrancheDto)
});

export class ProgramService {
  public reset(): void {
    // Test suites that need data cleanup use database truncation.
  }

  public async createProgram(input: CreateProgramRequest): Promise<ProgramRecord> {
    const sponsorWallet = normalizeWallet(input.sponsorWallet);
    const projectWallet = normalizeWallet(input.projectWallet);

    const record = await prisma.program.create({
      data: {
        programKey: input.programKey.trim(),
        sponsorWallet,
        projectWallet,
        assetContract: input.assetContract.trim(),
        totalAmount: input.totalAmount,
        status: "Draft",
        eligibilityPolicyId: input.eligibilityPolicyId.trim(),
        tranches: {
          create: input.tranches.map((tranche) => ({
            milestoneKey: tranche.milestoneKey.trim(),
            milestonePolicyId: tranche.milestonePolicyId.trim(),
            amount: tranche.amount,
            releaseToWallet: normalizeWallet(tranche.releaseToWallet),
            status: "Locked"
          }))
        }
      },
      include: {
        tranches: {
          orderBy: { milestoneKey: "asc" }
        }
      }
    });

    return toProgramRecord(record);
  }

  public async getProgram(programId: string): Promise<ProgramRecord | undefined> {
    const record = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        tranches: {
          orderBy: { milestoneKey: "asc" }
        }
      }
    });

    return record ? toProgramRecord(record) : undefined;
  }

  public async fundProgram(
    programId: string,
    amount: string
  ): Promise<ProgramRecord | undefined> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.program.findUnique({
        where: { id: programId }
      });
      if (!current) {
        return undefined;
      }

      const fundedAmount = BigInt(amountToString(current.fundedAmount));
      const totalAmount = BigInt(amountToString(current.totalAmount));
      const nextFundedAmount = fundedAmount + BigInt(amount);
      const cappedAmount = nextFundedAmount > totalAmount ? totalAmount : nextFundedAmount;

      const program = await tx.program.update({
        where: { id: programId },
        data: { fundedAmount: cappedAmount.toString() },
        include: {
          tranches: {
            orderBy: { milestoneKey: "asc" }
          }
        }
      });

      return toProgramRecord(program);
    });
  }

  public async activateProgram(programId: string): Promise<ProgramRecord | undefined> {
    const existing = await prisma.program.findUnique({
      where: { id: programId }
    });
    if (!existing) {
      return undefined;
    }

    const program = await prisma.program.update({
      where: { id: programId },
      data: { status: "Active" },
      include: {
        tranches: {
          orderBy: { milestoneKey: "asc" }
        }
      }
    });

    return toProgramRecord(program);
  }

  public async releaseTranche(
    programId: string,
    milestoneKey: string,
    txHash: string
  ): Promise<TrancheDto | undefined> {
    const tranche = await prisma.tranche.findUnique({
      where: {
        programId_milestoneKey: {
          programId,
          milestoneKey
        }
      }
    });
    if (!tranche || tranche.status === "Released") {
      return undefined;
    }

    const releasedTranche = await prisma.tranche.update({
      where: {
        programId_milestoneKey: {
          programId,
          milestoneKey
        }
      },
      data: {
        status: "Released",
        releasedAt: new Date(),
        txHash
      }
    });

    return toTrancheDto(releasedTranche);
  }

  public async getAudit(programId: string): Promise<ProgramAudit | undefined> {
    const record = await this.getProgram(programId);
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
          createdAt: record.program.updatedAt || now(),
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
