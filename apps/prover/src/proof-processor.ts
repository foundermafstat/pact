import { createHash, randomUUID } from "node:crypto";

import type { ProofType } from "@pact/shared";

import type { ProverConfig } from "./config";

export const PROOF_QUEUE_NAME = "proof-jobs";

export type ProofJobPayload = {
  proofJobId: string;
  proofType: ProofType;
  requestJson: Record<string, unknown>;
  publicInputsJson?: Record<string, unknown> | null;
  privateInputsJson?: Record<string, unknown> | null;
};

export type ProofProcessorResult = {
  proofJson: Record<string, unknown>;
  publicInputsJson: Record<string, unknown>;
};

const sha256Hex = (value: string): `0x${string}` =>
  `0x${createHash("sha256").update(value).digest("hex")}`;

export const createMockProofPayload = (
  payload: ProofJobPayload
): ProofProcessorResult => {
  const proofId = sha256Hex(
    JSON.stringify({
      proofJobId: payload.proofJobId,
      proofType: payload.proofType,
      requestJson: payload.requestJson,
      publicInputsJson: payload.publicInputsJson ?? {}
    })
  );

  return {
    proofJson: {
      mode: "mock",
      proofId,
      proof: `mock-proof-${randomUUID()}`,
      generatedAt: new Date().toISOString()
    },
    publicInputsJson: payload.publicInputsJson ?? {}
  };
};

export const processProofJob = async (
  payload: ProofJobPayload,
  config: Pick<ProverConfig, "proverMode">
): Promise<ProofProcessorResult> => {
  if (config.proverMode !== "mock") {
    throw new Error("Local proving artifacts are not configured yet");
  }

  return createMockProofPayload(payload);
};
