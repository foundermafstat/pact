"use client";

import { useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { webEnv } from "../../config/env";
import { PactApiClient, PactApiClientError } from "../../lib/api-client";
import { getFundingProgress } from "./funding-model";

type FundingState = {
  fundedAmount: string;
  totalAmount: string;
  status: string;
};

export function FundProgramPanel() {
  const [programId, setProgramId] = useState("");
  const [amount, setAmount] = useState("100000000");
  const [fundingState, setFundingState] = useState<FundingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const progress = fundingState
    ? getFundingProgress(fundingState.fundedAmount, fundingState.totalAmount)
    : 0;

  const runAction = (action: "fund" | "activate") => {
    setError(null);
    startTransition(async () => {
      try {
        const response =
          action === "fund"
            ? await client.fundProgram(programId, { amount })
            : await client.activateProgram(programId);
        setFundingState({
          fundedAmount: response.data.program.fundedAmount,
          totalAmount: response.data.program.totalAmount,
          status: response.data.program.status
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Sponsor transaction failed"
        );
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fund-program-id">Program ID</Label>
          <Input
            id="fund-program-id"
            value={programId}
            onChange={(event) => setProgramId(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="fund-amount">Fund amount</Label>
          <Input
            id="fund-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={isPending || !programId}
          onClick={() => runAction("fund")}
          type="button"
        >
          Fund program
        </Button>
        <Button
          disabled={isPending || !programId}
          onClick={() => runAction("activate")}
          type="button"
          variant="outline"
        >
          Activate
        </Button>
        {fundingState ? (
          <Badge variant="secondary">
            {fundingState.status} · {progress}% funded
          </Badge>
        ) : null}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-label="Funding progress">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Funding failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
