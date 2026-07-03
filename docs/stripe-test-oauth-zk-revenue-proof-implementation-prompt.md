# Implementation Prompt: Stripe Test OAuth Connector + ZK-Compatible Revenue Threshold Proof

## Role

You are a senior full-stack and ZK engineer working inside the Pact monorepo.
Implement a Stripe test-mode revenue proof system without asking the startup for Stripe admin-panel keys or secret keys.

The system must use real Stripe test-mode data through Stripe Connect OAuth. Do not use mocked Stripe API responses for the working MVP path. Mocked clients are not acceptable for acceptance testing of this feature.

## Product Goal

Pact needs to prove that a startup satisfies a payment-system revenue milestone, for example:

- "Net Stripe revenue for the selected period is at least 10,000 USD."
- "Successful paid Stripe charges for the selected period are at least N."
- "Refund rate for the selected period is below a configured maximum."

The startup must not disclose:

- Stripe dashboard/admin credentials.
- Stripe secret API keys.
- Raw customer data.
- Exact revenue, if the policy only requires a threshold proof.
- Full payment row list, customer emails, card details, receipts, or billing identities.

The verifier should see only the public proof result and public policy fields required to validate the milestone.

## Hard Requirements

1. Use Stripe test mode with real Stripe API calls.
2. Use Stripe Connect OAuth for account connection.
3. Do not request or store startup Stripe secret keys.
4. Do not use mocked Stripe API responses in the end-to-end proof path.
5. Store only the minimum required Stripe identifiers and proof metadata.
6. Never store customer PII from Stripe unless explicitly required by a future policy.
7. Use the existing Pact architecture:
   - API: `apps/api`
   - Prover: `apps/prover`
   - Shared schemas: `packages/shared`
   - ZK helpers: `packages/zk`
   - Circom circuits: `circuits`
   - Web app: `apps/web`
8. Keep implementation compatible with the existing `ProofJob` flow.
9. Add a new proof type for Stripe/payment revenue threshold proofs.
10. Document the trust model clearly: Stripe supplies real test data, Pact connector attests the snapshot, and ZK proves the threshold without revealing raw private metrics.

## Official Stripe References To Use

Before implementation, re-check these official docs and keep behavior aligned with the current Stripe API:

- Stripe Connect OAuth Standard Accounts: https://docs.stripe.com/connect/oauth-standard-accounts
- Stripe Connect OAuth Reference: https://docs.stripe.com/connect/oauth-reference
- Stripe Connect Testing: https://docs.stripe.com/connect/testing
- Making API calls for connected accounts: https://docs.stripe.com/connect/authentication
- List Charges API: https://docs.stripe.com/api/charges/list
- List Refunds API: https://docs.stripe.com/api/refunds/list
- List Balance Transactions API: https://docs.stripe.com/api/balance_transactions/list
- Stripe Webhook Signature Verification: https://docs.stripe.com/webhooks
- Restricted API Key fallback for Stripe Apps: https://docs.stripe.com/stripe-apps/api-authentication/rak

Use Stripe API version `2026-02-25.clover` unless Stripe docs show a newer stable version at implementation time.

## Environment Variables

Add these to the project environment template and local `.env` documentation. Do not commit real secrets.

```bash
STRIPE_API_VERSION=2026-02-25.clover
STRIPE_TEST_MODE=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CONNECT_CLIENT_ID=ca_...
STRIPE_OAUTH_REDIRECT_URI=http://127.0.0.1:4000/api/integrations/stripe/oauth/callback
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_OAUTH_STATE_SECRET=...
PAYMENT_PROOF_ENCRYPTION_KEY=...
PUBLIC_API_BASE_URL=http://127.0.0.1:4000
WEB_PUBLIC_API_BASE_URL=http://127.0.0.1:4000
PROVER_URL=http://127.0.0.1:4001
```

Notes:

- `STRIPE_SECRET_KEY` is the Pact platform test key, not the startup key.
- The connected startup account is obtained by OAuth and stored as `stripe_user_id`.
- Use `Stripe-Account: acct_...` for connected-account API calls.
- `STRIPE_WEBHOOK_SECRET` is required only when testing webhook-backed evidence.
- `PAYMENT_PROOF_ENCRYPTION_KEY` must be a 32-byte secret encoded safely for the existing runtime.

## MVP User Flow

