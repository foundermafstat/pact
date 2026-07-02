# Pact MVP Final Technical Report

Date: 2026-07-02

Status: MVP implementation completed for local/testnet demo. This report contains no real secret values.

## 1. Executive Summary

Pact MVP implements a private milestone escrow demo on Stellar testnet:

- Sponsor creates, funds, and activates a milestone program.
- Project proves eligibility without exposing raw KYB attributes.
- Attestor validates milestone evidence without exposing raw private metrics.
- Prover produces eligibility and milestone proof payloads.
- Escrow releases a tranche only after valid eligibility and milestone proofs.
- Observer sees a public audit view without private evidence, raw KYB data, or raw KPI values.

Final acceptance passed in `docs/final-acceptance-checklist.md`.

## 2. Stack

| Layer | Implemented stack |
| --- | --- |
| Monorepo | `pnpm` workspace |
| Frontend | Next.js, React, TypeScript |
| Backend API | Node.js, Fastify, TypeScript, Zod |
| Database model | PostgreSQL schema via Prisma |
| Queue | BullMQ-compatible `proof-jobs` queue |
| Contracts | Rust Soroban contracts |
| Network | Stellar testnet |
| ZK | Circom, snarkjs, Groth16, BN254 |
| SDK/shared | TypeScript packages for schemas, constants, hashing, contract clients |
| Testing | Vitest, Playwright, Rust contract tests, Circom/snarkjs scripts |

## 3. Repository Map

| Path | Purpose |
| --- | --- |
| `apps/web` | Demo UI for sponsor, project, issuer, attestor, audit, and attack flows. |
| `apps/api` | Fastify API, DTO validation, in-memory MVP services, Prisma schema. |
| `apps/prover` | Prover service skeleton, worker, local/mock proof processing. |
| `apps/indexer` | Event indexer skeleton, cursor store, public event mapper. |
| `contracts` | Soroban contracts and contract tests. |
| `circuits` | Eligibility and milestone Circom circuits, fixtures, proving scripts, generated local artifacts. |
| `packages/shared` | Domain constants, Zod schemas, policy hashing, DTOs. |
| `packages/sdk` | API/contract client helpers. |
| `packages/zk` | Merkle helpers, fixtures, public input formatting. |
| `scripts/deploy` | Contract, off-chain, and frontend deployment checks. |
| `scripts/demo` | Happy path and attack demo scripts. |

## 4. Deployment State

### Contracts

Deployment artifact: `contracts/deployments/latest.contracts.json`

Network: `testnet`

RPC: `https://soroban-testnet.stellar.org`

| Contract | Testnet contract ID |
| --- | --- |
| PolicyRegistry | `CDVYEDPPQGMTRYWLTICHNB3WCNCYENSF4WCKJW5KYHJWFTHZQSTIW2TP` |
| RootRegistry | `CAZWJ4Y4ATQNZF237VVREHKMSC7PY622AJBDZIYURAP3DQO6PZPKTWWG` |
| NullifierRegistry | `CB22RLWPWAHXOWIBUEINDERPLWI6W4FNPRPYGXBXBRNGQPAJCWPWDAQG` |
| VerifierAdapter | `CDRIPSJMPQ3UNSSKDDJUXDHSY2FEEYQIUDKTNJN32EMCWOJW4SLKC3F3` |
| MilestoneEscrow | `CAFPMSEXS5GUJBTUGYZXL2FOOXKRJQMCFFAEMGXXDC5HFKXQLVVV4P5D` |
| GatedAssetController | `CDWKXDYQJEC442Z32LKJ2CDPWKFZXYAW67M24HADMSZDTNOKVZW4KAE4` |

Smoke evidence: `stellar contract invoke ... -- version` returned `1` for PolicyRegistry.

### Off-chain Services

Artifact: `docs/deployment/offchain-services.latest.json`

Mode: `production-like-local-auto`

Result: passed.

Notes:

- API `/health` passed.
- Prover `/health` passed.
- Indexer cursor health passed.
- Prisma schema validation passed.
- Docker daemon was not available in this workspace. The script tried real Postgres/Redis first and then used schema-only DB plus mock queue fallback for MVP demo verification.
- Strict real infra can be required with `OFFCHAIN_REQUIRE_EXTERNAL_INFRA=true pnpm deploy:offchain`.

### Frontend Demo

Artifact: `docs/deployment/frontend-demo.latest.json`

Mode: `local-demo`

Demo URL: `http://127.0.0.1:3100`

