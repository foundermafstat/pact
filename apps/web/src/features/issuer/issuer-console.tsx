"use client";

import { useMemo, useState, useTransition } from "react";
import type { RootDto } from "@pact/shared";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="issuer-wallet">Wallet</Label>
        <Input
          id="issuer-wallet"
          value={wallet}
          onChange={(event) => setWallet(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending} onClick={() => run("credential")} type="button">
          Create credential
        </Button>
        <Button disabled={isPending} onClick={() => run("build")} type="button" variant="outline">
          Build root
        </Button>
        <Button disabled={isPending || !rootId} onClick={() => run("publish")} type="button" variant="outline">
          Publish root
        </Button>
        <Button disabled={isPending || !credentialId} onClick={() => run("revoke")} type="button" variant="outline">
          Revoke credential
        </Button>
        <Button disabled={isPending} onClick={() => run("rotate")} type="button" variant="outline">
          Rotate root
        </Button>
      </div>
      {credentialId ? <Badge variant="secondary">Credential {credentialId}</Badge> : null}
      {rootSummary ? (
        <div className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-3">
          <span className="truncate">Root {rootSummary.root}</span>
          <span>Status {rootSummary.status}</span>
          <span className="truncate">Tx {rootSummary.txHash ?? "Pending"}</span>
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Issuer operation failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
