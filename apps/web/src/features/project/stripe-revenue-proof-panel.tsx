"use client";

import { useMemo, useState, useTransition } from "react";

import type { ProofJobDto, StripeConnectionStatusDto, StripeRevenueSnapshotDto } from "@pact/shared";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { webEnv } from "../../config/env";
import { PactApiClient, PactApiClientError } from "../../lib/api-client";

const defaultPeriodStart = (): string => {
  const date = new Date();
  date.setUTCDate(1);
  return date.toISOString().slice(0, 10);
};

const defaultPeriodEnd = (): string => new Date().toISOString().slice(0, 10);

export function StripeRevenueProofPanel() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [programId, setProgramId] = useState("");
  const [milestoneId, setMilestoneId] = useState("M1");
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);
  const [currency, setCurrency] = useState("usd");
  const [thresholdCents, setThresholdCents] = useState("1000000");
  const [status, setStatus] = useState<StripeConnectionStatusDto | null>(null);
  const [snapshot, setSnapshot] = useState<StripeRevenueSnapshotDto | null>(null);
  const [proofJob, setProofJob] = useState<ProofJobDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const proofAccepted =
    typeof proofJob?.proofJson?.["accepted"] === "boolean"
      ? proofJob.proofJson["accepted"]
      : null;

  const run = (action: "status" | "connect" | "disconnect" | "snapshot" | "proof") => {
    setError(null);
    startTransition(async () => {
      try {
        if (action === "status") {
          const response = await client.getStripeConnectionStatus(programId);
          setStatus(response.data);
        }

        if (action === "connect") {
          const response = await client.startStripeOAuth(programId);
          window.location.href = response.data.authorizeUrl;
        }

        if (action === "disconnect") {
          const response = await client.disconnectStripe(programId);
          setStatus(response.data);
          setSnapshot(null);
          setProofJob(null);
        }

        if (action === "snapshot") {
          const response = await client.createStripeRevenueSnapshot({
            programId,
            periodStart,
            periodEnd,
            currency: currency.toLowerCase(),
            thresholdCents
          });
          setSnapshot(response.data);
          setProofJob(null);
        }

        if (action === "proof" && snapshot) {
          const response = await client.generateStripeRevenueProof({
            snapshotId: snapshot.id,
            milestoneId
          });
          setProofJob(response.data);
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Stripe revenue proof flow failed"
        );
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="stripe-program-id">Program ID</Label>
          <Input
            id="stripe-program-id"
            value={programId}
            onChange={(event) => setProgramId(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="stripe-milestone-id">Milestone</Label>
          <Input
            id="stripe-milestone-id"
            value={milestoneId}
            onChange={(event) => setMilestoneId(event.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="stripe-period-start">Start date</Label>
          <Input
            id="stripe-period-start"
            type="date"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="stripe-period-end">End date</Label>
          <Input
            id="stripe-period-end"
            type="date"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="stripe-currency">Currency</Label>
          <Input
            id="stripe-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="stripe-threshold">Threshold cents</Label>
          <Input
            id="stripe-threshold"
            inputMode="numeric"
            value={thresholdCents}
            onChange={(event) => setThresholdCents(event.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending || !programId} onClick={() => run("status")} type="button">
          Check status
        </Button>
        <Button disabled={isPending || !programId} onClick={() => run("connect")} type="button" variant="outline">
          Connect Stripe Test Account
        </Button>
        <Button disabled={isPending || !programId} onClick={() => run("disconnect")} type="button" variant="outline">
          Disconnect
        </Button>
        <Button disabled={isPending || !programId} onClick={() => run("snapshot")} type="button" variant="outline">
          Generate Revenue Snapshot
        </Button>
        <Button disabled={isPending || !snapshot} onClick={() => run("proof")} type="button" variant="outline">
          Generate Proof
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {status ? <Badge variant="secondary">Stripe {status.status}</Badge> : null}
        {status?.connectedAccountHash ? (
          <Badge variant="outline">Account hash {status.connectedAccountHash}</Badge>
        ) : null}
        {proofAccepted !== null ? (
          <Badge variant={proofAccepted ? "default" : "destructive"}>
            Threshold {proofAccepted ? "passed" : "failed"}
          </Badge>
        ) : null}
      </div>
      {snapshot ? (
        <div className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-2">
          <span>
            Period {snapshot.periodStart.slice(0, 10)} to {snapshot.periodEnd.slice(0, 10)}
          </span>
          <span>
            Threshold {snapshot.thresholdCents} {snapshot.currency}
          </span>
          <span className="truncate">Connected hash {snapshot.connectedAccountHash}</span>
          <span className="truncate">Snapshot {snapshot.snapshotCommitment}</span>
          <span className="truncate">Source refs {snapshot.sourceRefsCommitment}</span>
          <span>Snapshot status {snapshot.status}</span>
        </div>
      ) : null}
      {proofJob ? (
        <div className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-2">
          <span className="truncate">Proof job {proofJob.id}</span>
          <span>Status {proofJob.status}</span>
          <span className="truncate">
            Verification key {String(proofJob.proofJson?.["verificationKeyHash"] ?? "")}
          </span>
          <span>{String(proofJob.proofJson?.["proofSystem"] ?? "")}</span>
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Stripe revenue proof failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