API URL: `http://127.0.0.1:4000`

Result: Next build passed and Playwright smoke passed for:

- `/`
- `/sponsor`
- `/project`
- `/issuer`
- `/attestor`
- `/audit`

External public hosting URL is not configured in this workspace.

## 5. Environment Keys

Committed files contain only placeholders and public IDs. Real secrets are not committed.

Local ignored file created: `.env`

Template: `.env.example`

Required secret groups:

- Stellar secret keys: deployer, sponsor, project, issuer, attestor.
- API security: admin token, JWT secret, encryption key.
- Infrastructure: real `DATABASE_URL`, `REDIS_URL`, deployment URLs.
- Demo asset secrets if using issued asset instead of testnet XLM.
- ZK artifact paths and trusted setup ownership for production.

Public values already recorded:

- Stellar network, passphrase, RPC URL, Horizon URL.
- Contract IDs listed in section 4.
- Frontend public contract IDs in local `.env`.

## 6. Application Flow

1. Sponsor creates a program with project wallet, asset, total amount, eligibility policy, and milestone tranches.
2. Sponsor funds and activates the program.
3. Issuer creates a mock credential, builds a credential root, and publishes the root.
4. Project requests an eligibility proof.
5. Attestor creates private milestone evidence, builds a milestone root, and publishes it.
6. Project requests a milestone proof.
7. API validates proof public inputs against program, tranche, recipient, and amount.
8. Escrow flow releases the tranche and records a transaction hash.
9. Public audit view shows program, funding, proof, and release events without private evidence or raw hidden metrics.
10. Attack demo verifies replay, revoked credential, inactive root, cross-program, and wrong-recipient rejection.

## 7. Database Model

Prisma schema path: `apps/api/prisma/schema.prisma`

Models:

- `Program`: escrow program, sponsor/project wallets, asset, totals, status.
- `Tranche`: milestone tranche, amount, recipient, release status, tx hash.
- `Policy`: policy hash, type, raw policy JSON, status.
- `Root`: credential/milestone/revocation roots, epoch, validity window, tx hash.
- `Credential`: credential commitment, wallet, issuer, leaf, status, expiry.
- `MilestoneAttestation`: private metrics ciphertext placeholder, public policy hash, attestor status.
- `ProofJob`: proof request, public inputs, proof JSON, status.
- `ContractEvent`: indexed public contract events with tx hash, ledger, payload.

Migration path: `apps/api/prisma/migrations/0001_init/migration.sql`

## 8. API Surface

Health:

- `GET /health`

Programs:

- `POST /api/programs`
- `GET /api/programs/:programId`
- `POST /api/programs/:programId/fund`
- `POST /api/programs/:programId/activate`
- `GET /api/programs/:programId/audit`

Policies:

- `POST /api/policies`
- `GET /api/policies/:policyId`
- `POST /api/policies/:policyId/activate`
- `POST /api/policies/:policyId/pause`

Issuer:

- `POST /api/issuer/credentials/mock`
- `POST /api/issuer/credentials/:credentialId/revoke`
- `POST /api/issuer/roots/build`
- `POST /api/issuer/roots/publish`

Attestor:

- `POST /api/attestor/milestone-evidence/mock`
- `POST /api/attestor/milestone-root/build`
- `POST /api/attestor/milestone-root/publish`
- `GET /api/attestor/programs/:programId/milestones/:milestoneId`

Proofs:

- `POST /api/proofs/eligibility/generate`
- `POST /api/proofs/milestone/generate`
- `POST /api/proofs/milestone/submit`
- `GET /api/proofs/:proofId`

## 9. Contracts

Implemented Soroban packages:

- `policy-registry`: policy lifecycle and active policy checks.
- `root-registry`: credential/milestone root activation and current root reads.
- `nullifier-registry`: nullifier uniqueness and replay prevention.
- `verifier-adapter`: mock and digest verifier modes.
- `milestone-escrow`: program lifecycle, funding, eligibility, milestone proof submit, tranche release.
- `gated-asset-controller`: optional gated asset controller marker.

Contract deployment script: `scripts/deploy/contracts.ts`

Important deployment hardening already added:

- `overflow-checks = true` in Soroban release profile.
- WASM artifact fallback from `target/wasm32v1-none/release/deps` when root output is empty.

## 10. ZK Circuits and Artifacts

Eligibility circuit:

