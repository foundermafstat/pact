"use client";

import { useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          const response = await client.getMilestoneProofInput(programId, milestoneKey);
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
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="attestor-program-id">Program ID</Label>
          <Input id="attestor-program-id" value={programId} onChange={(event) => setProgramId(event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="attestor-milestone">Milestone</Label>
          <Input id="attestor-milestone" value={milestoneKey} onChange={(event) => setMilestoneKey(event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="attestor-project-wallet">Startup wallet</Label>
          <Input id="attestor-project-wallet" value={projectWallet} onChange={(event) => setProjectWallet(event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="active-users">Active users</Label>
          <Input id="active-users" value={metrics.activeUsers} onChange={(event) => setMetrics((current) => ({ ...current, activeUsers: event.target.value }))} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pilot-partners">Pilot partners</Label>
          <Input id="pilot-partners" value={metrics.pilotPartners} onChange={(event) => setMetrics((current) => ({ ...current, pilotPartners: event.target.value }))} />
        </div>
        <div className="flex h-10 items-center gap-3 self-end">
          <Checkbox checked={metrics.auditPassed} onCheckedChange={(checked) => setMetrics((current) => ({ ...current, auditPassed: checked === true }))} id="audit-passed" />
          <Label htmlFor="audit-passed">Audit passed</Label>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending || !programId} onClick={() => run("evidence")} type="button">
          Create evidence
        </Button>
        <Button disabled={isPending} onClick={() => run("build")} type="button" variant="outline">
          Build root
        </Button>
        <Button disabled={isPending || !rootId} onClick={() => run("publish")} type="button" variant="outline">
          Publish root
        </Button>
        <Button disabled={isPending || !programId} onClick={() => run("input")} type="button" variant="outline">
          Create proof input
        </Button>
      </div>
      {validationErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Invalid metrics</AlertTitle>
          <AlertDescription>{validationErrors.join(", ")}</AlertDescription>
        </Alert>
      ) : null}
      {summary ? <Badge variant="secondary">{summary}</Badge> : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Attestor operation failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
