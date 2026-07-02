"use client";

import { useMemo, useState, useTransition } from "react";

import { webEnv } from "../../config/env";
import { PactApiClient, PactApiClientError } from "../../lib/api-client";
import {
  auditTimelineFixture,
  type PublicAuditTimelineItem
} from "./audit-model";

export function AuditTimeline({ items }: { items: PublicAuditTimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((item) => (
        <li key={item.type}>
          <strong>{item.type}</strong>
          <span>{item.message}</span>
          <small>{Object.values(item.publicFields).join(" · ")}</small>
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
    <div className="workflow-panel">
      <div className="form-actions">
        <label className="field compact-field">
          <span>Program ID</span>
          <input value={programId} onChange={(event) => setProgramId(event.target.value)} />
        </label>
        <button
          className="primary-button"
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
        </button>
      </div>
      <AuditTimeline items={items} />
      {error ? <span className="error-text">{error}</span> : null}
    </div>
  );
}