1. A Pact admin or project owner opens the Stripe integration screen.
2. The app calls `GET /api/integrations/stripe/oauth/start`.
3. The API generates a signed OAuth `state`, stores the pending connection, and redirects the user to Stripe:
   - `https://connect.stripe.com/oauth/authorize`
   - `response_type=code`
   - `client_id=STRIPE_CONNECT_CLIENT_ID`
   - `redirect_uri=STRIPE_OAUTH_REDIRECT_URI`
   - `state=<signed-state>`
   - use the minimum supported scope for the chosen Stripe flow; for test OAuth Standard-account MVP, use the documented OAuth flow and explicitly document the granted scope.
4. The startup completes OAuth in Stripe test mode.
5. Stripe redirects to `/api/integrations/stripe/oauth/callback`.
6. The API validates `state`.
7. The API exchanges the authorization `code` through `POST https://connect.stripe.com/oauth/token`.
8. The API stores:
   - connected Stripe account ID (`stripe_user_id`)
   - livemode flag
   - granted scope
   - connection status
   - timestamps
   - encrypted sensitive OAuth fields only if still required
9. Pact fetches real test payment data from the connected account using the platform test key and `Stripe-Account` header.
10. Pact builds a canonical revenue snapshot.
11. Pact creates a ZK-compatible witness from that snapshot.
12. Pact generates a revenue threshold proof job.
13. Pact returns public proof data without exposing raw Stripe rows or exact private metrics.

## Real Stripe Test Data Requirement

The acceptance path must use real Stripe test-mode data.

Allowed:

- Real Stripe test charges/payment intents created in a Stripe sandbox/test account.
- Real Stripe Connect OAuth callback using the test `client_id`.
- Real Stripe API list calls against the connected test account.
- Real Stripe webhooks forwarded by Stripe CLI or delivered to a configured test webhook endpoint.

Not allowed for acceptance:

- Hard-coded fake charges.
- Mocked Stripe SDK client.
- Stubbed HTTP responses.
- Prebuilt JSON pretending to be Stripe output.
- Proofs generated from local-only synthetic payment rows.

If real Stripe environment variables are missing, integration tests may skip with a clear message, but the feature is not considered accepted until it passes against real Stripe test mode.

## Stripe Data Collection

Implement a connector service in `apps/api`, for example:

- `apps/api/src/services/stripe-oauth-service.ts`
- `apps/api/src/services/stripe-connector-service.ts`
- `apps/api/src/services/stripe-revenue-snapshot-service.ts`

The connector must:

1. Create OAuth authorization URLs.
2. Validate OAuth callback state.
3. Exchange OAuth authorization codes.
4. Store connected-account metadata.
5. Fetch Stripe data using connected-account authentication.
6. Page through Stripe list endpoints until the requested period is complete.
7. Normalize amounts to minor units, for example cents.
8. Reject mixed currencies unless the policy explicitly supports FX conversion.
9. Exclude failed, uncaptured, disputed, or non-paid payments from successful revenue.
10. Subtract refunds and Stripe fees when calculating net revenue.
11. Preserve enough source references for audit without storing PII.

Primary Stripe sources:

- Charges: `/v1/charges`
- Refunds: `/v1/refunds`
- Balance transactions: `/v1/balance_transactions`

Recommended revenue calculation for MVP:

```text
grossPaidCents = sum(charge.amount_captured where paid=true and status=succeeded)
refundCents = sum(refund.amount where status=succeeded and refund belongs to period or selected policy rule)
feeCents = sum(abs(balance_transaction.fee) linked to included charges)
netRevenueCents = grossPaidCents - refundCents - feeCents
```

Make the period rule explicit:

- `periodStart` inclusive.
- `periodEnd` exclusive.
- All Stripe timestamps are Unix seconds.
- Store generated snapshots with the period boundaries used.

## Canonical Snapshot Schema

Add shared Zod schemas in `packages/shared`.

Suggested public snapshot shape:

```ts
type StripeRevenueSnapshotPublic = {
  source: "stripe";
  mode: "test";
  connectedAccountHash: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  thresholdCents: string;
  policyHash: string;
  snapshotCommitment: string;
  sourceRefsCommitment: string;
  generatedAt: string;
};
```

Suggested private snapshot shape:

