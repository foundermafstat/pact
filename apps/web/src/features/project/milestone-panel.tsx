"use client";

import { useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { webEnv } from "../../config/env";
import { PactApiClient, PactApiClientError } from "../../lib/api-client";
import { summarizeMilestoneInput, type MilestoneInputSummary } from "./milestone-model";

export function MilestonePanel() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [programId, setProgramId] = useState("");
  const [milestoneKey, setMilestoneKey] = useState("M1");
  const [summary, setSummary] = useState<MilestoneInputSummary | null>(null);
  const [proofJobId, setProofJobId] = useState<string | null>(null);
  const [payoutTx, setPayoutTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: "input" | "proof" | "submit") => {
    setError(null);
    startTransition(async () => {
      try {
        if (action === "input") {
          const proofInput = await client.getMilestoneProofInput(programId, milestoneKey);
          setSummary(summarizeMilestoneInput(proofInput));
        }

        if (action === "proof") {
          const proof = await client.generateMilestoneProof({
            proofType: "MilestoneUnlock",
            programId,
            milestoneKey
          });
          setProofJobId(proof.data.id);
        }

        if (action === "submit" && proofJobId) {
          const submitted = (await client.submitMilestoneProof({
            proofJobId,
            programId,
            milestoneKey
          })) as { data?: { txHash?: string } };
          setPayoutTx(submitted.data?.txHash ?? null);
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Milestone flow failed"
        );
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="milestone-program-id">Program ID</Label>
          <Input
            id="milestone-program-id"
            value={programId}
            onChange={(event) => setProgramId(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="milestone-key">Milestone</Label>
          <Input
            id="milestone-key"
            value={milestoneKey}
            onChange={(event) => setMilestoneKey(event.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending || !programId} onClick={() => run("input")} type="button">
          Fetch input
        </Button>
        <Button disabled={isPending || !summary} onClick={() => run("proof")} type="button" variant="outline">
          Generate proof
        </Button>
        <Button disabled={isPending || !proofJobId} onClick={() => run("submit")} type="button" variant="outline">
          Submit payout
        </Button>
      </div>
      {summary ? (
        <div className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-3">
          <span className="truncate">Root {summary.milestoneRoot}</span>
          <span className="truncate">Recipient {summary.recipient}</span>
          <span>Amount {summary.trancheAmount}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {proofJobId ? <Badge variant="secondary">Proof job {proofJobId}</Badge> : null}
        {payoutTx ? <Badge>Payout {payoutTx}</Badge> : null}
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Milestone flow failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
