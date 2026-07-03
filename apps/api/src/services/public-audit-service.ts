import type { ContractEventDto } from "@pact/shared";
import { Prisma } from "@prisma/client";

import { prisma } from "../db/client";
import { programService, type ProgramAudit, type ProgramAuditEntry } from "./program-service";

const PRIVATE_FIELD_PATTERN = /private|secret|metrics|salt/i;

const sanitizePayload = (payload: Record<string, unknown>): Record<string, string> => {
  const safeEntries = Object.entries(payload)
    .filter(([key]) => !PRIVATE_FIELD_PATTERN.test(key))
    .map(([key, value]) => [key, String(value)] as const);

  return Object.fromEntries(safeEntries);
};

export class PublicAuditService {
  public async reset(): Promise<void> {
    await prisma.contractEvent.deleteMany();
  }

  public async recordContractEvent(
    programId: string | null,
    event: Omit<ContractEventDto, "id">
  ): Promise<ContractEventDto> {
    const record = await prisma.contractEvent.upsert({
      where: {
        txHash_eventType: {
          txHash: event.txHash,
          eventType: event.eventType
        }
      },
      update: {
        programId,
        contractId: event.contractId,
        ledger: event.ledger,
        payload: event.payload as Prisma.InputJsonValue
      },
      create: {
        programId,
        contractId: event.contractId,
        eventType: event.eventType,
        txHash: event.txHash,
        ledger: event.ledger,
        payload: event.payload as Prisma.InputJsonValue,
        createdAt: new Date(event.createdAt)
      }
    });

    return {
      id: record.id,
      contractId: record.contractId,
      eventType: record.eventType,
      txHash: record.txHash,
      ledger: record.ledger,
      payload: record.payload as Record<string, unknown>,
      createdAt: record.createdAt.toISOString()
    };
  }

  public async getProgramAudit(programId: string): Promise<ProgramAudit | undefined> {
    const baseAudit = await programService.getAudit(programId);
    if (!baseAudit) {
      return undefined;
    }

    const events = await prisma.contractEvent.findMany({
      where: { programId },
      orderBy: { createdAt: "asc" }
    });
    const eventTimeline: ProgramAuditEntry[] = events.map((event) => ({
      type: event.eventType,
      message: "Contract event indexed",
      createdAt: event.createdAt.toISOString(),
      publicFields: sanitizePayload(event.payload as Record<string, unknown>)
    }));

    return {
      ...baseAudit,
      timeline: [...baseAudit.timeline, ...eventTimeline].sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt)
      )
    };
  }
}

export const publicAuditService = new PublicAuditService();
