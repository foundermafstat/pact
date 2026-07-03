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
import { ExternalLinkIcon } from "lucide-react";

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
      <div className="text-[0.7rem] uppercase text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-xs">{value || "-"}</div>
    </div>
  );
}

function ProofReceipt({
  proofJob,
  releaseTxHash,
  snapshot,
  tranche
}: {
  proofJob: ProofJobDto | undefined;
  releaseTxHash: string | undefined;
  snapshot: StripeRevenueSnapshotDto | undefined;
  tranche: NonNullable<StartupPoolApplicationDto["tranches"]>[number];
}) {
  const txHash = releaseTxHash ?? tranche.txHash ?? "";
  const proofAccepted =
    typeof proofJob?.proofJson?.["accepted"] === "boolean"
      ? proofJob.proofJson["accepted"]
      : snapshot?.thresholdPassed ?? null;
  const steps = [
    { label: "Program", ready: true },
    { label: "Stripe snapshot", ready: Boolean(snapshot) },
    { label: "Groth16 proof", ready: proofJob?.status === "Succeeded" },
    { label: "MRR policy", ready: proofAccepted === true },
    { label: "Contract release", ready: Boolean(txHash) || tranche.status === "Released" }
  ];

  return (
    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium">Guided proof receipt</div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Judge-facing trace from approved milestone to Stripe MRR proof and smart contract
            tranche release. Only redacted public inputs and commitments are shown.
          </p>
        </div>
        {txHash ? (
          <Button asChild size="sm" variant="outline">
            <a href={explorerTxUrl(txHash)} rel="noreferrer" target="_blank">
              Explorer <ExternalLinkIcon />
            </a>
          </Button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-5">
        {steps.map((step, index) => (
          <div
            className="rounded-md border bg-background/45 p-2 text-xs"
            key={step.label}
          >
            <div className="text-muted-foreground">Step {index + 1}</div>
            <div className="mt-1 font-medium">{step.label}</div>
            <Badge className="mt-2" variant={step.ready ? "default" : "outline"}>
              {step.ready ? "Ready" : "Waiting"}
            </Badge>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <ReceiptRow label="Program" value={tranche.programId} />
        <ReceiptRow label="Milestone" value={tranche.milestoneKey} />
        <ReceiptRow label="Proof job" value={proofJob?.id ?? "-"} />
        <ReceiptRow label="Proof system" value={String(proofJob?.proofJson?.["proofSystem"] ?? "-")} />
        <ReceiptRow label="Verification key" value={proofField(proofJob, "verificationKeyHash")} />
        <ReceiptRow label="Proof digest" value={proofField(proofJob, "proofDigest")} />
        <ReceiptRow label="Policy hash" value={snapshot?.policyHash ?? "-"} />
        <ReceiptRow label="Snapshot commitment" value={snapshot?.snapshotCommitment ?? "-"} />
        <ReceiptRow label="Threshold result" value={proofAccepted === null ? "-" : proofAccepted ? "passed" : "failed"} />
        <ReceiptRow label="Release wallet" value={tranche.releaseToWallet} />
        <ReceiptRow label="Contract tx" value={txHash || "-"} />
        <ReceiptRow label="Tranche status" value={tranche.status} />
      </div>
    </div>
  );
}

export function StartupProfilePanel() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [form, setForm] = useState<StartupProfileForm>(defaultForm);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<StartupProfileDto[]>([]);
  const [pools, setPools] = useState<InvestmentPoolDto[]>([]);
  const [applications, setApplications] = useState<StartupPoolApplicationDto[]>([]);
  const [stripeStatuses, setStripeStatuses] = useState<Record<string, StripeConnectionStatusDto>>({});
  const [snapshots, setSnapshots] = useState<Record<string, StripeRevenueSnapshotDto>>({});
  const [proofJobs, setProofJobs] = useState<Record<string, ProofJobDto>>({});
  const [releaseTxHashes, setReleaseTxHashes] = useState<Record<string, string>>({});
  const [releaseMessages, setReleaseMessages] = useState<Record<string, string>>({});
  const [applicationInputs, setApplicationInputs] = useState<
    Record<string, { startupProfileId: string; note: string }>
  >({});
  const [applicationNoteInputs, setApplicationNoteInputs] = useState<Record<string, string>>({});
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

  const editProfile = (profile: StartupProfileDto) => {
    setEditingProfileId(profile.id);
    setForm({
      name: profile.name,
      summary: profile.summary,
      industry: profile.industry,
      stage: profile.stage,
      website: profile.website ?? "",
      requestedAmount: profile.requestedAmount,
      currency: profile.currency,
      fundingUse: profile.fundingUse,
      requirements: profile.requirements,
      traction: profile.traction
    });
  };

  const resetProfileForm = () => {
    setEditingProfileId(null);
    setForm(defaultForm);
  };

  const archiveProfile = (profileId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await client.archiveStartupProfile(profileId);
        setProfiles((current) =>
          current.map((profile) => (profile.id === response.data.id ? response.data : profile))
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Startup archive failed"
        );
      }
    });
  };

  const updateApplicationNote = (application: StartupPoolApplicationDto) => {
    const note = applicationNoteInputs[application.id] ?? application.note;
    setError(null);
    startTransition(async () => {
      try {
        const response = await client.updatePoolApplication(application.id, { note });
        setApplications((current) =>
          current.map((item) => (item.id === response.data.id ? response.data : item))
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Application update failed"
        );
      }
    });
  };

  const retractApplication = (applicationId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await client.retractPoolApplication(applicationId);
        setApplications((current) => current.filter((item) => item.id !== applicationId));
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Application retract failed"
        );
      }
    });
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
          const response = (await client.submitStripeRevenueProof({
            proofJobId: proofJob.id,
            programId,
            milestoneKey: tranche.milestoneKey
          })) as { data?: { txHash?: string; tranche?: { txHash?: string | null } } };
          const txHash = response.data?.txHash ?? response.data?.tranche?.txHash ?? undefined;
          if (txHash) {
            setReleaseTxHashes((current) => ({ ...current, [key]: txHash }));
          }
          setReleaseMessages((current) => ({
            ...current,
            [key]: txHash
              ? "Tranche released on testnet"
              : "Tranche release submitted to the smart contract"
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
              if (editingProfileId) {
                const response = await client.updateStartupProfile(editingProfileId, form);
                setProfiles((current) =>
                  current.map((profile) => (profile.id === response.data.id ? response.data : profile))
                );
                resetProfileForm();
                return;
              }

              const response = await client.createStartupProfile(form);
              setProfiles((current) => [response.data, ...current]);
              resetProfileForm();
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
        <div className="flex flex-wrap gap-2">
          <Button disabled={isPending} type="submit">
            {isPending
              ? "Saving..."
              : editingProfileId
                ? "Update startup"
                : "Submit startup"}
          </Button>
          {editingProfileId ? (
            <Button onClick={resetProfileForm} type="button" variant="outline">
              Cancel edit
            </Button>
          ) : null}
        </div>
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
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => editProfile(profile)} type="button" variant="outline">
                  Edit startup
                </Button>
                <Button
                  disabled={profile.status === "Archived"}
                  onClick={() => archiveProfile(profile.id)}
                  type="button"
                  variant="outline"
                >
                  Archive
                </Button>
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
                        <ProofReceipt
                          proofJob={proofJob}
                          releaseTxHash={releaseTxHashes[key]}
                          snapshot={snapshots[key]}
                          tranche={tranche}
                        />
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
                  {application.status !== "Accepted" ? (
                    <div className="mt-3 grid gap-2">
                      <Textarea
                        aria-label="Application note"
                        value={applicationNoteInputs[application.id] ?? application.note}
                        onChange={(event) =>
                          setApplicationNoteInputs((current) => ({
                            ...current,
                            [application.id]: event.target.value
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={isPending}
                          onClick={() => updateApplicationNote(application)}
                          type="button"
                          variant="outline"
                        >
                          Save note
                        </Button>
                        <Button
                          disabled={isPending}
                          onClick={() => retractApplication(application.id)}
                          type="button"
                          variant="outline"
                        >
                          Withdraw
                        </Button>
                      </div>
                    </div>
                  ) : null}
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
