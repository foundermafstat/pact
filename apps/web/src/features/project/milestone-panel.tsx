"use client";

import { useMemo, useState, useTransition } from "react";

import { webEnv } from "../../config/env";
import { PactApiClient, PactApiClientError } from "../../lib/api-client";
import { summarizeMilestoneInput, type MilestoneInputSummary } from "./milestone-model";

export function MilestonePanel() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [programId, setProgramId] = useState("");
  const [milestoneKey, setMilestoneKey] = useState("M1");
  const [wallet, setWallet] = useState("GPROJECT");
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
          const proofInput = await client.getMilestoneProofInput(
            programId,
            milestoneKey,
            wallet
          );
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
    <div className="workflow-panel">
      <div className="form-grid">
        <label className="field">
          <span>Program ID</span>
          <input value={programId} onChange={(event) => setProgramId(event.target.value)} />
        </label>
        <label className="field">
          <span>Milestone</span>
          <input value={milestoneKey} onChange={(event) => setMilestoneKey(event.target.value)} />
        </label>
        <label className="field">
          <span>Project wallet</span>
          <input value={wallet} onChange={(event) => setWallet(event.target.value)} />
        </label>
      </div>
      <div className="form-actions">
        <button className="primary-button" disabled={isPending || !programId} onClick={() => run("input")} type="button">
          Fetch input
        </button>
        <button className="secondary-button" disabled={isPending || !summary} onClick={() => run("proof")} type="button">
          Generate proof
        </button>
        <button className="secondary-button" disabled={isPending || !proofJobId} onClick={() => run("submit")} type="button">
          Submit payout
        </button>
      </div>
      {summary ? (
        <div className="summary-list">
          <span>Root {summary.milestoneRoot}</span>
          <span>Recipient {summary.recipient}</span>
          <span>Amount {summary.trancheAmount}</span>
        </div>
      ) : null}
      {proofJobId ? <span className="success-text">Proof job {proofJobId}</span> : null}
      {payoutTx ? <span className="success-text">Payout {payoutTx}</span> : null}
      {error ? <span className="error-text">{error}</span> : null}
    </div>
  );
}
