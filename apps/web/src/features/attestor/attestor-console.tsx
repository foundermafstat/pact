"use client";

import { useMemo, useState, useTransition } from "react";

import { webEnv } from "../../config/env";
import { PactApiClient, PactApiClientError } from "../../lib/api-client";
import {
  validateMilestoneThresholds,
  type MilestoneMetricsForm
} from "./attestor-model";

const defaultPolicyId = "22222222-2222-4222-8222-222222222222";

export function AttestorConsole() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [programId, setProgramId] = useState("");
  const [milestoneKey, setMilestoneKey] = useState("M1");
  const [projectWallet, setProjectWallet] = useState("GPROJECT");
  const [metrics, setMetrics] = useState<MilestoneMetricsForm>({
    activeUsers: "735",
    pilotPartners: "4",
    auditPassed: true
  });
  const [rootId, setRootId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const validationErrors = validateMilestoneThresholds(metrics);

  const run = (action: "evidence" | "build" | "publish" | "input") => {
    setError(null);
    startTransition(async () => {
      try {
        if (action === "evidence") {
          if (validationErrors.length > 0) {
            setError(validationErrors.join(", "));
            return;
          }
          const response = await client.createMilestoneEvidence({
            programId,
            milestoneKey,
            metrics: {
              activeUsers: Number(metrics.activeUsers),
              pilotPartners: Number(metrics.pilotPartners),
              auditPassed: metrics.auditPassed
            },
            sourceRefs: ["attestor-console"]
          });
          setSummary(`Evidence ${response.data.id}`);
        }

        if (action === "build") {
          const response = (await client.buildMilestoneRoot({
            policyId: defaultPolicyId,
            rootType: "MilestoneMetrics"
          })) as { data?: { root?: { id: string; root: string } } };
          setRootId(response.data?.root?.id ?? null);
          setSummary(`Root ${response.data?.root?.root ?? ""}`);
        }

        if (action === "publish" && rootId) {
          const response = await client.publishMilestoneRoot({ rootId });
          setSummary(`Published ${response.data.txHash ?? response.data.root}`);
        }

        if (action === "input") {
          const response = await client.getMilestoneProofInput(
            programId,
            milestoneKey,
            projectWallet
          );
          const root = (response as { data?: { publicInputs?: { milestoneRoot?: string } } })
            .data?.publicInputs?.milestoneRoot;
          setSummary(`Proof input ${root ?? "ready"}`);
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Attestor operation failed"
        );
      }
    });
  };

  return (
    <div className="workflow-panel">
      <div className="form-grid">
        <label className="field">
          <span>Program ID</span>
          <input value={programId} onChange={(event) => setProgramId(event.target.value)} />
        </label>
        <label className="field">
          <span>Milestone</span>
          <input value={milestoneKey} onChange={(event) => setMilestoneKey(event.target.value)} />
        </label>
        <label className="field">
          <span>Project wallet</span>
          <input value={projectWallet} onChange={(event) => setProjectWallet(event.target.value)} />
        </label>
        <label className="field">
          <span>Active users</span>
          <input value={metrics.activeUsers} onChange={(event) => setMetrics((current) => ({ ...current, activeUsers: event.target.value }))} />
        </label>
        <label className="field">
          <span>Pilot partners</span>
          <input value={metrics.pilotPartners} onChange={(event) => setMetrics((current) => ({ ...current, pilotPartners: event.target.value }))} />
        </label>
        <label className="check-field">
          <input checked={metrics.auditPassed} onChange={(event) => setMetrics((current) => ({ ...current, auditPassed: event.target.checked }))} type="checkbox" />
          <span>Audit passed</span>
        </label>
      </div>
      <div className="form-actions">
        <button className="primary-button" disabled={isPending || !programId} onClick={() => run("evidence")} type="button">
          Create evidence
        </button>
        <button className="secondary-button" disabled={isPending} onClick={() => run("build")} type="button">
          Build root
        </button>
        <button className="secondary-button" disabled={isPending || !rootId} onClick={() => run("publish")} type="button">
          Publish root
        </button>
        <button className="secondary-button" disabled={isPending || !programId} onClick={() => run("input")} type="button">
          Create proof input
        </button>
      </div>
      {validationErrors.length > 0 ? (
        <span className="error-text">{validationErrors.join(", ")}</span>
      ) : null}
      {summary ? <span className="success-text">{summary}</span> : null}
      {error ? <span className="error-text">{error}</span> : null}
    </div>
  );
}
