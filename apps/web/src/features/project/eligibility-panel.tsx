"use client";

import { useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="eligibility-wallet">Startup wallet</Label>
        <Input
          id="eligibility-wallet"
          value={wallet}
          onChange={(event) => setWallet(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={isPending}
          onClick={() => run("credential")}
          type="button"
        >
          Issue signed KYB
        </Button>
        <Button
          disabled={isPending || !credentialId}
          onClick={() => run("proof")}
          type="button"
          variant="outline"
        >
          Generate proof
        </Button>
        <Button
          disabled={isPending || !proofJobId}
          onClick={() => run("submit")}
          type="button"
          variant="outline"
        >
          Submit eligibility
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{getEligibilityStatusLabel(status)}</Badge>
        <span className="font-mono text-xs text-muted-foreground">
          {proofJobId ?? credentialId ?? "No credential yet"}
        </span>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Eligibility failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
