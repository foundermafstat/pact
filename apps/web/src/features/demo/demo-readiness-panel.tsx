"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  InvestmentPoolDto,
  StartupPoolApplicationDto,
  StartupProfileDto
} from "@pact/shared";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  RefreshCcwIcon
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { webEnv } from "@/config/env";
import { PactApiClient, PactApiClientError } from "@/lib/api-client";

const explorerTxUrl = (txHash: string): string => {
  const network = webEnv.stellarNetwork.toLowerCase() === "public" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${network}/tx/${txHash.replace(/^0x/, "")}`;
};

const shortId = (value: string | null | undefined): string =>
  value ? `${value.slice(0, 8)}...${value.slice(-6)}` : "-";

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card/70 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function DemoStep({
  description,
  href,
  label,
  ready
}: {
  description: string;
  href: string;
  label: string;
  ready: boolean;
}) {
  return (
    <div className="grid gap-3 rounded-lg border bg-card/70 p-4 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant={ready ? "default" : "outline"}>{ready ? "Ready" : "Action"}</Badge>
          <h3 className="font-medium">{label}</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href={href}>
          Open <ArrowRightIcon />
        </Link>
      </Button>
    </div>
  );
}

export function DemoReadinessPanel() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [applications, setApplications] = useState<StartupPoolApplicationDto[]>([]);
  const [pools, setPools] = useState<InvestmentPoolDto[]>([]);
  const [startups, setStartups] = useState<StartupProfileDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const [startupResponse, poolResponse, applicationResponse] = await Promise.all([
        client.listStartupProfiles(),
        client.listInvestmentPools("mine"),
        client.listIncomingPoolApplications()
      ]);
      setStartups(startupResponse.data);
      setPools(poolResponse.data);
      setApplications(applicationResponse.data);
    } catch (caughtError) {
      setError(
        caughtError instanceof PactApiClientError
          ? caughtError.message
          : "Could not load judge demo readiness data"
      );
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const tranches = applications.flatMap((application) => application.tranches ?? []);
  const acceptedApplications = applications.filter((application) => application.status === "Accepted");
  const pendingApplications = applications.filter((application) => application.status === "Submitted");
  const releasedTranches = tranches.filter(
    (tranche) => tranche.status === "Released" || Boolean(tranche.txHash)
  );
  const readyButUnreleased = tranches.filter(
    (tranche) => tranche.status !== "Released" && !tranche.txHash
  );
  const latestRelease = releasedTranches[0];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-4">
        <StatBlock label="Startup profiles" value={String(startups.length)} />
        <StatBlock label="Investment / grant pools" value={String(pools.length)} />
        <StatBlock label="Accepted applications" value={String(acceptedApplications.length)} />
        <StatBlock label="Released tranches" value={String(releasedTranches.length)} />
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Scripted judge happy path</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Use this sequence during the hackathon demo. Each step opens the real role-specific
              workspace that writes to the database or contract-backed flow.
            </p>
          </div>
          <Button disabled={isLoading} onClick={() => void loadData()} type="button" variant="outline">
            <RefreshCcwIcon />
            Refresh
          </Button>
        </div>
        <div className="mt-5 grid gap-3">
          <DemoStep
            description="Investor or admin defines the investment/grant pool, budget, stages and MRR milestone requirements."
            href="/dashboard/investor"
            label="1. Create pool"
            ready={pools.length > 0}
          />
          <DemoStep
            description="Founder creates the startup profile with traction, use of funds and investment request."
            href="/dashboard/startup"
            label="2. Register startup"
            ready={startups.length > 0}
          />
          <DemoStep
            description="Founder applies to the selected pool; investor receives the application in the review queue."
            href="/dashboard/startup"
            label="3. Apply to investment"
            ready={applications.length > 0}
          />
          <DemoStep
            description="Investor approves the startup, sets tranche terms and creates the on-chain escrow program."
            href="/dashboard/investor"
            label="4. Approve and fund milestone"
            ready={acceptedApplications.length > 0}
          />
          <DemoStep
            description="Founder connects Stripe test account, creates MRR snapshot, generates Groth16 proof and submits release."
            href="/dashboard/startup"
            label="5. Prove MRR and release tranche"
            ready={releasedTranches.length > 0}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Explorer-linked proof outcome</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The strongest judge moment is a released tranche with a testnet transaction.
          </p>
          {latestRelease?.txHash ? (
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Latest released tranche</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    Program {shortId(latestRelease.programId)} / milestone {latestRelease.milestoneKey}
                  </div>
                </div>
                <Button asChild variant="outline">
                  <a href={explorerTxUrl(latestRelease.txHash)} rel="noreferrer" target="_blank">
                    Open explorer <ExternalLinkIcon />
                  </a>
                </Button>
              </div>
              <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                <span>Amount {latestRelease.amount}</span>
                <span>Status {latestRelease.status}</span>
                <span className="truncate">Recipient {latestRelease.releaseToWallet}</span>
                <span className="truncate">Tx {latestRelease.txHash}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border p-4 text-sm text-muted-foreground">
              No released tranche with tx hash yet. Run the founder Stripe proof flow and return here.
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Operations snapshot</h2>
          <div className="mt-4 grid gap-3">
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <span>Applications waiting review</span>
              <Badge variant={pendingApplications.length > 0 ? "outline" : "default"}>
                {pendingApplications.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <span>Approved tranches not released</span>
              <Badge variant={readyButUnreleased.length > 0 ? "outline" : "default"}>
                {readyButUnreleased.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <span>Contract-backed releases</span>
              <Badge>{releasedTranches.length}</Badge>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">What judges can verify live</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            "Role-specific founder, investor and admin screens",
            "Database-backed startup, pool, application, program and tranche records",
            "Stripe test OAuth, MRR snapshot and local Groth16 proof job",
            "On-chain digest attestation and SAC tranche release",
            "Explorer-linked tx hash after successful contract release",
            "Admin view of the full marketplace and demo readiness state"
          ].map((item) => (
            <div className="flex gap-2 rounded-md border p-3 text-sm" key={item}>
              <CheckCircle2Icon className="mt-0.5 size-4 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Demo readiness failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
