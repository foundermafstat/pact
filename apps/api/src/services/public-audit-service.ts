import type { ContractEventDto } from "@pact/shared";

import { programService, type ProgramAudit, type ProgramAuditEntry } from "./program-service";

const PRIVATE_FIELD_PATTERN = /private|secret|metrics|salt/i;

const sanitizePayload = (payload: Record<string, unknown>): Record<string, string> => {
  const safeEntries = Object.entries(payload)
    .filter(([key]) => !PRIVATE_FIELD_PATTERN.test(key))
    .map(([key, value]) => [key, String(value)] as const);

  return Object.fromEntries(safeEntries);
};

export class PublicAuditService {
  private readonly contractEvents = new Map<string, ContractEventDto[]>();

  public reset(): void {
    this.contractEvents.clear();
  }

  public recordContractEvent(programId: string, event: ContractEventDto): void {
    const existingEvents = this.contractEvents.get(programId) ?? [];
    if (
      existingEvents.some(
        (item) => item.txHash === event.txHash && item.eventType === event.eventType
      )
    ) {
      return;
    }

    this.contractEvents.set(programId, [...existingEvents, event]);
  }

  public getProgramAudit(programId: string): ProgramAudit | undefined {
    const baseAudit = programService.getAudit(programId);
    if (!baseAudit) {
      return undefined;
    }

    const eventTimeline: ProgramAuditEntry[] = (
      this.contractEvents.get(programId) ?? []
    ).map((event) => ({
      type: event.eventType,
      message: "Contract event indexed",
      createdAt: event.createdAt,
      publicFields: sanitizePayload(event.payload)
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
