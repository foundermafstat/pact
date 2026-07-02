# Pact MVP Stack Confirmation

Status: **approved for implementation without external confirmation**.

This file freezes the implementation stack for the MVP build. Any later change must be treated as a migration task, not as an implicit implementation detail.

## Repository

- Monorepo: `pnpm` workspaces.
- Root scripts orchestrate app, package, circuit, and contract commands.
- Shared code lives in `packages/*`.

## Frontend

- App: `apps/web`.
- Framework: Next.js + React + TypeScript.
- Styling: Tailwind CSS.
- Wallet integration: Stellar-compatible browser wallet adapter abstraction, with no secret keys stored in the browser.
- UI verification: Playwright smoke/e2e tests for the main demo and attack flows.

## Backend

- App: `apps/api`.
- Runtime: Node.js + TypeScript.
- HTTP framework: Fastify.
- Validation: Zod.
- Database: PostgreSQL.
- ORM: Prisma.
- Queue/cache: Redis + BullMQ.
- Blockchain integration: Stellar SDK.
- Test runner: Vitest.

## Off-chain services

- Mock KYC/KYB issuer inside API/service modules.
- Mock milestone attestor inside API/service modules.
- Root builder services for credential and milestone roots.
- Prover worker/service for proof generation jobs.
- Event indexer for Stellar/Soroban public contract events.

## Contracts

- Platform: Stellar Soroban.
- Language: Rust.
- CLI/build tooling: Stellar CLI and Rust toolchain.
- Contracts:
  - `PolicyRegistry`
  - `RootRegistry`
  - `NullifierRegistry`
  - `VerifierAdapter`
  - `MilestoneEscrow`
  - optional `GatedAssetController`
- Verification mode sequence:
  - first: mock verifier for business-flow integration
  - final: Groth16 BN254 verifier path where supported

## ZK

- Circuit language: Circom.
- Proof system: Groth16.
- Curve: BN254.
- Hashing: Poseidon-compatible commitments, roots, and nullifiers.
- Tooling: snarkjs-compatible local proving flow.
- Circuits:
  - `EligibilityProof`
  - `MilestoneUnlockProof`

## Shared packages

- `packages/shared`: constants, schemas, DTOs, policy canonicalization.
- `packages/sdk`: typed API and Soroban contract clients.
- `packages/zk`: proof helpers, artifact loading, public input formatting.

## Deployment baseline

- Network: Stellar testnet.
- Web deployment: Vercel-compatible Next.js deployment.
- API/prover/indexer deployment: Docker-compatible Node services.
- DB/Redis: local Docker for development; managed service or equivalent for staging/demo.
- Runtime configuration: `.env` derived from committed `.env.example`.

## Approved checklist

- [x] `pnpm` monorepo
- [x] Next.js + React + TypeScript frontend
- [x] Fastify + TypeScript backend
- [x] PostgreSQL + Prisma
- [x] Redis + BullMQ
- [x] Stellar SDK
- [x] Soroban Rust contracts
- [x] Circom + snarkjs-compatible Groth16 BN254 proving
- [x] Server-side proving for MVP
- [x] Public audit trail without raw private data

## Implementation assumptions

- Real secrets are local-only and must not be committed.
- Mock verifier is acceptable until real circuit/proof integration is available.
- Mock issuer/attestor are acceptable for MVP and must be clearly marked as non-production.
- Production hardening is documented later and is not required to block the MVP demo.