```ts
type StripeRevenueSnapshotPrivate = {
  connectedAccountId: string;
  grossPaidCents: string;
  refundCents: string;
  feeCents: string;
  netRevenueCents: string;
  successfulChargeCount: number;
  chargeRefs: Array<{
    id: string;
    amountCaptured: string;
    balanceTransactionId: string | null;
    created: number;
  }>;
  refundRefs: Array<{
    id: string;
    amount: string;
    chargeId: string | null;
    created: number;
  }>;
  balanceTransactionRefs: Array<{
    id: string;
    fee: string;
    net: string;
    source: string | null;
    created: number;
  }>;
  salt: string;
};
```

Do not expose the private shape through public API responses.

## Database Changes

Extend `apps/api/prisma/schema.prisma`.

Suggested additions:

1. Extend `ProofType`:
   - `PaymentRevenueThreshold`

2. Add `StripeConnection`:
   - `id`
   - `projectId` or `programId`, depending on current domain fit
   - `stripeAccountId`
   - `stripeAccountHash`
   - `livemode`
   - `scope`
   - `status`
   - `createdAt`
   - `updatedAt`
   - `deauthorizedAt`

3. Add `StripeOAuthState`:
   - `id`
   - `stateHash`
   - `programId`
   - `redirectUri`
   - `expiresAt`
   - `consumedAt`
   - `createdAt`

4. Add `PaymentRevenueSnapshot`:
   - `id`
   - `programId`
   - `stripeConnectionId`
   - `periodStart`
   - `periodEnd`
   - `currency`
   - `thresholdCents`
   - `grossPaidCentsEncrypted`
   - `refundCentsEncrypted`
   - `feeCentsEncrypted`
   - `netRevenueCentsEncrypted`
   - `successfulChargeCountEncrypted`
   - `snapshotCommitment`
   - `sourceRefsCommitment`
   - `rawSourceRefsEncrypted`
   - `status`
   - `generatedAt`

5. Add `StripeWebhookEvent` if webhook-backed evidence is implemented in the first pass:
   - `id`
   - `stripeEventId`
   - `stripeAccountId`
   - `type`
   - `livemode`
   - `payloadHash`
   - `receivedAt`
   - `processedAt`
   - unique index on `stripeEventId`

Use encrypted fields for private data. Do not store customer names, emails, card details, or receipt URLs.

## API Routes

Add route module:

- `apps/api/src/routes/stripe-integration.ts`
- register it in `apps/api/src/routes/index.ts`

Required routes:

```text
GET  /api/integrations/stripe/oauth/start?programId=...
GET  /api/integrations/stripe/oauth/callback
GET  /api/integrations/stripe/status?programId=...
POST /api/integrations/stripe/disconnect
POST /api/payment-proofs/stripe/revenue-threshold/snapshot
POST /api/payment-proofs/stripe/revenue-threshold/generate
GET  /api/payment-proofs/stripe/revenue-threshold/:proofJobId
POST /api/webhooks/stripe
```

Route behavior:

- `oauth/start` returns a redirect response or JSON with `authorizeUrl`.
- `oauth/callback` consumes the OAuth code and stores connection metadata.
- `status` returns connection state without exposing sensitive values.
- `snapshot` fetches real Stripe test data and stores a canonical snapshot.
- `generate` starts a proof job using the stored snapshot.
- `webhooks/stripe` verifies `Stripe-Signature` using the raw request body.

## ZK-Compatible Proof Model

Create a new proof type:

```text
PaymentRevenueThreshold
```

Public statement:

```text
For a connected Stripe test account and a specific period/currency,
the private net revenue derived from the Pact-attested Stripe snapshot
is greater than or equal to the public threshold.
```

Public inputs:

```ts
type PaymentRevenuePublicInput = {
  policyHash: string;
  snapshotCommitment: string;
  sourceRefsCommitment: string;
  connectedAccountHash: string;
  programId: string;
  milestoneId: string;
  thresholdCents: string;
  currencyCode: string;
  periodStartEpoch: number;
  periodEndEpoch: number;
  currentEpoch: number;
  nullifier: string;
};
```

Private inputs:

```ts
type PaymentRevenuePrivateInput = {
  connectorSecret: string;
  snapshotSalt: string;
  netRevenueCents: string;
  grossPaidCents: string;
  refundCents: string;
  feeCents: string;
  successfulChargeCount: number;
  sourceRefSalts: string[];
};
```

