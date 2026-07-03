"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type {
  ApproveStartupPoolApplicationRequest,
  CreateInvestmentPoolRequest,
  InvestmentCommitmentDto,
  InvestmentPoolDto,
  StartupPoolApplicationDto,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { webEnv } from "@/config/env";
import { PactApiClient, PactApiClientError } from "@/lib/api-client";

type PoolForm = CreateInvestmentPoolRequest;

const defaultPoolForm: PoolForm = {
  name: "",
  poolType: "Investment",
  thesis: "",
  targetIndustry: "",
  stages: "",
  totalAmount: "",
  currency: "USDC",
  requirements: ""
};

const shortWallet = (wallet: string): string =>
  wallet.length > 12 ? `${wallet.slice(0, 6)}...${wallet.slice(-6)}` : wallet;

const defaultPeriodStart = (): string => {
  const date = new Date();
  date.setUTCDate(1);
  return date.toISOString().slice(0, 10);
};

const defaultPeriodEnd = (): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

type ApprovalInput = {
  amount: string;
  releaseToWallet: string;
  thresholdCents: string;
  mrrCurrency: string;
  periodStart: string;
  periodEnd: string;
};

export function InvestorMarketplacePanel() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [poolForm, setPoolForm] = useState<PoolForm>(defaultPoolForm);
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [startups, setStartups] = useState<StartupProfileDto[]>([]);
  const [pools, setPools] = useState<InvestmentPoolDto[]>([]);
  const [applications, setApplications] = useState<StartupPoolApplicationDto[]>([]);
  const [commitments, setCommitments] = useState<InvestmentCommitmentDto[]>([]);
  const [commitmentInputs, setCommitmentInputs] = useState<
    Record<string, { amount: string; currency: string; note: string }>
  >({});
  const [approvalInputs, setApprovalInputs] = useState<Record<string, ApprovalInput>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    try {
      const [startupResponse, poolResponse, applicationResponse, commitmentResponse] = await Promise.all([
        client.listStartupProfiles(),
        client.listInvestmentPools("mine"),
        client.listIncomingPoolApplications(),
        client.listMyInvestmentCommitments()
      ]);
      setStartups(startupResponse.data);
      setPools(poolResponse.data);
      setApplications(applicationResponse.data);
      setCommitments(commitmentResponse.data);
    } catch (caughtError) {
      setError(
        caughtError instanceof PactApiClientError
          ? caughtError.message
          : "Could not load marketplace data"
      );
    }
  }, [client]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updatePoolField = (key: keyof PoolForm, value: string) => {
    setPoolForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const editPool = (pool: InvestmentPoolDto) => {
    setEditingPoolId(pool.id);
    setPoolForm({
      name: pool.name,
      poolType: pool.poolType,
      thesis: pool.thesis,
      targetIndustry: pool.targetIndustry,
      stages: pool.stages,
      totalAmount: pool.totalAmount,
      currency: pool.currency,
      requirements: pool.requirements
    });
  };

  const resetPoolForm = () => {
    setEditingPoolId(null);
    setPoolForm(defaultPoolForm);
  };

  const archivePool = (poolId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await client.archiveInvestmentPool(poolId);
        setPools((current) =>
          current.map((pool) => (pool.id === response.data.id ? response.data : pool))
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Pool archive failed"
        );
      }
    });
  };

  const updateCommitmentInput = (
    startupId: string,
    patch: Partial<{ amount: string; currency: string; note: string }>
  ) => {
    setCommitmentInputs((current) => ({
      ...current,
      [startupId]: {
        amount: patch.amount ?? current[startupId]?.amount ?? "",
        currency: patch.currency ?? current[startupId]?.currency ?? "USDC",
        note: patch.note ?? current[startupId]?.note ?? ""
      }
    }));
  };

  const approvalInputFor = (application: StartupPoolApplicationDto): ApprovalInput =>
    approvalInputs[application.id] ?? {
      amount: application.startupProfile?.requestedAmount ?? "",
      releaseToWallet: application.founderWallet,
      thresholdCents: "1000000",
      mrrCurrency: "usd",
      periodStart: defaultPeriodStart(),
      periodEnd: defaultPeriodEnd()
    };

  const updateApprovalInput = (application: StartupPoolApplicationDto, patch: Partial<ApprovalInput>) => {
    setApprovalInputs((current) => ({
      ...current,
      [application.id]: {
        ...approvalInputFor(application),
        ...patch
      }
    }));
  };

  const createCommitment = (startupId: string) => {
    const input = commitmentInputs[startupId] ?? {
      amount: "",
      currency: "USDC",
      note: ""
    };

    setError(null);
    startTransition(async () => {
      try {
        const response = await client.createInvestmentCommitment(startupId, input);
        setCommitments((current) => [response.data, ...current]);
        setCommitmentInputs((current) => ({
          ...current,
          [startupId]: { amount: "", currency: "USDC", note: "" }
        }));
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Investment commitment failed"
        );
      }
    });
  };

  const approveApplication = (application: StartupPoolApplicationDto) => {
    const input = approvalInputFor(application);
    const payload: ApproveStartupPoolApplicationRequest = {
      approvedAmount: input.amount,
      assetContract: application.investmentPool?.currency ?? "USDC",
      eligibilityPolicyId: "marketplace-eligibility",
      tranches: [
        {
          milestoneKey: "M1",
          milestonePolicyId: "stripe-mrr-policy",
          amount: input.amount,
          releaseToWallet: input.releaseToWallet,
          mrrThresholdCents: input.thresholdCents,
          mrrCurrency: input.mrrCurrency,
          mrrPeriodStart: input.periodStart,
          mrrPeriodEnd: input.periodEnd
        }
      ]
    };

    setError(null);
    startTransition(async () => {
      try {
        const response = await client.approvePoolApplication(application.id, payload);
        setApplications((current) =>
          current.map((item) => (item.id === response.data.id ? response.data : item))
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Application approval failed"
        );
      }
    });
  };

  const rejectApplication = (applicationId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await client.rejectPoolApplication(applicationId);
        setApplications((current) =>
          current.map((item) => (item.id === response.data.id ? response.data : item))
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Application rejection failed"
        );
      }
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <form
        className="flex min-w-0 flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            try {
              if (editingPoolId) {
                const response = await client.updateInvestmentPool(editingPoolId, poolForm);
                setPools((current) =>
                  current.map((pool) => (pool.id === response.data.id ? response.data : pool))
                );
                resetPoolForm();
                return;
              }

              const response = await client.createInvestmentPool(poolForm);
              setPools((current) => [response.data, ...current]);
              resetPoolForm();
            } catch (caughtError) {
              setError(
                caughtError instanceof PactApiClientError
                  ? caughtError.message
                  : "Pool creation failed"
              );
            }
          });
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pool-name">Pool name</Label>
            <Input
              id="pool-name"
              value={poolForm.name}
              onChange={(event) => updatePoolField("name", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pool-type">Type</Label>
            <Select
              value={poolForm.poolType}
              onValueChange={(value) => updatePoolField("poolType", value)}
            >
              <SelectTrigger id="pool-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Investment">Investment</SelectItem>
                <SelectItem value="Grant">Grant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pool-industry">Target industry</Label>
            <Input
              id="pool-industry"
              value={poolForm.targetIndustry}
              onChange={(event) => updatePoolField("targetIndustry", event.target.value)}
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pool-amount">Budget</Label>
              <Input
                id="pool-amount"
                inputMode="numeric"
                value={poolForm.totalAmount}
                onChange={(event) => updatePoolField("totalAmount", event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pool-currency">Currency</Label>
              <Input
                id="pool-currency"
                value={poolForm.currency}
                onChange={(event) => updatePoolField("currency", event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pool-thesis">Investment thesis</Label>
            <Textarea
              id="pool-thesis"
              value={poolForm.thesis}
              onChange={(event) => updatePoolField("thesis", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pool-requirements">Requirements</Label>
            <Textarea
              id="pool-requirements"
              value={poolForm.requirements}
              onChange={(event) => updatePoolField("requirements", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="pool-stages">Investment stages</Label>
            <Textarea
              id="pool-stages"
              value={poolForm.stages}
              onChange={(event) => updatePoolField("stages", event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={isPending} type="submit">
            {isPending ? "Saving..." : editingPoolId ? "Update pool" : "Create pool"}
          </Button>
          {editingPoolId ? (
            <Button onClick={resetPoolForm} type="button" variant="outline">
              Cancel edit
            </Button>
          ) : null}
          <Button onClick={() => void loadData()} type="button" variant="outline">
            Refresh
          </Button>
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Marketplace action failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </form>

      <div className="flex min-w-0 flex-col gap-3">
        <h2 className="text-base font-semibold">Incoming startup applications</h2>
        <div className="grid gap-3 xl:grid-cols-2">
          {applications.map((application) => {
            const input = approvalInputFor(application);
            const startup = application.startupProfile;
            const pool = application.investmentPool;

            return (
              <div className="min-w-0 rounded-md border p-4" key={application.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{startup?.name ?? "Startup application"}</div>
                    <div className="text-xs text-muted-foreground">
                      {pool?.name ?? application.investmentPoolId.slice(0, 8)}
                    </div>
                  </div>
                  <Badge variant={application.status === "Accepted" ? "default" : "secondary"}>
                    {application.status}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {application.note}
                </p>
                {startup ? (
                  <div className="mt-3 grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
                    <span>{startup.industry} / {startup.stage}</span>
                    <span>
                      Requested {startup.requestedAmount} {startup.currency}
                    </span>
                    <span className="[overflow-wrap:anywhere] md:col-span-2">
                      {startup.traction}
                    </span>
                  </div>
                ) : null}
                {application.programId ? (
                  <div className="mt-4 rounded-md border p-3 text-sm">
                    Program {application.programId.slice(0, 8)} created with{" "}
                    {application.tranches?.length ?? 0} milestone(s).
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`approval-amount-${application.id}`}>Approved amount</Label>
                        <Input
                          id={`approval-amount-${application.id}`}
                          inputMode="numeric"
                          value={input.amount}
                          onChange={(event) =>
                            updateApprovalInput(application, { amount: event.target.value })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`approval-wallet-${application.id}`}>Release wallet</Label>
                        <Input
                          id={`approval-wallet-${application.id}`}
                          value={input.releaseToWallet}
                          onChange={(event) =>
                            updateApprovalInput(application, {
                              releaseToWallet: event.target.value
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`approval-threshold-${application.id}`}>MRR cents</Label>
                        <Input
                          id={`approval-threshold-${application.id}`}
                          inputMode="numeric"
                          value={input.thresholdCents}
                          onChange={(event) =>
                            updateApprovalInput(application, {
                              thresholdCents: event.target.value
                            })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`approval-currency-${application.id}`}>Stripe currency</Label>
                        <Input
                          id={`approval-currency-${application.id}`}
                          value={input.mrrCurrency}
                          onChange={(event) =>
                            updateApprovalInput(application, { mrrCurrency: event.target.value })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`approval-start-${application.id}`}>Period start</Label>
                        <Input
                          id={`approval-start-${application.id}`}
                          type="date"
                          value={input.periodStart}
                          onChange={(event) =>
                            updateApprovalInput(application, { periodStart: event.target.value })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`approval-end-${application.id}`}>Period end</Label>
                        <Input
                          id={`approval-end-${application.id}`}
                          type="date"
                          value={input.periodEnd}
                          onChange={(event) =>
                            updateApprovalInput(application, { periodEnd: event.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={isPending || application.status === "Rejected"}
                        onClick={() => approveApplication(application)}
                        type="button"
                      >
                        Approve startup
                      </Button>
                      <Button
                        disabled={isPending}
                        onClick={() => rejectApplication(application.id)}
                        type="button"
                        variant="outline"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {applications.length === 0 ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              No incoming applications yet.
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="text-base font-semibold">Startup pool</h2>
          <div className="min-w-0 overflow-hidden rounded-md border">
            <Table className="min-w-[1040px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[24%] whitespace-normal">Startup</TableHead>
                  <TableHead className="w-[13%] whitespace-normal">Industry</TableHead>
                  <TableHead className="w-[10%] whitespace-normal">Request</TableHead>
                  <TableHead className="w-[21%] whitespace-normal">Requirements</TableHead>
                  <TableHead className="w-[12%] whitespace-normal">Founder</TableHead>
                  <TableHead className="w-[20%] whitespace-normal">Commitment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {startups.map((startup) => {
                  const commitmentInput = commitmentInputs[startup.id] ?? {
                    amount: "",
                    currency: "USDC",
                    note: ""
                  };

                  return (
                    <TableRow key={startup.id}>
                      <TableCell className="whitespace-normal align-top">
                        <div className="font-medium">{startup.name}</div>
                        <div className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                          {startup.summary}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal align-top">
                        <div>{startup.industry}</div>
                        <div className="text-xs text-muted-foreground">{startup.stage}</div>
                      </TableCell>
                      <TableCell className="whitespace-normal align-top">
                        {startup.requestedAmount} {startup.currency}
                      </TableCell>
                      <TableCell className="whitespace-normal align-top text-muted-foreground [overflow-wrap:anywhere]">
                        {startup.requirements}
                      </TableCell>
                      <TableCell className="whitespace-normal align-top font-mono text-xs [overflow-wrap:anywhere]">
                        {shortWallet(startup.founderWallet)}
                      </TableCell>
                      <TableCell className="whitespace-normal align-top">
                        <div className="grid gap-2">
                          <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-2">
                            <Input
                              inputMode="numeric"
                              placeholder="Amount"
                              value={commitmentInput.amount}
                              onChange={(event) =>
                                updateCommitmentInput(startup.id, {
                                  amount: event.target.value
                                })
                              }
                            />
                            <Input
                              value={commitmentInput.currency}
                              onChange={(event) =>
                                updateCommitmentInput(startup.id, {
                                  currency: event.target.value
                                })
                              }
                            />
                          </div>
                          <Input
                            placeholder="Note"
                            value={commitmentInput.note}
                            onChange={(event) =>
                              updateCommitmentInput(startup.id, {
                                note: event.target.value
                              })
                            }
                          />
                          <Button
                            disabled={isPending}
                            onClick={() => createCommitment(startup.id)}
                            type="button"
                          >
                            Commit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {startups.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={6}>
                      No startup requests in the pool.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="text-base font-semibold">My investment pools</h2>
          <div className="flex flex-col gap-3">
            {pools.map((pool) => (
              <div className="min-w-0 rounded-md border p-4" key={pool.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{pool.name}</div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{pool.poolType}</Badge>
                    <Badge>{pool.status}</Badge>
                  </div>
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => editPool(pool)} type="button" variant="outline">
                    Edit pool
                  </Button>
                  <Button
                    disabled={pool.status === "Archived"}
                    onClick={() => archivePool(pool.id)}
                    type="button"
                    variant="outline"
                  >
                    Archive
                  </Button>
                </div>
              </div>
            ))}
            {pools.length === 0 ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                No investment pools yet.
              </div>
            ) : null}
          </div>
          <h2 className="mt-3 text-base font-semibold">My commitments</h2>
          <div className="flex flex-col gap-3">
            {commitments.map((commitment) => (
              <div className="min-w-0 rounded-md border p-4" key={commitment.id}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    {commitment.amount} {commitment.currency}
                  </div>
                  <Badge variant="secondary">{commitment.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {commitment.note}
                </p>
              </div>
            ))}
            {commitments.length === 0 ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                No startup investment commitments yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
