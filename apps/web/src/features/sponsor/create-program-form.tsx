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
  buildCreateProgramPayload,
  defaultCreateProgramForm,
  type CreateProgramFormState
} from "./form-model";

const fields: Array<{
  key: keyof CreateProgramFormState;
  label: string;
}> = [
  { key: "programKey", label: "Program key" },
  { key: "sponsorWallet", label: "Sponsor wallet" },
  { key: "projectWallet", label: "Project wallet" },
  { key: "assetContract", label: "Asset" },
  { key: "totalAmount", label: "Total amount" },
  { key: "eligibilityPolicyId", label: "Eligibility policy" },
  { key: "milestoneKey", label: "Milestone" },
  { key: "milestonePolicyId", label: "Milestone policy" },
  { key: "trancheAmount", label: "Tranche amount" },
  { key: "releaseToWallet", label: "Release wallet" }
];

export function CreateProgramForm() {
  const [form, setForm] = useState<CreateProgramFormState>(defaultCreateProgramForm);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setResult(null);
        startTransition(async () => {
          try {
            const response = await client.createProgram(buildCreateProgramPayload(form));
            setResult(response.data.program.id);
          } catch (caughtError) {
            setError(
              caughtError instanceof PactApiClientError
                ? caughtError.message
                : "Program creation failed"
            );
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <div className="flex flex-col gap-2" key={field.key}>
            <Label htmlFor={field.key}>{field.label}</Label>
            <Input
              id={field.key}
              value={form[field.key]}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [field.key]: event.target.value
                }))
              }
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={isPending} type="submit">
          {isPending ? "Creating..." : "Create program"}
        </Button>
        {result ? <Badge variant="secondary">Created {result}</Badge> : null}
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Program creation failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
