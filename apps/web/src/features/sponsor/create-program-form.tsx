"use client";

import { useMemo, useState, useTransition } from "react";

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
      className="form-grid"
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
      {fields.map((field) => (
        <label className="field" key={field.key}>
          <span>{field.label}</span>
          <input
            value={form[field.key]}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                [field.key]: event.target.value
              }))
            }
          />
        </label>
      ))}
      <div className="form-actions">
        <button className="primary-button" disabled={isPending} type="submit">
          {isPending ? "Creating..." : "Create program"}
        </button>
        {result ? <span className="success-text">Created {result}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
