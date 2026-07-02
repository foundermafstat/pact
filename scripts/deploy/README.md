# Deploy Scripts

Deployment scripts will write contract IDs and network artifacts for the Pact MVP.

## Commands

- `pnpm deploy:contracts`: build and deploy Soroban contracts, then write `contracts/deployments/latest.contracts.json`.
- `pnpm infra:up`: start local Postgres and Redis with Docker Compose when Docker daemon is available.
- `pnpm deploy:offchain`: run API/prover/indexer production-like health checks and write `docs/deployment/offchain-services.latest.json`.
- `pnpm deploy:web`: build the Next.js demo, run Playwright smoke, and write `docs/deployment/frontend-demo.latest.json`.

By default `deploy:offchain` uses local auto mode: it tries real Postgres/Redis first and falls back to schema-only DB and mock queue checks when local external services are unavailable. Set `OFFCHAIN_REQUIRE_EXTERNAL_INFRA=true` to require real DB/Redis connectivity.
