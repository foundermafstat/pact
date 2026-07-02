"use client";

import { useMemo, useState, useTransition } from "react";

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
    <div className="funding-panel">
      <div className="form-grid">
        <label className="field">
          <span>Program ID</span>
          <input value={programId} onChange={(event) => setProgramId(event.target.value)} />
        </label>
        <label className="field">
          <span>Fund amount</span>
          <input value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
      </div>
      <div className="form-actions">
        <button
          className="primary-button"
          disabled={isPending || !programId}
          onClick={() => runAction("fund")}
          type="button"
        >
          Fund program
        </button>
        <button
          className="secondary-button"
          disabled={isPending || !programId}
          onClick={() => runAction("activate")}
          type="button"
        >
          Activate
        </button>
        {fundingState ? (
          <span className="success-text">
            {fundingState.status} · {progress}% funded
          </span>
        ) : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
      <div className="progress-track" aria-label="Funding progress">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
