"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type {
  CreateStartupProfileRequest,
  InvestmentPoolDto,
  ProofJobDto,
  StartupPoolApplicationDto,
  StripeConnectionStatusDto,
  StripeRevenueSnapshotDto,
  StartupProfileDto
} from "@pact/shared";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { webEnv } from "@/config/env";
import { PactApiClient, PactApiClientError } from "@/lib/api-client";

type StartupProfileForm = CreateStartupProfileRequest;

const defaultForm: StartupProfileForm = {
  name: "",
  summary: "",
  industry: "",
  stage: "",
  website: "",
  requestedAmount: "",
  currency: "USDC",
  fundingUse: "",
  requirements: "",
  traction: ""
};

const shortWallet = (wallet: string): string =>
  wallet.length > 12 ? `${wallet.slice(0, 6)}...${wallet.slice(-6)}` : wallet;

const milestoneKey = (programId: string, milestoneKeyValue: string): string =>
  `${programId}:${milestoneKeyValue}`;

export function StartupProfilePanel() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [form, setForm] = useState<StartupProfileForm>(defaultForm);
  const [profiles, setProfiles] = useState<StartupProfileDto[]>([]);
  const [pools, setPools] = useState<InvestmentPoolDto[]>([]);
  const [applications, setApplications] = useState<StartupPoolApplicationDto[]>([]);
  const [stripeStatuses, setStripeStatuses] = useState<Record<string, StripeConnectionStatusDto>>({});
  const [snapshots, setSnapshots] = useState<Record<string, StripeRevenueSnapshotDto>>({});
  const [proofJobs, setProofJobs] = useState<Record<string, ProofJobDto>>({});
  const [releaseMessages, setReleaseMessages] = useState<Record<string, string>>({});
  const [applicationInputs, setApplicationInputs] = useState<
    Record<string, { startupProfileId: string; note: string }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadWorkspace = useCallback(async () => {
    try {
      const [profileResponse, poolResponse, applicationResponse] = await Promise.all([
        client.listMyStartupProfiles(),
        client.listInvestmentPools("open"),
        client.listMyPoolApplications()
      ]);
      setProfiles(profileResponse.data);
      setPools(poolResponse.data);
      setApplications(applicationResponse.data);
    } catch (caughtError) {
      setError(
        caughtError instanceof PactApiClientError
          ? caughtError.message
          : "Could not load startup workspace"
      );
    }
  }, [client]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const updateField = (key: keyof StartupProfileForm, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const updateApplicationInput = (
    poolId: string,
    patch: Partial<{ startupProfileId: string; note: string }>
  ) => {
    setApplicationInputs((current) => ({
      ...current,
      [poolId]: {
        startupProfileId:
          patch.startupProfileId ?? current[poolId]?.startupProfileId ?? profiles[0]?.id ?? "",
        note: patch.note ?? current[poolId]?.note ?? ""
      }
    }));
  };

  const applyToPool = (poolId: string) => {
    const input = applicationInputs[poolId] ?? {
      startupProfileId: profiles[0]?.id ?? "",
      note: ""
    };
    if (!input.startupProfileId) {
      setError("Create a startup profile before applying to a pool or grant");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await client.applyToInvestmentPool(poolId, input);
        setApplications((current) => [
          response.data,
          ...current.filter((item) => item.id !== response.data.id)
        ]);
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Pool application failed"
        );
      }
    });
  };

  const approvedApplications = useMemo(
    () => applications.filter((application) => application.status === "Accepted" && application.program),
    [applications]
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
          setSnapshots((current) => {
            const next = { ...current };
            delete next[key];
            return next;
          });
          setProofJobs((current) => {
            const next = { ...current };
            delete next[key];
            return next;
          });
        }

        if (action === "snapshot") {
          if (!tranche.mrrPeriodStart || !tranche.mrrPeriodEnd || !tranche.mrrCurrency || !tranche.mrrThresholdCents) {
            throw new Error("MRR milestone policy is missing");
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
            throw new Error("Generate a Stripe revenue snapshot first");
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
            throw new Error("Generate a Stripe revenue proof first");
          }
          await client.submitStripeRevenueProof({
            proofJobId: proofJob.id,
            programId,
            milestoneKey: tranche.milestoneKey
          });
          setReleaseMessages((current) => ({
            ...current,
            [key]: "Tranche release submitted to the smart contract"
          }));
          await loadWorkspace();
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : caughtError instanceof Error
              ? caughtError.message
              : "Stripe MRR proof flow failed"
        );
      }
    });
  };

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)]">
      <form
        className="flex min-w-0 flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            try {
              const response = await client.createStartupProfile(form);
              setProfiles((current) => [response.data, ...current]);
              setForm(defaultForm);
            } catch (caughtError) {
              setError(
                caughtError instanceof PactApiClientError
                  ? caughtError.message
                  : "Startup submission failed"
              );
            }
          });
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="startup-name">Startup name</Label>
            <Input
              id="startup-name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="startup-industry">Industry</Label>
            <Input
              id="startup-industry"
              value={form.industry}
              onChange={(event) => updateField("industry", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="startup-stage">Stage</Label>
            <Input
              id="startup-stage"
              value={form.stage}
              onChange={(event) => updateField("stage", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="startup-website">Website</Label>
            <Input
              id="startup-website"
              value={form.website}
              onChange={(event) => updateField("website", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="startup-amount">Investment request</Label>
            <Input
              id="startup-amount"
              inputMode="numeric"
              value={form.requestedAmount}
              onChange={(event) => updateField("requestedAmount", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="startup-currency">Currency</Label>
            <Input
              id="startup-currency"
              value={form.currency}
              onChange={(event) => updateField("currency", event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="startup-summary">Summary</Label>
          <Textarea
            id="startup-summary"
            value={form.summary}
            onChange={(event) => updateField("summary", event.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="startup-use">Use of funds</Label>
            <Textarea
              id="startup-use"
              value={form.fundingUse}
              onChange={(event) => updateField("fundingUse", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="startup-requirements">Investor requirements</Label>
            <Textarea
              id="startup-requirements"
              value={form.requirements}
              onChange={(event) => updateField("requirements", event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="startup-traction">Traction</Label>
          <Textarea
            id="startup-traction"
            value={form.traction}
            onChange={(event) => updateField("traction", event.target.value)}
          />
        </div>
        <Button disabled={isPending} type="submit">
          {isPending ? "Submitting..." : "Submit startup"}
        </Button>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Startup submission failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </form>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">My startup requests</h2>
          <Button onClick={() => void loadWorkspace()} type="button" variant="outline">
            Refresh
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {profiles.map((profile) => (
            <div className="min-w-0 rounded-md border p-4" key={profile.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{profile.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {shortWallet(profile.founderWallet)}
                  </div>
                </div>
                <Badge variant="secondary">{profile.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                {profile.summary}
              </p>
              <div className="mt-3 grid gap-2 text-sm">
                <div>{profile.industry} / {profile.stage}</div>
                <div>
                  {profile.requestedAmount} {profile.currency}
                </div>
                <div className="[overflow-wrap:anywhere]">{profile.requirements}</div>
              </div>
            </div>
          ))}
          {profiles.length === 0 ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              No startup requests yet.
            </div>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 xl:col-span-2">
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="text-base font-semibold">Approved investments and MRR milestones</h2>
          <div className="grid gap-3 xl:grid-cols-2">
            {approvedApplications.map((application) => (
              <div className="min-w-0 rounded-md border p-4" key={application.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {application.investmentPool?.name ?? "Approved investment"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Program {application.programId?.slice(0, 8)}
                    </div>
                  </div>
                  <Badge>{application.status}</Badge>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {(application.tranches ?? []).map((tranche) => {
                    const key = milestoneKey(tranche.programId, tranche.milestoneKey);
                    const proofJob = proofJobs[key];
                    const proofAccepted =
                      typeof proofJob?.proofJson?.["accepted"] === "boolean"
                        ? proofJob.proofJson["accepted"]
                        : null;

                    return (
                      <div className="rounded-md border p-3" key={key}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">{tranche.milestoneKey}</div>
                          <Badge variant="secondary">{tranche.status}</Badge>
                        </div>
                        <div className="mt-2 grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
                          <span>
                            Tranche {tranche.amount} to {shortWallet(tranche.releaseToWallet)}
                          </span>
                          <span>
                            MRR {tranche.mrrThresholdCents ?? "-"} {tranche.mrrCurrency ?? ""}
                          </span>
                          <span>
                            {tranche.mrrPeriodStart?.slice(0, 10) ?? "-"} to{" "}
                            {tranche.mrrPeriodEnd?.slice(0, 10) ?? "-"}
                          </span>
                          <span>
                            Stripe {stripeStatuses[tranche.programId]?.status ?? "not checked"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            disabled={isPending}
                            onClick={() => runStripeAction("status", tranche.programId, tranche)}
                            type="button"
                            variant="outline"
                          >
                            Check Stripe
                          </Button>
                          <Button
                            disabled={isPending}
                            onClick={() => runStripeAction("connect", tranche.programId, tranche)}
                            type="button"
                          >
                            Connect Stripe
                          </Button>
                          <Button
                            disabled={isPending}
                            onClick={() => runStripeAction("snapshot", tranche.programId, tranche)}
                            type="button"
                            variant="outline"
                          >
                            MRR snapshot
                          </Button>
                          <Button
                            disabled={isPending || !snapshots[key]}
                            onClick={() => runStripeAction("proof", tranche.programId, tranche)}
                            type="button"
                            variant="outline"
                          >
                            ZK proof
                          </Button>
                          <Button
                            disabled={isPending || proofAccepted !== true}
                            onClick={() => runStripeAction("submit", tranche.programId, tranche)}
                            type="button"
                            variant="outline"
                          >
                            Release tranche
                          </Button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {snapshots[key] ? (
                            <Badge variant="outline">Snapshot ready</Badge>
                          ) : null}
                          {proofAccepted !== null ? (
                            <Badge variant={proofAccepted ? "default" : "destructive"}>
                              MRR {proofAccepted ? "passed" : "failed"}
                            </Badge>
                          ) : null}
                          {releaseMessages[key] ? (
                            <Badge variant="secondary">{releaseMessages[key]}</Badge>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {approvedApplications.length === 0 ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                No approved investments yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="min-w-0 xl:col-span-2">
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <h2 className="text-base font-semibold">Available pools and grants</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {pools.map((pool) => {
                const selectedProfileId =
                  applicationInputs[pool.id]?.startupProfileId ?? profiles[0]?.id ?? "";

                return (
                  <div className="min-w-0 rounded-md border p-4" key={pool.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{pool.name}</div>
                      <Badge variant="secondary">{pool.poolType}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                      {pool.thesis}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm">
                      <div>{pool.targetIndustry}</div>
                      <div className="[overflow-wrap:anywhere]">{pool.stages}</div>
                      <div>
                        {pool.totalAmount} {pool.currency}
                      </div>
                      <div className="[overflow-wrap:anywhere]">{pool.requirements}</div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      <Select
                        disabled={profiles.length === 0}
                        onValueChange={(value) =>
                          updateApplicationInput(pool.id, { startupProfileId: value })
                        }
                        value={selectedProfileId}
                      >
                        <SelectTrigger aria-label="Startup profile">
                          <SelectValue placeholder="Startup profile" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder="Application note"
                        value={applicationInputs[pool.id]?.note ?? ""}
                        onChange={(event) =>
                          updateApplicationInput(pool.id, { note: event.target.value })
                        }
                      />
                      <Button
                        disabled={isPending || profiles.length === 0}
                        onClick={() => applyToPool(pool.id)}
                        type="button"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                );
              })}
              {pools.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                  No open pools or grants yet.
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <h2 className="text-base font-semibold">My applications</h2>
            <div className="flex flex-col gap-3">
              {applications.map((application) => (
                <div className="min-w-0 rounded-md border p-4" key={application.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">
                        {application.investmentPool?.name ?? "Investment flow"}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {application.investmentPoolId.slice(0, 8)}
                      </div>
                    </div>
                    <Badge variant="secondary">{application.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {application.note}
                  </p>
                  {application.programId ? (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Program {application.programId.slice(0, 8)}
                    </div>
                  ) : null}
                </div>
              ))}
              {applications.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                  No pool or grant applications yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
