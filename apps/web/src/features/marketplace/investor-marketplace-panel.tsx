"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type {
  CreateInvestmentPoolRequest,
  InvestmentCommitmentDto,
  InvestmentPoolDto,
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

export function InvestorMarketplacePanel() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [poolForm, setPoolForm] = useState<PoolForm>(defaultPoolForm);
  const [startups, setStartups] = useState<StartupProfileDto[]>([]);
  const [pools, setPools] = useState<InvestmentPoolDto[]>([]);
  const [commitments, setCommitments] = useState<InvestmentCommitmentDto[]>([]);
  const [commitmentInputs, setCommitmentInputs] = useState<
    Record<string, { amount: string; currency: string; note: string }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    try {
      const [startupResponse, poolResponse, commitmentResponse] = await Promise.all([
        client.listStartupProfiles(),
        client.listInvestmentPools("mine"),
        client.listMyInvestmentCommitments()
      ]);
      setStartups(startupResponse.data);
      setPools(poolResponse.data);
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

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            try {
              const response = await client.createInvestmentPool(poolForm);
              setPools((current) => [response.data, ...current]);
              setPoolForm(defaultPoolForm);
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
            {isPending ? "Creating..." : "Create pool"}
          </Button>
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

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Startup pool</h2>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Startup</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Founder</TableHead>
                  <TableHead>Commitment</TableHead>
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
                      <TableCell>
                        <div className="font-medium">{startup.name}</div>
                        <div className="text-xs text-muted-foreground">{startup.summary}</div>
                      </TableCell>
                      <TableCell>
                        <div>{startup.industry}</div>
                        <div className="text-xs text-muted-foreground">{startup.stage}</div>
                      </TableCell>
                      <TableCell>
                        {startup.requestedAmount} {startup.currency}
                      </TableCell>
                      <TableCell>{startup.requirements}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {shortWallet(startup.founderWallet)}
                      </TableCell>
                      <TableCell className="min-w-64">
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

        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">My investment pools</h2>
          <div className="flex flex-col gap-3">
            {pools.map((pool) => (
              <div className="rounded-md border p-4" key={pool.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{pool.name}</div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{pool.poolType}</Badge>
                    <Badge>{pool.status}</Badge>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{pool.thesis}</p>
                <div className="mt-3 grid gap-2 text-sm">
                  <div>{pool.targetIndustry}</div>
                  <div>{pool.stages}</div>
                  <div>
                    {pool.totalAmount} {pool.currency}
                  </div>
                  <div>{pool.requirements}</div>
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
              <div className="rounded-md border p-4" key={commitment.id}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    {commitment.amount} {commitment.currency}
                  </div>
                  <Badge variant="secondary">{commitment.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{commitment.note}</p>
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
