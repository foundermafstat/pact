"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type {
  ProofJobDto,
  StartupPoolApplicationDto,
  StripeConnectionStatusDto,
  StripeRevenueSnapshotDto
} from "@pact/shared";
import { ExternalLinkIcon, RefreshCcwIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { webEnv } from "@/config/env";
import { PactApiClient, PactApiClientError } from "@/lib/api-client";

const milestoneKey = (programId: string, milestoneKeyValue: string): string =>
  `${programId}:${milestoneKeyValue}`;

const short = (value: string): string =>
  value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const proofField = (proofJob: ProofJobDto | undefined, key: string): string => {
  const verification = asRecord(proofJob?.proofJson?.["verification"]);
  const value = verification?.[key] ?? proofJob?.proofJson?.[key];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "-";
};

const explorerTxUrl = (txHash: string): string => {
  const network = webEnv.stellarNetwork.toLowerCase() === "public" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${network}/tx/${txHash.replace(/^0x/, "")}`;
};

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border/70 bg-background/40 p-2">
      <div className="text-[0.68rem] uppercase text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-xs">{value || "-"}</div>
    </div>
  );
}

export function FounderStripeProofWorkspace() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [applications, setApplications] = useState<StartupPoolApplicationDto[]>([]);
  const [stripeStatuses, setStripeStatuses] = useState<Record<string, StripeConnectionStatusDto>>({});
  const [snapshots, setSnapshots] = useState<Record<string, StripeRevenueSnapshotDto>>({});
  const [proofJobs, setProofJobs] = useState<Record<string, ProofJobDto>>({});
  const [releaseTxHashes, setReleaseTxHashes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadApplications = useCallback(async () => {
    setError(null);
    try {
      const response = await client.listMyPoolApplications();
      setApplications(response.data);
    } catch (caughtError) {
      setError(
        caughtError instanceof PactApiClientError
          ? caughtError.message
          : "Could not load approved programs"
      );
    }
  }, [client]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const approvedApplications = applications.filter(
    (application) => application.status === "Accepted" && application.program && application.tranches?.length
  );

  const runStripeAction = (
    action: "status" | "connect" | "disconnect" | "snapshot" | "proof" | "submit",
    programId: string,
    tranche: NonNullable<StartupPoolApplicationDto["tranches"]>[number]
  ) => {
    const key = milestoneKey(programId, tranche.milestoneKey);
    setError(null);
    startTransition(async () => {
      try {
        if (action === "status") {
          const response = await client.getStripeConnectionStatus(programId);
          setStripeStatuses((current) => ({ ...current, [programId]: response.data }));
        }

        if (action === "connect") {
          const response = await client.startStripeOAuth(programId);
          window.location.href = response.data.authorizeUrl;
        }

        if (action === "disconnect") {
          const response = await client.disconnectStripe(programId);
          setStripeStatuses((current) => ({ ...current, [programId]: response.data }));
        }

        if (action === "snapshot") {
          if (!tranche.mrrPeriodStart || !tranche.mrrPeriodEnd || !tranche.mrrCurrency || !tranche.mrrThresholdCents) {
            throw new Error("This milestone does not have Stripe MRR policy terms");
          }
          const response = await client.createStripeRevenueSnapshot({
            programId,
            periodStart: tranche.mrrPeriodStart,
            periodEnd: tranche.mrrPeriodEnd,
            currency: tranche.mrrCurrency,
            thresholdCents: tranche.mrrThresholdCents
          });
          setSnapshots((current) => ({ ...current, [key]: response.data }));
        }

        if (action === "proof") {
          const snapshot = snapshots[key];
          if (!snapshot) {
            throw new Error("Create an MRR snapshot first");
          }
          const response = await client.generateStripeRevenueProof({
            snapshotId: snapshot.id,
            milestoneId: tranche.milestoneKey
          });
          setProofJobs((current) => ({ ...current, [key]: response.data }));
        }

        if (action === "submit") {
          const proofJob = proofJobs[key];
          if (!proofJob) {
            throw new Error("Generate the Groth16 proof first");
          }
          const response = (await client.submitStripeRevenueProof({
            proofJobId: proofJob.id,
            programId,
            milestoneKey: tranche.milestoneKey
          })) as { data?: { txHash?: string; tranche?: { txHash?: string | null } } };
          const txHash = response.data?.txHash ?? response.data?.tranche?.txHash ?? undefined;
          if (txHash) {
            setReleaseTxHashes((current) => ({ ...current, [key]: txHash }));
          }
          await loadApplications();
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : caughtError instanceof Error
              ? caughtError.message
              : "Stripe proof flow failed"
        );
      }
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="grid gap-3 md:grid-cols-5">
        {[
          "Approved program",
          "Connect Stripe",
          "Create MRR snapshot",
          "Generate Groth16 proof",
          "Release tranche"
        ].map((step, index) => (
          <div className="rounded-lg border bg-card p-4" key={step}>
            <div className="text-xs uppercase text-muted-foreground">Step {index + 1}</div>
            <div className="mt-2 text-sm font-medium">{step}</div>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Stripe MRR proof workspace</h2>
          <p className="text-sm text-muted-foreground">
            This is the founder-facing place to connect Stripe test mode and prove MRR for an approved milestone.
          </p>
        </div>
        <Button disabled={isPending} onClick={() => void loadApplications()} type="button" variant="outline">
          <RefreshCcwIcon />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {approvedApplications.map((application) =>
          (application.tranches ?? []).map((tranche) => {
            const key = milestoneKey(tranche.programId, tranche.milestoneKey);
            const proofJob = proofJobs[key];
            const snapshot = snapshots[key];
            const txHash = releaseTxHashes[key] ?? tranche.txHash ?? "";
            const proofAccepted =
              typeof proofJob?.proofJson?.["accepted"] === "boolean"
                ? proofJob.proofJson["accepted"]
                : snapshot?.thresholdPassed ?? null;

            return (
              <article className="rounded-xl border bg-card p-5" key={key}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">
                        {application.investmentPool?.name ?? "Approved program"}
                      </h3>
                      <Badge>{application.investmentPool?.poolType ?? "Program"}</Badge>
                      <Badge variant="secondary">{tranche.status}</Badge>
                    </div>
                    <div className="mt-2 font-mono text-xs text-muted-foreground">
                      Program {short(tranche.programId)} / milestone {tranche.milestoneKey}
                    </div>
                  </div>
                  {txHash ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={explorerTxUrl(txHash)} rel="noreferrer" target="_blank">
                        Explorer <ExternalLinkIcon />
                      </a>
                    </Button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
                  <span>Amount {tranche.amount}</span>
                  <span>MRR {tranche.mrrThresholdCents ?? "-"} {tranche.mrrCurrency ?? ""}</span>
                  <span>Stripe {stripeStatuses[tranche.programId]?.status ?? "not checked"}</span>
                  <span>Recipient {short(tranche.releaseToWallet)}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button disabled={isPending} onClick={() => runStripeAction("status", tranche.programId, tranche)} type="button" variant="outline">
                    Check Stripe
                  </Button>
                  <Button disabled={isPending} onClick={() => runStripeAction("connect", tranche.programId, tranche)} type="button">
                    Login with Stripe
                  </Button>
                  <Button disabled={isPending} onClick={() => runStripeAction("disconnect", tranche.programId, tranche)} type="button" variant="outline">
                    Disconnect
                  </Button>
                  <Button disabled={isPending} onClick={() => runStripeAction("snapshot", tranche.programId, tranche)} type="button" variant="outline">
                    Create MRR snapshot
                  </Button>
                  <Button disabled={isPending || !snapshot} onClick={() => runStripeAction("proof", tranche.programId, tranche)} type="button" variant="outline">
                    Generate ZK proof
                  </Button>
                  <Button disabled={isPending || proofAccepted !== true} onClick={() => runStripeAction("submit", tranche.programId, tranche)} type="button" variant="outline">
                    Release tranche
                  </Button>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <ReceiptRow label="Snapshot" value={snapshot?.id ?? "-"} />
                  <ReceiptRow label="Policy hash" value={snapshot?.policyHash ?? "-"} />
                  <ReceiptRow label="Proof job" value={proofJob?.id ?? "-"} />
                  <ReceiptRow label="Proof system" value={String(proofJob?.proofJson?.["proofSystem"] ?? "-")} />
                  <ReceiptRow label="Verification key" value={proofField(proofJob, "verificationKeyHash")} />
                  <ReceiptRow label="Proof digest" value={proofField(proofJob, "proofDigest")} />
                  <ReceiptRow label="Threshold" value={proofAccepted === null ? "-" : proofAccepted ? "passed" : "failed"} />
                  <ReceiptRow label="Contract tx" value={txHash || "-"} />
                </div>
              </article>
            );
          })
        )}
        {approvedApplications.length === 0 ? (
          <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            No approved investments yet. Apply to a pool first; after investor approval this screen will show the Stripe login and ZK proof actions.
          </div>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Stripe ZK proof failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
