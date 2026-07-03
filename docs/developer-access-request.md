# Pact MVP Access and Key Checklist

Status: implementation proceeds without waiting for external confirmation. This file tracks secrets and access values required to complete local, testnet, and demo deployment work.

Real secret values must be stored only in local `.env`, deployment secret storage, or CI secret storage. Do not commit real secrets.

## Stellar / Soroban accounts

| Variable | Owner | Required | Used by |
|---|---|---:|---|
| `STELLAR_DEPLOYER_SECRET_KEY` | implementation operator | yes | contract deployment scripts |
| `STELLAR_SPONSOR_SECRET_KEY` | implementation operator | yes | sponsor funding/demo actions |
| `STELLAR_PROJECT_SECRET_KEY` | implementation operator | yes | project proof submission/demo actions |
| `STELLAR_ISSUER_SECRET_KEY` | implementation operator | yes | root publishing by mock issuer |
| `STELLAR_ATTESTOR_SECRET_KEY` | implementation operator | yes | milestone root publishing |

Pre-filled but still verified before deploy:

| Variable | Owner | Required | Used by |
|---|---|---:|---|
| `STELLAR_NETWORK` | implementation operator | yes | all Stellar clients |
| `STELLAR_NETWORK_PASSPHRASE` | implementation operator | yes | transaction signing |
| `STELLAR_RPC_URL` | implementation operator | yes | Soroban contract calls and indexer |
| `STELLAR_HORIZON_URL` | implementation operator | yes | account and asset checks |

## Demo asset

| Variable | Owner | Required | Used by |
|---|---|---:|---|
| `DEMO_ASSET_CODE` | implementation operator | yes | demo asset setup |
| `DEMO_ASSET_ISSUER_PUBLIC_KEY` | implementation operator | required if issued asset | SAC/demo asset display |
| `DEMO_ASSET_ISSUER_SECRET_KEY` | implementation operator | required if issued asset | demo asset issuance |
| `DEMO_ASSET_CONTRACT_ID` | deployment output | required after deploy | escrow funding/release |

MVP fallback: use testnet XLM if issued asset setup is not ready.

## Contract IDs

| Variable | Owner | Required | Used by |
|---|---|---:|---|
| `POLICY_REGISTRY_CONTRACT_ID` | deploy script output | yes | API/SDK policy calls |
| `ROOT_REGISTRY_CONTRACT_ID` | deploy script output | yes | API/SDK root calls |
| `NULLIFIER_REGISTRY_CONTRACT_ID` | deploy script output | yes | API/SDK nullifier reads |
| `VERIFIER_ADAPTER_CONTRACT_ID` | deploy script output | yes | proof verification path |
| `MILESTONE_ESCROW_CONTRACT_ID` | deploy script output | yes | program/funding/release |
| `GATED_ASSET_CONTROLLER_CONTRACT_ID` | deploy script output | optional | optional gated asset flow |

Public frontend mirrors:

| Variable | Owner | Required | Used by |
|---|---|---:|---|
| `NEXT_PUBLIC_POLICY_REGISTRY_CONTRACT_ID` | deploy script output | yes | frontend contract config |
| `NEXT_PUBLIC_ROOT_REGISTRY_CONTRACT_ID` | deploy script output | yes | frontend contract config |
| `NEXT_PUBLIC_NULLIFIER_REGISTRY_CONTRACT_ID` | deploy script output | yes | frontend contract config |
| `NEXT_PUBLIC_VERIFIER_ADAPTER_CONTRACT_ID` | deploy script output | yes | frontend contract config |
| `NEXT_PUBLIC_MILESTONE_ESCROW_CONTRACT_ID` | deploy script output | yes | frontend contract config |
| `NEXT_PUBLIC_DEMO_ASSET_CONTRACT_ID` | deploy script output | required for issued asset | frontend asset display |

## Backend and service security

| Variable | Owner | Required | Used by |
|---|---|---:|---|
| `DATABASE_URL` | infrastructure operator | yes | Prisma/PostgreSQL |
| `REDIS_URL` | infrastructure operator | yes | BullMQ/proof queue |
| `API_ADMIN_TOKEN` | implementation operator | yes | admin-only API actions |
| `JWT_SECRET` | implementation operator | yes | session/API auth if enabled |
| `ENCRYPTION_KEY_BASE64` | implementation operator | yes | private evidence encryption |
| `CORS_ORIGIN` | deployment operator | yes | API browser access control |

