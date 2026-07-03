# Stripe Test OAuth Revenue Proof

## Setup

1. Enable Stripe Connect OAuth in the Stripe test dashboard.
2. Register callback URL:
   `http://127.0.0.1:4000/api/integrations/stripe/oauth/callback`.
3. Set the Stripe env vars from `.env.example`.
4. Start API and web locally.
5. Open `/dashboard/startup`, choose `Stripe revenue`, enter a program ID, and connect a Stripe test account.
6. Create real successful test payments in the connected Stripe account.
7. Generate a revenue snapshot, then generate a proof job.

Optional real integration test:
set `STRIPE_REAL_CONNECTED_ACCOUNT_ID` to a connected test account created
through OAuth, then run
`pnpm --filter @pact/api exec vitest run test/stripe-revenue-real.test.ts`.

## Trust Model

Stripe supplies real test-mode data through Connect OAuth. Pact never asks the
startup for Stripe dashboard credentials or startup secret API keys. The Pact
platform test key exchanges the OAuth code and reads the connected account via
the `Stripe-Account` header.

The Pact connector normalizes charges, refunds, and balance transactions into a
canonical snapshot. Private metrics and source refs are encrypted server-side.
Public API responses expose only the threshold policy fields, connected account
hash, commitments, proof job ID, and pass/fail result.

The current circuit checks private revenue arithmetic and threshold output, but
commitment binding follows the same placeholder style as the existing demo
circuits. Do not treat this as a portable third-party Stripe attestation yet.

## Limitations

- Acceptance requires real Stripe test data; mocked Stripe SDK/API responses are
  not accepted for the end-to-end path.
- Empty connected-account data is rejected unless a future policy explicitly
  allows zero-revenue proofs.
- Stripe list API responses are real data, but they are not a portable
  cryptographic attestation signed for third-party verification.
- A stronger version should build a Merkle root over verified Stripe webhook
  events and prove against that root.
