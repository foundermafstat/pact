"use client";

import { useMemo, useState, useTransition } from "react";

import { webEnv } from "../../config/env";
import { PactApiClient, PactApiClientError } from "../../lib/api-client";
import {
  getEligibilityStatusLabel,
  type EligibilityStepStatus
} from "./eligibility-model";

export function EligibilityPanel() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [wallet, setWallet] = useState("GPROJECT");
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [proofJobId, setProofJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<EligibilityStepStatus>("Idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: "credential" | "proof" | "submit") => {
    setError(null);
    startTransition(async () => {
      try {
        if (action === "credential") {
          const response = await client.createMockCredential({
            wallet,
            isAccredited: true,
            isNonUs: false,
            jurisdictionCode: "US",
            sanctionsPassed: true,
            expiresAt: 1785600000
          });
          setCredentialId(response.data.credential.id);
          setStatus("CredentialCreated");
        }

        if (action === "proof" && credentialId) {
          const response = await client.generateEligibilityProof({
            proofType: "Eligibility",
            credentialId
          });
          setProofJobId(response.data.id);
          setStatus("ProofReady");
        }

        if (action === "submit" && proofJobId) {
          setStatus("Submitted");
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Eligibility flow failed"
        );
      }
    });
  };

  return (
    <div className="workflow-panel">
      <label className="field">
        <span>Project wallet</span>
        <input value={wallet} onChange={(event) => setWallet(event.target.value)} />
      </label>
      <div className="form-actions">
        <button
          className="primary-button"
          disabled={isPending}
          onClick={() => run("credential")}
          type="button"
        >
          Pass mock KYB
        </button>
        <button
          className="secondary-button"
          disabled={isPending || !credentialId}
          onClick={() => run("proof")}
          type="button"
        >
          Generate proof
        </button>
        <button
          className="secondary-button"
          disabled={isPending || !proofJobId}
          onClick={() => run("submit")}
          type="button"
        >
          Submit eligibility
        </button>
      </div>
      <div className="workflow-status">
        <strong>{getEligibilityStatusLabel(status)}</strong>
        <span>{proofJobId ?? credentialId ?? "No credential yet"}</span>
      </div>
      {error ? <span className="error-text">{error}</span> : null}
    </div>
  );
}
