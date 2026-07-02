# Pact Testnet Deployment Runbook

## Environment prerequisites

Populate `.env` from `.env.example`:

- `STELLAR_NETWORK`, `STELLAR_NETWORK_PASSPHRASE`, `STELLAR_RPC_URL`, `STELLAR_HORIZON_URL`
- `STELLAR_DEPLOYER_SECRET_KEY`, `STELLAR_SPONSOR_SECRET_KEY`, `STELLAR_PROJECT_SECRET_KEY`, `STELLAR_ISSUER_SECRET_KEY`, `STELLAR_ATTESTOR_SECRET_KEY`
- `DATABASE_URL`, `REDIS_URL`, `BULLMQ_PREFIX`
- `POLICY_REGISTRY_CONTRACT_ID`, `ROOT_REGISTRY_CONTRACT_ID`, `NULLIFIER_REGISTRY_CONTRACT_ID`, `VERIFIER_ADAPTER_CONTRACT_ID`, `MILESTONE_ESCROW_CONTRACT_ID`
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STELLAR_RPC_URL`, `NEXT_PUBLIC_*_CONTRACT_ID`
- `PROVER_MODE`, `PROVER_SERVICE_URL`, circuit artifact paths
- `INDEXER_ENABLED`, `INDEXER_POLL_INTERVAL_MS`, `INDEXER_START_LEDGER`, `INDEXER_CURSOR_PATH`

## Deployment steps

1. Fund deployer, sponsor, project, issuer, and attestor testnet accounts.
2. Run `pnpm install` and `pnpm --filter @pact/api prisma:generate`.
3. Validate contracts with `cargo test` from `contracts/`.
4. Dry-run contract deployment with `pnpm deploy:contracts -- --dry-run`.
5. Deploy contracts to testnet with the same deploy script and write contract IDs to the deployment artifact.
6. Copy contract IDs into `.env` and `NEXT_PUBLIC_*` variables.
7. Run DB migration/generation for API and start API with production-like env.
8. Start Redis, prover worker, and indexer; verify `/health`, queue connectivity, and indexer cursor writes.
9. Build web with `pnpm --filter @pact/web build` and deploy with `NEXT_PUBLIC_API_URL` pointing to the API.
10. Run `pnpm seed:demo`, `pnpm demo:happy-path`, `pnpm demo:attacks`, and `pnpm --filter @pact/web test:e2e`.

## Acceptance

Deployment is ready when contract IDs are recorded, API/prover/indexer health checks pass, the web demo opens, happy path releases a tranche, attack script rejects all negative cases, and public audit views contain no private metrics or credential secrets.