## Stripe revenue proof

| Variable | Owner | Required | Used by |
|---|---|---:|---|
| `STRIPE_API_VERSION` | implementation operator | yes | Stripe REST calls |
| `STRIPE_TEST_MODE` | implementation operator | yes | rejects live connected accounts in MVP |
| `STRIPE_SECRET_KEY` | Pact platform operator | yes | platform test key for OAuth exchange and connected-account reads |
| `STRIPE_CONNECT_CLIENT_ID` | Pact platform operator | yes | Connect OAuth authorize URL |
| `STRIPE_OAUTH_REDIRECT_URI` | Pact platform operator | yes | registered Stripe OAuth callback |
| `STRIPE_WEBHOOK_SECRET` | Pact platform operator | required for webhook evidence | webhook signature verification |
| `STRIPE_OAUTH_STATE_SECRET` | implementation operator | yes | OAuth state HMAC |
| `PAYMENT_PROOF_ENCRYPTION_KEY` | implementation operator | yes | encrypted private revenue metrics and source refs |
| `PUBLIC_API_BASE_URL` | deployment operator | yes | public API links |
| `WEB_PUBLIC_API_BASE_URL` | deployment operator | yes | browser-facing callback/reference URL |
| `PROVER_URL` | deployment operator | yes | prover service URL |
| `STRIPE_REAL_CONNECTED_ACCOUNT_ID` | local test operator | optional | real Stripe integration test only |

Startup-owned Stripe dashboard credentials and startup secret API keys are not required.

## Mock issuer and attestor

| Variable | Owner | Required | Used by |
|---|---|---:|---|
| `KYC_ISSUER_ID` | implementation operator | yes | credential records and leaves |
| `KYC_ISSUER_PRIVATE_KEY` | implementation operator | yes | mock credential package signing |
| `MILESTONE_ATTESTOR_ID` | implementation operator | yes | milestone attestation records |
| `MILESTONE_ATTESTOR_PRIVATE_KEY` | implementation operator | yes | mock attestation signing |

## ZK artifacts

| Variable | Owner | Required | Used by |
|---|---|---:|---|
| `PTAU_PATH` | ZK build output | yes | Groth16 setup |
| `ELIGIBILITY_CIRCUIT_WASM_PATH` | ZK build output | yes | eligibility witness generation |
| `ELIGIBILITY_ZKEY_PATH` | ZK build output | yes | eligibility proof generation |
| `ELIGIBILITY_VKEY_PATH` | ZK build output | yes | eligibility verification |
| `MILESTONE_CIRCUIT_WASM_PATH` | ZK build output | yes | milestone witness generation |
| `MILESTONE_ZKEY_PATH` | ZK build output | yes | milestone proof generation |
| `MILESTONE_VKEY_PATH` | ZK build output | yes | milestone verification |
| `PAYMENT_REVENUE_CIRCUIT_WASM_PATH` | ZK build output | yes | payment revenue witness generation |
| `PAYMENT_REVENUE_ZKEY_PATH` | ZK build output | yes | payment revenue proof generation |
| `PAYMENT_REVENUE_VKEY_PATH` | ZK build output | yes | payment revenue verification |

## Indexer and deployment

| Variable | Owner | Required | Used by |
|---|---|---:|---|
| `INDEXER_START_LEDGER` | deployment operator | yes for deployed indexer | first indexed ledger |
| `WEB_DEPLOY_URL` | deployment output | yes for final report | public web demo |
| `API_DEPLOY_URL` | deployment output | yes for final report | public API |
| `PROVER_DEPLOY_URL` | deployment output | yes for final report | prover health/demo |

## Access checklist

- [ ] Stellar testnet funded deployer account exists.
- [ ] Sponsor/project/issuer/attestor accounts exist and are funded.
- [ ] Local `.env` exists and is excluded by `.gitignore`.
- [ ] PostgreSQL URL is available.
- [ ] Redis URL is available.
- [ ] ZK artifact paths exist after circuit build.
- [ ] Contract IDs are written after deployment.
- [ ] Public `NEXT_PUBLIC_*` values match private backend contract IDs.
- [ ] Deployment URLs are recorded for final technical report.
