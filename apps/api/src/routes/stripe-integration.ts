import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { FastifyInstance } from "fastify";
import {
  CreateStripeRevenueSnapshotRequestSchema,
  GenerateStripeRevenueProofRequestSchema
} from "@pact/shared";
import { z } from "zod";

import { loadStripeIntegrationConfig } from "../config";
import { ApiError } from "../errors";
import { proofJobService } from "../services/proof-job-service";
import { programService } from "../services/program-service";
import { stripeConnectorService } from "../services/stripe-connector-service";
import { stripeOAuthService } from "../services/stripe-oauth-service";
import { stripeRevenueSnapshotService } from "../services/stripe-revenue-snapshot-service";
import { requireProgramAccess, requireRole } from "./auth-guards";

const OAuthStartQuerySchema = z.object({
  programId: z.string().uuid()
});

const OAuthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  error_description: z.string().min(1).optional()
});

const StripeProgramRequestSchema = z.object({
  programId: z.string().uuid()
});

const StripeWebhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  livemode: z.boolean().optional(),
  account: z.string().optional()
});

const processedWebhookEvents = new Set<string>();

const sha256Hex = (value: string): `0x${string}` =>
  `0x${createHash("sha256").update(value).digest("hex")}`;

const parsePeriodBoundary = (value: string, field: string): string => {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00.000Z`
    : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "invalid_period", `${field} is not a valid date`);
  }
  return date.toISOString();
};

const toEpochSeconds = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000);

const assertConfigured = (action: () => unknown): void => {
  try {
    action();
  } catch (error) {
    throw new ApiError(
      400,
      "stripe_not_configured",
      error instanceof Error ? error.message : "Stripe integration is not configured"
    );
  }
};

const verifyStripeWebhookSignature = (
  rawBody: string,
  signatureHeader: string,
  secret: string
): void => {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) {
    throw new ApiError(400, "invalid_stripe_signature", "Stripe signature is invalid");
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    throw new ApiError(400, "invalid_stripe_signature", "Stripe signature is invalid");
  }
};

export const registerStripeIntegrationRoutes = async (
  app: FastifyInstance
): Promise<void> => {
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (request, body, done) => {
      const rawBody = body.toString("utf8");
      if (request.url.startsWith("/api/webhooks/stripe")) {
        done(null, rawBody);
        return;
      }

      try {
        done(null, rawBody.length > 0 ? JSON.parse(rawBody) : null);
      } catch (error) {
        done(error as Error);
      }
    }
  );

  app.get("/api/integrations/stripe/oauth/start", async (request) => {
    await requireRole(request, ["Project", "Admin"]);
    const parsed = OAuthStartQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_stripe_oauth_start_request",
        "Stripe OAuth start request is invalid",
        parsed.error.flatten()
      );
    }

    const record = await programService.getProgram(parsed.data.programId);
    if (!record) {
      throw new ApiError(404, "program_not_found", "Program was not found");
    }
    await requireProgramAccess(request, record.program, "startup");

    const config = loadStripeIntegrationConfig();
    let start;
    assertConfigured(() => {
      start = stripeOAuthService.createOAuthStart(config, parsed.data.programId);
    });

    return { data: start };
  });

  app.get("/api/integrations/stripe/oauth/callback", async (request) => {
    const parsed = OAuthCallbackQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_stripe_oauth_callback",
        "Stripe OAuth callback is invalid",
        parsed.error.flatten()
      );
    }
    if (parsed.data.error) {
      throw new ApiError(
        400,
        "stripe_oauth_denied",
        parsed.data.error_description ?? parsed.data.error
      );
    }
    if (!parsed.data.code || !parsed.data.state) {
      throw new ApiError(400, "invalid_stripe_oauth_callback", "Missing code or state");
    }

    const config = loadStripeIntegrationConfig();
    let stateRecord;
    try {
      stateRecord = stripeOAuthService.consumeOAuthState(config, parsed.data.state);
    } catch (error) {
      throw new ApiError(
        400,
        "stripe_not_configured",
        error instanceof Error ? error.message : "Stripe integration is not configured"
      );
    }
    if (!stateRecord) {
      throw new ApiError(
        400,
        "invalid_stripe_oauth_state",
        "Stripe OAuth state is missing, expired, or already consumed"
      );
    }

    if (!config.secretKey) {
      throw new ApiError(
        400,
        "stripe_not_configured",
        "STRIPE_SECRET_KEY is required for Stripe OAuth exchange"
      );
    }
    let tokenResponse;
    try {
      tokenResponse = await stripeConnectorService.exchangeOAuthCode(
        config,
        parsed.data.code
      );
    } catch (error) {
      throw new ApiError(
        502,
        "stripe_oauth_exchange_failed",
        error instanceof Error ? error.message : "Stripe OAuth exchange failed"
      );
    }

    const connection = stripeOAuthService.storeConnection({
      programId: stateRecord.programId,
      stripeAccountId: tokenResponse.stripeAccountId,
      livemode: tokenResponse.livemode,
      scope: tokenResponse.scope
    });

    if (config.testMode && connection.livemode) {
      stripeOAuthService.disconnect(connection.programId);
      throw new ApiError(
        400,
        "stripe_livemode_rejected",
        "Only Stripe test-mode connections are accepted"
      );
    }

    return { data: stripeOAuthService.getStatus(connection.programId) };
  });

  app.get("/api/integrations/stripe/status", async (request) => {
    await requireRole(request, ["Project", "Admin"]);
    const parsed = OAuthStartQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_stripe_status_request",
        "Stripe status request is invalid",
        parsed.error.flatten()
      );
    }

    const record = await programService.getProgram(parsed.data.programId);
    if (!record) {
      throw new ApiError(404, "program_not_found", "Program was not found");
    }
    await requireProgramAccess(request, record.program, "startup");

    return { data: stripeOAuthService.getStatus(parsed.data.programId) };
  });

  app.post("/api/integrations/stripe/disconnect", async (request) => {
    await requireRole(request, ["Project", "Admin"]);
    const parsed = StripeProgramRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_stripe_disconnect_request",
        "Stripe disconnect request is invalid",
        parsed.error.flatten()
      );
    }

    const record = await programService.getProgram(parsed.data.programId);
    if (!record) {
      throw new ApiError(404, "program_not_found", "Program was not found");
    }
    await requireProgramAccess(request, record.program, "startup");

    const config = loadStripeIntegrationConfig();
    const connection = stripeOAuthService.getConnection(parsed.data.programId);
    if (connection) {
      try {
        await stripeConnectorService.deauthorize(config, connection);
      } catch {
        // Local demo state still needs to be cleared if Stripe deauthorize is unavailable.
      }
    }
    stripeOAuthService.disconnect(parsed.data.programId);

    return { data: stripeOAuthService.getStatus(parsed.data.programId) };
  });

  app.post("/api/payment-proofs/stripe/revenue-threshold/snapshot", async (request) => {
    await requireRole(request, ["Project", "Admin"]);
    const parsed = CreateStripeRevenueSnapshotRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_stripe_snapshot_request",
        "Stripe revenue snapshot request is invalid",
        parsed.error.flatten()
      );
    }

    const record = await programService.getProgram(parsed.data.programId);
    if (!record) {
      throw new ApiError(404, "program_not_found", "Program was not found");
    }
    await requireProgramAccess(request, record.program, "startup");

    const connection = stripeOAuthService.getConnection(parsed.data.programId);
    if (!connection) {
      throw new ApiError(
        400,
        "stripe_not_connected",
        "Connect a Stripe test account before generating a snapshot"
      );
    }
    if (connection.livemode) {
      throw new ApiError(
        400,
        "stripe_livemode_rejected",
        "Only Stripe test-mode data is accepted"
      );
    }

    const periodStart = parsePeriodBoundary(parsed.data.periodStart, "periodStart");
    const periodEnd = parsePeriodBoundary(parsed.data.periodEnd, "periodEnd");
    if (toEpochSeconds(periodEnd) <= toEpochSeconds(periodStart)) {
      throw new ApiError(400, "invalid_period", "periodEnd must be after periodStart");
    }

    const currency = parsed.data.currency.toLowerCase();
    const config = loadStripeIntegrationConfig();
    if (!config.secretKey || !config.paymentProofEncryptionKey) {
      throw new ApiError(
        400,
        "stripe_not_configured",
        "STRIPE_SECRET_KEY and PAYMENT_PROOF_ENCRYPTION_KEY are required"
      );
    }
    let sourceData;
    try {
      sourceData = await stripeConnectorService.fetchRevenueSourceData(
        config,
        connection,
        {
          periodStartEpoch: toEpochSeconds(periodStart),
          periodEndEpoch: toEpochSeconds(periodEnd),
          currency
        }
      );
    } catch (error) {
      throw new ApiError(
        502,
        "stripe_revenue_fetch_failed",
        error instanceof Error ? error.message : "Stripe revenue fetch failed"
      );
    }

    try {
      const snapshot = stripeRevenueSnapshotService.createSnapshot({
        config,
        programId: parsed.data.programId,
        connection,
        sourceData,
        periodStart,
        periodEnd,
        currency,
        thresholdCents: parsed.data.thresholdCents,
        policyHash: (
          parsed.data.policyHash ??
          sha256Hex(
            `stripe-revenue:${parsed.data.programId}:${periodStart}:${periodEnd}:${currency}:${parsed.data.thresholdCents}`
          )
        ) as `0x${string}`
      });
      return { data: snapshot };
    } catch (error) {
      throw new ApiError(
        400,
        "stripe_snapshot_failed",
        error instanceof Error ? error.message : "Stripe snapshot failed"
      );
    }
  });

  app.post("/api/payment-proofs/stripe/revenue-threshold/generate", async (request) => {
    await requireRole(request, ["Project", "Admin"]);
    const parsed = GenerateStripeRevenueProofRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_stripe_proof_request",
        "Stripe revenue proof request is invalid",
        parsed.error.flatten()
      );
    }

    const snapshot = stripeRevenueSnapshotService.getSnapshot(parsed.data.snapshotId);
    if (!snapshot) {
      throw new ApiError(404, "stripe_snapshot_not_found", "Stripe snapshot was not found");
    }
    const record = await programService.getProgram(snapshot.programId);
    if (!record) {
      throw new ApiError(404, "program_not_found", "Program was not found");
    }
    await requireProgramAccess(request, record.program, "startup");

    let proofInput;
    try {
      proofInput = stripeRevenueSnapshotService.buildProofInput(
        loadStripeIntegrationConfig(),
        parsed.data.snapshotId,
        parsed.data.milestoneId
      );
    } catch (error) {
      throw new ApiError(
        400,
        "stripe_not_configured",
        error instanceof Error ? error.message : "Stripe proof configuration is invalid"
      );
    }
    if (!proofInput) {
      throw new ApiError(404, "stripe_snapshot_not_found", "Stripe snapshot was not found");
    }

    const queuedJob = proofJobService.createJob({
      proofType: "PaymentRevenueThreshold",
      requestJson: {
        snapshotId: parsed.data.snapshotId,
        programId: snapshot.programId,
        milestoneId: parsed.data.milestoneId,
        snapshotCommitment: snapshot.snapshotCommitment
      },
      publicInputsJson: proofInput.publicInput
    });
    proofJobService.startJob(queuedJob.id);
    const completedJob = proofJobService.completeJob(queuedJob.id, {
      publicInputsJson: proofInput.publicInput,
      proofJson: {
        mode: "pact-attested-threshold",
        proofSystem: "zk-compatible-placeholder",
        accepted: proofInput.thresholdPassed,
        verificationKeyHash: sha256Hex("payment-revenue-threshold-proof:v1"),
        generatedAt: new Date().toISOString(),
        trustModel:
          "Stripe test API data is fetched by the Pact connector; ZK-compatible commitments hide raw revenue and source rows."
      }
    });

    return { data: completedJob };
  });

  app.get<{ Params: { proofJobId: string } }>(
    "/api/payment-proofs/stripe/revenue-threshold/:proofJobId",
    async (request) => {
      await requireRole(request, ["Project", "Admin"]);
      const job = proofJobService.getJob(request.params.proofJobId);
      if (!job || job.proofType !== "PaymentRevenueThreshold") {
        throw new ApiError(404, "proof_job_not_found", "Proof job was not found");
      }
      const programId = job.requestJson["programId"];
      const record =
        typeof programId === "string" ? await programService.getProgram(programId) : undefined;
      if (!record) {
        throw new ApiError(404, "program_not_found", "Program was not found");
      }
      await requireProgramAccess(request, record.program, "startup");

      return { data: job };
    }
  );

  app.post("/api/webhooks/stripe", async (request) => {
    const config = loadStripeIntegrationConfig();
    if (!config.webhookSecret) {
      throw new ApiError(
        400,
        "stripe_webhook_not_configured",
        "STRIPE_WEBHOOK_SECRET is required"
      );
    }
    if (typeof request.body !== "string") {
      throw new ApiError(
        400,
        "invalid_stripe_webhook_body",
        "Stripe webhook requires the raw request body"
      );
    }

    const signature = request.headers["stripe-signature"];
    if (typeof signature !== "string") {
      throw new ApiError(
        400,
        "invalid_stripe_signature",
        "Stripe-Signature header is required"
      );
    }
    verifyStripeWebhookSignature(request.body, signature, config.webhookSecret);

    const parsed = StripeWebhookEventSchema.safeParse(JSON.parse(request.body));
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_stripe_webhook_event",
        "Stripe webhook event is invalid",
        parsed.error.flatten()
      );
    }

    const alreadyProcessed = processedWebhookEvents.has(parsed.data.id);
    processedWebhookEvents.add(parsed.data.id);

    return {
      data: {
        id: parsed.data.id,
        type: parsed.data.type,
        alreadyProcessed,
        payloadHash: sha256Hex(request.body)
      }
    };
  });
};