- Source: `circuits/eligibility-proof/eligibility-proof.circom`
- Fixtures: valid, expired, sanctions false, wrong Merkle path, wrong nullifier context, wrong policy.
- Artifacts: `.r1cs`, `.wasm`, `.zkey`, `verification_key.json`, proof/public JSON under `circuits/eligibility-proof/build`.

Milestone circuit:

- Source: `circuits/milestone-unlock-proof/milestone-unlock-proof.circom`
- Fixtures: valid, below active users, below pilot partners, audit false, wrong recipient, wrong amount, wrong milestone, wrong Merkle path.
- Artifacts: `.r1cs`, `.wasm`, `.zkey`, `verification_key.json`, proof/public JSON under `circuits/milestone-unlock-proof/build`.

Scripts:

- `pnpm zk:test:eligibility`
- `pnpm zk:test:milestone`
- `pnpm zk:test:proofs`

## 11. Verification Results

| Area | Command / evidence | Result |
| --- | --- | --- |
| Contracts | `cargo test` in `contracts` | Passed before final deployment. |
| Contracts testnet | `stellar contract invoke ... -- version` | Passed, returned `1`. |
| Off-chain deploy | `pnpm deploy:offchain` | Passed, artifact `ok: true`. |
| Frontend deploy | `pnpm deploy:web` | Passed, Next build and Playwright smoke `ok: true`. |
| Happy path | `pnpm demo:happy-path` | Passed, tranche released. |
| Attack cases | `pnpm demo:attacks` | Passed, all negative scenarios rejected. |
| Privacy guard | `pnpm --filter @pact/web test -- privacy-guards.test.ts` | Passed, 14 files and 17 tests. |
| Indexer | `pnpm --filter @pact/indexer test` | Passed, 1 file and 3 tests. |
| API typecheck | `pnpm --filter @pact/api typecheck` | Passed after lazy queue fix. |

Detailed acceptance evidence: `docs/final-acceptance-checklist.md`

## 12. Security and Privacy Notes

Implemented protections:

- Public audit projection excludes raw KYC/KYB data, raw milestone metrics, private source refs, and private proof payloads.
- Milestone proof submission validates program ID, milestone ID, recipient, and tranche amount.
- Replay attacks are rejected by tranche release state and nullifier-oriented contract design.
- Revoked credentials are rejected before eligibility proof generation.
- Inactive roots are rejected during milestone proof input construction.
- API returns structured errors instead of leaking private evidence.
- Real secrets are excluded from committed `.env.example`, deployment artifacts, and this report.

Known security scope:

- MVP issuer and attestor are mock services.
- Production authentication/authorization is not complete.
- Production encryption, key custody, and KMS integration are not complete.
- Current frontend wallet integration is demo-oriented.

## 13. Known Limitations

- External public web hosting is not configured; demo artifact uses local URL.
- Docker daemon was unavailable, so off-chain service verification used fallback local demo mode for DB/Redis.
- API services are in-memory for the MVP flow; Prisma schema and migration exist for production persistence.
- Indexer has cursor/event mapping coverage, but real Stellar RPC pagination and persistence hardening remain future work.
- Verifier supports mock/digest MVP modes; full on-chain Groth16 verification hardening remains future work.
- Demo asset issuance is not finalized; issued asset env keys remain placeholders.
- CI/CD, managed DB/Redis, DNS, and production secret storage are not configured.

## 14. Production Hardening Tasks

1. Provision managed Postgres and Redis and run `OFFCHAIN_REQUIRE_EXTERNAL_INFRA=true pnpm deploy:offchain`.
2. Move API/prover/indexer from in-memory MVP services to persistent Prisma-backed repositories.
3. Add real auth for sponsor, project, issuer, attestor, admin, and observer roles.
4. Replace mock issuer/attestor with signed credential and signed milestone evidence flows.
5. Complete real Stellar asset issuance or choose final testnet XLM flow.
6. Complete production event indexer with Stellar RPC pagination, retries, idempotency, and DB persistence.
7. Harden verifier mode, verification key governance, and trusted setup process.
8. Add CI for TypeScript, Rust, circuits, Playwright, deploy dry-run, and secret scanning.
9. Add deployment targets for web, API, prover, and indexer with secret manager integration.
10. Add operational runbooks for key rotation, contract upgrades, incident response, and data retention.

## 15. Handoff Commands

```bash
pnpm deploy:contracts
pnpm deploy:offchain
pnpm deploy:web
pnpm demo:happy-path
pnpm demo:attacks
```

For strict external infrastructure verification:

```bash
OFFCHAIN_REQUIRE_EXTERNAL_INFRA=true pnpm deploy:offchain
```
