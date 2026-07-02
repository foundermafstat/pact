"use client";

import { useMemo, useState, useTransition } from "react";
import type { RootDto } from "@pact/shared";

import { webEnv } from "../../config/env";
import { PactApiClient, PactApiClientError } from "../../lib/api-client";
import { toSafeRootSummary, type SafeRootSummary } from "./issuer-model";

const defaultPolicyId = "22222222-2222-4222-8222-222222222222";

export function IssuerConsole() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [wallet, setWallet] = useState("GPROJECT");
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [rootId, setRootId] = useState<string | null>(null);
  const [rootSummary, setRootSummary] = useState<SafeRootSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: "credential" | "build" | "publish" | "revoke" | "rotate") => {
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
        }

        if (action === "build" || action === "rotate") {
          const response = await client.buildIssuerRoot({
            policyId: defaultPolicyId,
            rootType: "Credential"
          });
          const root = (response as { data: RootDto }).data;
          setRootId(root.id);
          setRootSummary(toSafeRootSummary(root));
        }

        if (action === "publish" && rootId) {
          const response = await client.publishIssuerRoot({ rootId });
          setRootSummary(toSafeRootSummary(response.data));
        }

        if (action === "revoke" && credentialId) {
          await client.revokeCredential(credentialId);
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Issuer operation failed"
        );
      }
    });
  };

  return (
    <div className="workflow-panel">
      <label className="field">
        <span>Wallet</span>
        <input value={wallet} onChange={(event) => setWallet(event.target.value)} />
      </label>
      <div className="form-actions">
        <button className="primary-button" disabled={isPending} onClick={() => run("credential")} type="button">
          Create credential
        </button>
        <button className="secondary-button" disabled={isPending} onClick={() => run("build")} type="button">
          Build root
        </button>
        <button className="secondary-button" disabled={isPending || !rootId} onClick={() => run("publish")} type="button">
          Publish root
        </button>
        <button className="secondary-button" disabled={isPending || !credentialId} onClick={() => run("revoke")} type="button">
          Revoke credential
        </button>
        <button className="secondary-button" disabled={isPending} onClick={() => run("rotate")} type="button">
          Rotate root
        </button>
      </div>
      {credentialId ? <span className="success-text">Credential {credentialId}</span> : null}
      {rootSummary ? (
        <div className="summary-list">
          <span>Root {rootSummary.root}</span>
          <span>Status {rootSummary.status}</span>
          <span>Tx {rootSummary.txHash ?? "Pending"}</span>
        </div>
      ) : null}
      {error ? <span className="error-text">{error}</span> : null}
    </div>
  );
}