Minimum circuit requirement:

1. Prove `netRevenueCents >= thresholdCents`.
2. Prove `netRevenueCents = grossPaidCents - refundCents - feeCents`.
3. Range-check all amount fields.
4. Bind the proof to `snapshotCommitment`.
5. Bind the proof to `policyHash`, `programId`, `milestoneId`, period, currency, and connected account hash.
6. Emit `accepted = 1` only when all constraints pass.

Circuit location:

```text
circuits/payment-revenue-threshold-proof/payment-revenue-threshold-proof.circom
```

Add scripts:

```text
circuits/scripts/compile-payment-revenue.sh
circuits/scripts/test-payment-revenue.sh
```

Add root package scripts:

```json
{
  "zk:compile:payment-revenue": "bash circuits/scripts/compile-payment-revenue.sh",
  "zk:test:payment-revenue": "bash circuits/scripts/test-payment-revenue.sh",
  "zk:prove:payment-revenue": "bash circuits/scripts/snarkjs-pipeline.sh payment-revenue all"
}
```

If the existing circuits still use placeholder commitment binding, keep the first implementation compatible with the existing style, but explicitly document which commitment binding is placeholder and which part is already enforced by constraints. Do not label a mock proof as a real ZK proof.

## Snapshot Commitments

Use deterministic canonical JSON before hashing.

Recommended commitments:

```text
connectedAccountHash = sha256("stripe-account:" + stripeAccountId + ":" + salt)
sourceRefsCommitment = sha256(canonicalJson(sourceRefsWithoutPII) + ":" + salt)
snapshotCommitment = sha256(canonicalJson({
  source,
  mode,
  connectedAccountHash,
  periodStart,
  periodEnd,
  currency,
  grossPaidCents,
  refundCents,
  feeCents,
  netRevenueCents,
  successfulChargeCount,
  sourceRefsCommitment
}) + ":" + salt)
```

For Circom field inputs, map hashes to field-safe numeric values consistently. Implement this conversion in `packages/zk` and test it.

## Prover Integration

Extend:

- `packages/shared/src/constants.ts`
- `packages/shared/src/circuit-io.ts`
- `packages/shared/src/api-dto.ts`
- `packages/zk/src/public-inputs.ts`
- `apps/prover/src/proof-processor.ts`
- `apps/api/src/services/proof-job-service.ts`
- `apps/api/src/routes/proofs.ts` or a dedicated payment proof route

The generated proof job must include:

```json
{
  "proofType": "PaymentRevenueThreshold",
  "status": "Succeeded",
  "publicInputsJson": {
    "policyHash": "...",
    "snapshotCommitment": "...",
    "sourceRefsCommitment": "...",
    "connectedAccountHash": "...",
    "programId": "...",
    "milestoneId": "...",
    "thresholdCents": "1000000",
    "currencyCode": "usd",
    "periodStartEpoch": 1764547200,
    "periodEndEpoch": 1767225600,
    "nullifier": "..."
  },
  "proofJson": {
    "mode": "snarkjs",
    "proof": "...",
    "verificationKeyHash": "...",
    "generatedAt": "..."
  }
}
```

Do not return private snapshot values in `publicInputsJson`.

## Web App Requirements

Add a small operator-facing flow in `apps/web`:

1. Stripe connection status.
2. `Connect Stripe Test Account` action.
3. Selected period controls:
   - start date
   - end date
   - currency
   - threshold amount
4. `Generate Revenue Snapshot` action.
5. `Generate Proof` action.
6. Proof result:
   - threshold passed/failed
   - period
   - currency
   - threshold
   - connected account hash
   - snapshot commitment
   - proof job ID

Do not show raw charge IDs, customer data, exact net revenue, or Stripe account ID in the public proof view.

## Testing Requirements

Use targeted tests first.

Required non-Stripe tests:

```bash
pnpm --filter @pact/shared test
pnpm --filter @pact/zk test
pnpm --filter @pact/api test
pnpm --filter @pact/prover test
```

Required ZK tests:

```bash
pnpm zk:compile:payment-revenue
pnpm zk:test:payment-revenue
```

Required real Stripe test-mode integration test:

```bash
pnpm --filter @pact/api test -- stripe-revenue-real
```

The Stripe integration test must:

