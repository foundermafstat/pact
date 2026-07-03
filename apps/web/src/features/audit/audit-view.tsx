"use client";

import { useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { webEnv } from "../../config/env";
import { PactApiClient, PactApiClientError } from "../../lib/api-client";
import {
  auditTimelineFixture,
  type PublicAuditTimelineItem
} from "./audit-model";

export function AuditTimeline({ items }: { items: PublicAuditTimelineItem[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => (
        <li className="rounded-md border p-3" key={item.type}>
          <strong className="block text-sm">{item.type}</strong>
          <span className="block text-sm text-muted-foreground">{item.message}</span>
          <small className="block truncate font-mono text-xs text-muted-foreground">
            {Object.values(item.publicFields).join(" / ")}
          </small>
        </li>
      ))}
    </ol>
  );
}

export function AuditView() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [programId, setProgramId] = useState("");
  const [items, setItems] = useState<PublicAuditTimelineItem[]>(auditTimelineFixture);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="audit-program-id">Program ID</Label>
          <Input id="audit-program-id" value={programId} onChange={(event) => setProgramId(event.target.value)} />
        </div>
        <Button
          disabled={isPending || !programId}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                const response = (await client.getProgramAudit(programId)) as {
                  data?: { timeline?: PublicAuditTimelineItem[] };
                };
                setItems(response.data?.timeline ?? auditTimelineFixture);
              } catch (caughtError) {
                setError(
                  caughtError instanceof PactApiClientError
                    ? caughtError.message
                    : "Audit fetch failed"
                );
              }
            });
          }}
          type="button"
        >
          Load audit
        </Button>
      </div>
      <AuditTimeline items={items} />
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Audit fetch failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