1. Require `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_CLIENT_ID`, and a connected test account created by OAuth.
2. Use real Stripe list endpoints.
3. Fetch at least one real successful test payment from the connected account.
4. Generate a real snapshot from Stripe data.
5. Generate a threshold proof from the snapshot.
6. Assert that raw Stripe rows are not returned by public API responses.

If the account has no test payments, fail with a clear setup message. Do not silently replace real data with mock data.

## Test Data Setup

For MVP acceptance, prepare a real Stripe test connected account:

1. Enable Connect OAuth in the Stripe test dashboard.
2. Configure callback URL:
   - `http://127.0.0.1:4000/api/integrations/stripe/oauth/callback`
3. Start Pact API locally.
4. Open the OAuth start route.
5. Complete Stripe test OAuth.
6. Create real test payments in the connected account.
7. Confirm charges exist through Stripe test dashboard or API.
8. Run the revenue snapshot/proof flow.

If automated seeding is implemented, it must create real Stripe test-mode objects through Stripe API. Do not seed local fake payment rows.

## Security Requirements

1. OAuth `state` must be signed or stored as a secure random hash.
2. OAuth state must expire.
3. OAuth state must be single-use.
4. The callback must reject missing, expired, reused, or mismatched state.
5. Stripe webhook handler must verify `Stripe-Signature` using raw body.
6. Stripe webhook events must be idempotent by Stripe event ID.
7. All Stripe secret values must stay server-side.
8. Do not log access tokens, refresh tokens, webhook secrets, API keys, raw request bodies containing secrets, or private snapshot payloads.
9. Use encryption for private metrics and source refs.
10. Public API responses must redact Stripe account IDs and raw source IDs.

## Acceptance Criteria

The implementation is complete only when all of the following are true:

1. A Stripe test account can be connected through OAuth.
2. The system stores the connected account ID without requiring startup secret keys.
3. The system fetches real Stripe test charges/refunds/balance transactions.
4. The system generates a canonical revenue snapshot from real Stripe data.
5. The system rejects empty data unless the policy explicitly allows zero-revenue proof.
6. The system generates a `PaymentRevenueThreshold` proof job.
7. The proof public inputs contain no raw Stripe account ID, no raw charge IDs, and no customer PII.
8. The ZK-compatible proof checks the revenue threshold using private revenue values.
9. The web UI supports connecting Stripe and generating the proof.
10. Targeted tests pass.
11. Real Stripe test-mode integration test passes with real test data.
12. README or docs describe setup, trust model, limitations, and real Stripe test data requirements.

## Implementation Order

1. Add shared constants and schemas for `PaymentRevenueThreshold`.
2. Add environment parsing for Stripe settings in `apps/api/src/config.ts`.
3. Add Prisma models and migration.
4. Add Stripe OAuth service.
5. Add Stripe connector service with connected-account API calls.
6. Add canonical revenue snapshot service.
7. Add encrypted private snapshot storage.
8. Add payment revenue proof input builder.
9. Add Circom payment revenue threshold circuit.
10. Add compile/test scripts for the new circuit.
11. Extend prover processing for `PaymentRevenueThreshold`.
12. Add API routes for OAuth, snapshot generation, and proof generation.
13. Add Stripe webhook route with signature verification.
14. Add web UI controls and result view.
15. Add targeted unit tests for schemas and calculations.
16. Add real Stripe test-mode integration test.
17. Run targeted checks.
18. Update docs.

## Important Limitation To Document

Stripe list API responses are real data but are not themselves portable cryptographic attestations signed for third-party verification. For the MVP, the trust anchor is the Pact server-side Stripe connector that fetches real Stripe test data and commits to it. ZK then hides the private business metrics while proving the public threshold statement.

For a stronger future version, add webhook-backed event ingestion:

1. Verify Stripe webhook signatures.
2. Store hashed event payloads.
3. Build a Merkle root over verified Stripe events.
4. Prove revenue threshold against the verified event root.
5. Publish only the root, period, policy, and threshold proof.

## Final Delivery Checklist

After implementation, provide a concise report with:

- Files changed.
- New env vars.
- How OAuth was tested.
- Connected test account hash, not raw account ID.
- Test payment count used.
- Snapshot commitment.
- Proof job ID.
- Commands run.
- Known limitations.
- Confirmation that no startup Stripe secret key was used.
