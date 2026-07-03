# Pact Current System and MVP Readiness Audit

Date: 2026-07-03

Scope: current repository state, `docs/` requirements, API/UI code paths, Prisma schema, deployed testnet contract artifact, and local API health/migration checks.

## 1. Executive Verdict

Pact is now much closer to a judgeable MVP than the initial scaffold: it has a real role-based dashboard, cloud PostgreSQL persistence for the marketplace, startup/investor application flows, Stripe test-mode connector code, and freshly deployed Stellar testnet contracts.

However, the system is not yet a fully real "capital locked, ZK verified, tranche paid" product. The strongest working part is the database-backed marketplace flow. The weakest parts are actual asset custody/transfer, durable Stripe proof storage, and true ZK proof generation/verification in the runtime path.

Current MVP readiness estimate:

| Area | Readiness | Judge-facing note |
| --- | ---: | --- |
| Product narrative | 8/10 | Strong story: startup applies, investor approves, private revenue unlocks tranche. |
| Role-based dashboard | 7/10 | Founder/investor/admin separation exists; old demo surfaces still create some conceptual noise. |
| Marketplace DB flow | 8/10 | Real forms and Neon-backed records exist. |
| Testnet smart contract integration | 5/10 | Contracts are deployed and invoked, but escrow is a state machine, not real token custody. |
| Stripe test data path | 6/10 | Real Stripe API calls are implemented; OAuth/snapshots/proof jobs are currently in-memory. |
| ZK runtime path | 3/10 | Circuits exist, but API uses placeholder proof jobs and contract mock proof marker. |
| Public audit trail | 4/10 | Sanitized audit view exists, but live contract event indexing is in-memory/incomplete. |
| Demo polish for judges | 5/10 | The story is visible, but the final payout/proof evidence needs stronger proof artifacts. |

Overall: around 60-65% of a convincing MVP. It can become 80-85% with a focused pass on real token escrow, runtime proof wiring, durable Stripe state, and a scripted judge demo.

## 2. Source Requirements Checked

Key source documents in `docs/`:

- `docs/mvp-scope.md`
- `docs/stack-confirmation.md`
- `docs/final-technical-report.md`
- `docs/final-acceptance-checklist.md`
- `docs/stripe-test-oauth-zk-revenue-proof-implementation-prompt.md`
- `docs/stripe-revenue-proof-setup.md`
- `docs/testnet-deployment-runbook.md`
- `docs/threat-model.md`
- `docs/privacy-disclosure.md`

Original MVP target from `mvp-scope.md`:

1. Sponsor creates and funds an escrow program.
2. Project/startup proves eligibility privately.
3. Attestor validates private milestone metrics.
4. Contract verifies milestone proof, prevents replay, and releases tranche.
5. Public audit shows accountability without raw private data.

Newer marketplace target from the implementation plan:

1. Investor/admin creates investment or grant pool.
2. Founder creates startup profile and applies to a pool.
3. Investor/admin approves application and defines milestones.
4. Approved application becomes a funding program with tranches.
5. Founder connects Stripe test account.
6. Stripe MRR threshold proof triggers smart contract tranche release.

## 3. Evidence Checked

Runtime checks:

- `GET http://127.0.0.1:4000/health` returned healthy API status.
- `prisma migrate status` against Neon reported 6 migrations and schema up to date.
- `contracts/deployments/latest.contracts.json` contains real Stellar testnet contract IDs generated on 2026-07-03.

Code paths checked:

- `apps/api/src/routes/marketplace.ts`
- `apps/api/src/services/marketplace-service.ts`
- `apps/api/src/routes/stripe-integration.ts`
- `apps/api/src/services/stripe-oauth-service.ts`
- `apps/api/src/services/stripe-connector-service.ts`
- `apps/api/src/services/stripe-revenue-snapshot-service.ts`
- `apps/api/src/services/escrow-contract-service.ts`
- `apps/api/src/routes/proofs.ts`
- `apps/api/src/services/program-service.ts`
- `apps/api/src/services/public-audit-service.ts`
- `apps/api/src/services/auth-service.ts`
- `apps/web/src/components/dashboard/dashboard-shell.tsx`
- `apps/web/src/features/marketplace/startup-profile-panel.tsx`
- `apps/web/src/features/marketplace/investor-marketplace-panel.tsx`
- `contracts/milestone-escrow/src/lib.rs`
- `circuits/payment-revenue-threshold-proof/payment-revenue-threshold-proof.circom`

## 4. What Works as Real, Non-Mock System Behavior

These scenarios are backed by real forms, API validation, PostgreSQL persistence, or real external/testnet calls.

| Scenario | Current status | Why it is real | Remaining caveat |
| --- | --- | --- | --- |
| Wallet login challenge and session | Works | Challenge/session are stored in PostgreSQL; signature verification uses Stellar public key verification outside test mode. | Role choice can still be self-selected for Project/Investor. |
| Admin role management | Works | Admin-only API can list and assign wallet roles in DB. | Admin bootstrap depends on env configuration. |
| Founder creates startup profile | Works | `POST /api/startups` writes `StartupProfile` to Neon. | No KYB/business registry verification yet. |
| Founder lists own startup profiles | Works | `GET /api/startups/mine` filters by authenticated founder wallet. | Depends on selected Project role. |
| Investor/admin lists startup profiles | Works | `GET /api/startups` returns submitted/listed DB startups. | Startup quality is user-submitted. |
| Investor creates investment/grant pool | Works | `POST /api/investment-pools` writes `InvestmentPool` to Neon. | Pool funding is not actually escrowed at creation. |
| Founder lists open pools | Works | `GET /api/investment-pools?scope=open` reads open DB pools. | No pool eligibility matching beyond UI text. |
| Founder applies to pool | Works | `POST /api/investment-pools/:poolId/applications` upserts `StartupPoolApplication` in Neon and prevents duplicate accepted resubmission. | No document attachments or diligence workflow. |
| Investor sees incoming applications | Works | `GET /api/investment-pool-applications/incoming` is filtered by pool owner unless admin. | Owner check is wallet-based. |
| Investor rejects application | Works | `POST /api/investment-pool-applications/:id/reject` updates DB with owner/admin authorization. | No rejection reason field. |
| Investor approves application into program/tranches | Partly real | DB creates `Program`, `Tranche`, links `StartupPoolApplication.programId`, then invokes testnet `MilestoneEscrow` methods. | Contract call is real, but escrow is not token custody and proof mode is mock-compatible. |
| Approved application visible to founder | Works | Founder applications include linked program and ordered tranches from DB. | UI is still dense and needs demo polish. |
| Founder Stripe OAuth start | Partly real | Builds a real Stripe Connect OAuth URL and requires program access. | OAuth state is in-memory, not persisted in `StripeOAuthState` table. |
| Stripe OAuth callback exchange | Partly real | Exchanges real code at `https://connect.stripe.com/oauth/token`; rejects live mode in test mode. | Connection is stored in-memory, not persisted in `StripeConnection` table. |
| Stripe revenue data fetch | Partly real | Uses real Stripe API endpoints with `Stripe-Account` header for charges/refunds/balance transactions. | Requires a real connected test account; no durable snapshot repository in current route path. |
| Stripe revenue normalization | Works | Computes gross/refund/fee/net from Stripe source data and rejects empty successful charges. | Fee attribution can be challenged in edge cases; needs test-account demo data. |
| Stripe snapshot redaction | Partly real | Public DTO excludes raw charge IDs/customer data; private values encrypted in service record. | Service record is in-memory, not the Prisma `PaymentRevenueSnapshot` table. |
| Stripe proof submit to contract | Partly real | Submit validates job/program/milestone public inputs, calls Stellar CLI via SDK, and updates tranche only after tx hash. | Proof job is placeholder and in-memory; on-chain proof uses mock marker. |
| Role-specific dashboard gating | Works | `RoleGate` and sidebar mode filter hide investor pages from founder and founder pages from investor; admin sees combined marketplace. | Users can self-add Project/Investor role through role selection. |
| Contract deployment artifact | Works | `latest.contracts.json` contains real testnet IDs for policy/root/nullifier/verifier/escrow/controller contracts. | Contract behavior is not full token escrow. |

## 5. What Is Still Mock, Placeholder, or Demo-Only

These paths should not be presented to judges as fully real without careful wording.

| Area | Current implementation | Risk |
| --- | --- | --- |
| Old `/api/proofs/eligibility/generate` | Creates `proofJson.mode = "mock"` in `ProofJobService` memory map. | Not real ZK proof generation. |
| Old `/api/proofs/milestone/generate` | Creates `proofJson.mode = "mock"` from attestor proof input. | Not real ZK proof generation. |
| Old `/api/proofs/milestone/submit` | Computes fake tx hash with SHA-256 and updates DB tranche. | No contract release in old path. |
| `ProofJobService` | In-memory `Map`. | Jobs disappear on API restart. |
| Stripe OAuth state | In-memory `Map`. | OAuth callback fails after API restart or multi-instance deployment. |
| Stripe connection | In-memory `Map`. | Connected account disappears on restart despite Prisma model existing. |
| Stripe snapshot | In-memory `Map`. | Snapshot/proof cannot be audited later. |
| Stripe webhook idempotency | In-memory `Set`. | Duplicate detection resets on restart. |
| Public audit events | In-memory `Map`. | No durable indexer of actual Soroban events. |
| Payment revenue ZK proof | API returns `proofSystem: "zk-compatible-placeholder"`. | Must not be marketed as real ZK proof verification. |
| Contract proof verification | `EscrowContractService` sends `MOCK_PROOF_MARKER`; contract mock mode accepts marker. | On-chain verifier does not validate Stripe proof. |
| Token escrow/funding | `fund_program` increments stored funded amount; `release_tranche` changes status and emits event. | No SAC/XLM transfer to founder; "payout" is not real payment yet. |
| Seed marketplace data | Artificial demo rows and fake-looking wallets. | Useful for UI population, not evidence of real workflow. |
| Issuer/attestor services | Designed as mock services per MVP docs. | Acceptable only if clearly labeled as demo trust assumptions. |

## 6. Scenario Inventory

### 6.1 Founder Marketplace Scenario

Currently real:

1. Founder logs in with wallet.
2. Founder selects Startup representative workspace.
3. Founder creates startup profile with name, industry, stage, amount, requirements, traction.
4. Profile is stored in PostgreSQL.
5. Founder sees open investment/grant pools from DB.
6. Founder applies to a selected pool.
7. Application is stored in PostgreSQL and visible in "My applications".
8. If investor approves, founder sees approved program/tranches.

Not yet real enough:

- No KYB provider or signed business credential.
- No attachments or diligence data room.
- No automatic matching/scoring against pool criteria.
- Founder does not receive an actual token transfer after release.

### 6.2 Investor Marketplace Scenario

Currently real:

1. Investor logs in with wallet.
2. Investor selects Investor workspace.
3. Investor creates Investment or Grant pool.
4. Pool is stored in PostgreSQL and becomes visible to founders.
5. Investor sees applications only for own pools.
6. Investor can reject an application.
7. Investor can approve an application with approved amount, asset contract, eligibility policy, release wallet, MRR threshold, currency, and period.
8. Approval creates DB program/tranches and attempts real Stellar testnet program setup.

Not yet real enough:

- No real investor funds are transferred into escrow.
- No investor commitment lifecycle from "offer" to signed/funded allocation.
- No portfolio/status screen showing actual contract balances or claimable/released funds.
- No grant-specific review workflow.

### 6.3 Admin Scenario

Currently real:

1. Admin role can access admin marketplace.
2. Admin marketplace shows founder and investor workspaces in one view.
3. Admin can access RBAC and assign roles.
4. Admin can approve/reject applications across all pools.

Not yet real enough:

- Admin dashboard is mostly a combined operational view, not a full compliance/control center.
- No system health, contract event, failed job, or Stripe connection monitoring.
- No audit log for role changes.

### 6.4 Stripe MRR Proof Scenario

Currently partly real:

1. Founder opens approved program/tranche.
2. Founder starts Stripe OAuth for that program.
3. API builds real Stripe OAuth URL.
4. Stripe callback can exchange a real OAuth code.
5. API can fetch real test-mode charges/refunds/balance transactions.
6. API can normalize net revenue and create public commitments.
7. API can create a proof job and mark it succeeded if threshold passed.
8. Submit validates public inputs against program/tranche policy.
9. Submit calls real testnet contract methods and stores tx hash after success.

Not yet real enough:

- OAuth state, connection, snapshot, and proof job are not durable.
- API does not run `snarkjs`/prover artifacts for a real proof.
- Payment revenue circuit has placeholder commitment/hash binding.
- Contract is not verifying a real Stripe-derived proof.
- Release does not transfer an asset.

### 6.5 Original Sponsor/Project Demo Scenario

Currently partly real, but older/demo-oriented:

1. Sponsor/investor creates program in DB through `/api/programs`.
2. Sponsor funds/activates program in DB.
3. Issuer creates mock credential.
4. Attestor creates mock/private milestone evidence and root.
5. Project generates mock eligibility/milestone proof jobs.
6. Project submits milestone proof.
7. DB tranche status becomes `Released`.

Not real:

- Proof jobs are mock.
- Submit generates a deterministic fake tx hash.
- No contract call in old proof submit route.
- No actual token transfer.

## 7. Contract Readiness

Deployed testnet contracts:

- `POLICY_REGISTRY_CONTRACT_ID`
- `ROOT_REGISTRY_CONTRACT_ID`
- `NULLIFIER_REGISTRY_CONTRACT_ID`
- `VERIFIER_ADAPTER_CONTRACT_ID`
- `MILESTONE_ESCROW_CONTRACT_ID`
- `GATED_ASSET_CONTROLLER_CONTRACT_ID`

What is strong:

- Deployment artifact is real and current.
- API has a real Stellar CLI transport through `MilestoneEscrowClient`.
- Marketplace approval calls contract setup methods.
- Stripe submit calls contract proof/eligibility/release methods.
- Contract enforces program status, tranche totals, recipient match, amount match, root active, policy active, nullifier used, and tranche state.

What is missing:

- `fund_program` does not move assets into escrow.
- `release_tranche` does not transfer SAC/XLM to the recipient.
- Proof verification is mock/digest style, not full Groth16 verifier integration.
- There is no indexed, durable contract event sync into `ContractEvent`.
- There is no wallet authorization/`require_auth` model in the escrow methods.

Judge risk: a technical judge can inspect `release_tranche` and see that no asset transfer happens. This is the biggest gap between product claim and implementation.

## 8. ZK Readiness

What exists:

- Eligibility circuit source and build artifacts.
- Milestone unlock circuit source and build artifacts.
- Payment revenue threshold circuit source and fixtures.
- `packages/zk` helpers for formatting public inputs.
- Scripts for compile/prove/test flows.

What is not wired:

- API proof generation does not call the Circom/snarkjs pipeline.
- Stripe proof generation returns `zk-compatible-placeholder`.
- Payment revenue circuit commitment binding is explicitly placeholder style.
- Contract receives `MOCK_PROOF_MARKER`, not a real proof.
- No verifier-key governance or on-chain verifier adapter integration for Stripe revenue proof.

Correct judge-facing language:

- Safe: "ZK-compatible revenue proof model with current placeholder commitment binding."
- Unsafe: "Fully verifies Stripe MRR with ZK on-chain."

## 9. Stripe Readiness

What is strong:

- OAuth uses Stripe Connect Standard account URL.
- OAuth exchange calls real Stripe endpoint.
- Revenue source fetch calls real Stripe charges/refunds/balance transaction endpoints.
- Startup Stripe secret keys are not requested.
- Public responses hide raw Stripe rows and customer data.
- Empty successful-charge data is rejected.
- Webhook route verifies `Stripe-Signature`.

What is missing:

- Persist `StripeOAuthState`, `StripeConnection`, `PaymentRevenueSnapshot`, `ProofJob`, and `StripeWebhookEvent` through Prisma.
- Store encrypted Stripe private snapshot fields in DB instead of memory.
- Add real integration test run evidence with a prepared connected test account.
- Build webhook-backed source root if claiming stronger third-party event evidence.
- Add admin operational screen for connected account/proof status.

## 10. UI/UX Readiness

What works:

- Dashboard is dark and visually aligned with shadcn/Tailwind primitives.
- Sidebar filters by active mode: startup, investor, admin.
- Startup workspace contains profile creation, available pools, applications, approved programs, and Stripe actions.
- Investor workspace contains pool creation, incoming applications, approval/rejection, milestone fields, startup list, and commitments.
- Admin marketplace combines startup and investor panels.

What needs polish:

- Investor and startup panels are dense and sometimes feel like database forms, not a guided investment flow.
- Approved-program Stripe flow should be a clear stepper: Connect Stripe -> Snapshot -> Generate proof -> Release.
- Error states should map technical failures to dark, human-readable messages.
- Judge demo should show visible proof artifacts, contract tx link, and tranche status transition in one screen.
- Old Sponsor/Project/Issuer/Attestor surfaces should be hidden from the primary marketplace demo unless intentionally shown as "protocol internals".

## 11. Security and Trust Model Gaps

Critical gaps:

1. Project/Investor role can be self-selected after wallet login.
2. Admin role depends on env/bootstrap and manual assignment.
3. Contract methods do not require sponsor/project auth.
4. No real custody or token transfer.
5. In-memory proof/OAuth/snapshot state breaks auditability.
6. Mock issuer/attestor are acceptable for demo only.
7. Placeholder proof binding is not production cryptography.
8. No durable audit log for RBAC actions, approvals, Stripe proofs, and contract events.

## 12. MVP Gap Analysis

| Requirement | Current state | Gap |
| --- | --- | --- |
| Capital locked in escrow | Contract stores funded amount | Implement actual asset transfer into escrow. |
| Tranche released after proof | Contract status release exists | Add actual transfer to recipient. |
| Private milestone proof | Mock/path and placeholder Stripe proof | Wire real prover and verifier. |
| Public audit trail | Sanitized view, in-memory events | Persistent event indexer from Soroban RPC. |
| Real Stripe data | Real Stripe API client exists | Persist OAuth/snapshot/proof and run real test evidence. |
| Founder/investor marketplace | DB-backed flow exists | Add funding/approval lifecycle depth and demo polish. |
| Admin oversight | RBAC and combined marketplace | Add audit, system status, failed jobs, contract event monitoring. |
| Judge-ready demo | Local app works | Need one scripted, repeatable path with tx links and proof artifacts. |

## 13. Priority Plan

### P0 - Must Fix Before Serious Judge Demo

1. Implement real token custody in `MilestoneEscrow`.
   - Use Stellar token client/SAC interface.
   - `fund_program` must transfer asset from sponsor to escrow.
   - `release_tranche` must transfer tranche amount from escrow to recipient.
   - Add contract tests proving balances change.
   - UI must show contract tx hash and explorer link.

2. Persist Stripe integration state.
   - Replace in-memory OAuth states with `StripeOAuthState`.
   - Replace in-memory connections with `StripeConnection`.
   - Replace in-memory snapshots with `PaymentRevenueSnapshot`.
   - Persist webhook IDs in `StripeWebhookEvent`.
   - Add restart-safe tests.

3. Persist proof jobs.
   - Replace `ProofJobService` memory map with Prisma-backed repository.
   - Ensure proof status survives API restart.
   - Add duplicate release protection at DB and contract layers.

4. Wire real payment revenue prover path.
   - Generate witness from stored encrypted Stripe snapshot.
   - Run `snarkjs` or prover service for `PaymentRevenueThreshold`.
   - Store proof JSON and public inputs.
   - Mark placeholder commitment limitations explicitly until Poseidon binding is complete.

5. Remove mock marker from Stripe release path.
   - Contract submit should receive verifier-compatible proof/digest.
   - If full Groth16 on-chain is not feasible for hackathon, implement honest "off-chain verified proof + on-chain proof hash attestation" and label it clearly.

6. Build a single judge-ready E2E flow.
   - Investor creates pool.
   - Founder creates startup.
   - Founder applies.
   - Investor approves with one MRR milestone.
   - Founder connects prepared Stripe test account.
   - Founder generates proof.
   - Contract releases real test token tranche.
   - Admin/public audit shows event trail.

### P1 - Should Fix for Strong MVP

1. Add contract event indexer.
   - Read Soroban events for deployed contracts.
   - Persist `ContractEvent`.
   - Idempotent cursor-based processing.
   - Show events in admin/audit view.

2. Add real role onboarding.
   - Founder and investor can self-select workspace for demo, but admin must verify production role.
   - Add "unverified" badge and admin approval state.
   - Audit all role changes.

3. Improve marketplace domain model.
   - Add application review notes.
   - Add due diligence fields/attachments.
   - Add grant vs investment-specific statuses.
   - Add investor commitment acceptance and funding status.

4. Tighten Stripe proof trust model.
   - Add webhook-backed event root.
   - Include test evidence setup doc with exact Stripe dashboard steps.
   - Add real integration test artifact from `STRIPE_REAL_CONNECTED_ACCOUNT_ID`.

5. Make admin panel operational.
   - Cards for pending approvals, failed proof jobs, disconnected Stripe accounts, contract errors.
   - Contract event table.
   - Recent releases and unreleased ready tranches.

6. Add targeted test coverage.
   - Founder creates startup.
   - Founder applies.
   - Non-owner investor cannot approve.
   - Owner approves and creates DB program/tranches plus contract setup.
   - Stripe proof cannot be submitted for wrong startup/program/milestone.
   - Duplicate release is rejected.
   - API restart does not lose OAuth/proof/snapshot.

### P2 - Wow Effect Work

1. Create a judge demo command.
   - `pnpm demo:marketplace-stripe-contract`
   - Outputs startup ID, pool ID, application ID, program ID, proof job ID, contract tx hashes, and explorer links.

2. Add "Proof Receipt" UI.
   - Shows public policy fields, threshold passed, commitment, nullifier, proof hash, tx hash.
   - No raw Stripe account ID, charge IDs, customers, or exact private revenue.

3. Add visual funding timeline.
   - Applied -> Approved -> Escrow funded -> Stripe connected -> Proof generated -> Tranche released.

4. Add contract explorer links.
   - Every contract tx shown as clickable testnet explorer link.

5. Add a judge-safe demo dataset.
   - Real Stellar test accounts.
   - Real test token/SAC balances.
   - Real Stripe test connected account with non-empty test charges.
   - No fake wallet strings in the primary demo.

6. Add final demo script and fallback script.
   - Main script: real Stripe + real test token release.
   - Fallback script: pre-recorded proof receipt and tx hashes if Stripe OAuth is unavailable during live judging.

## 14. Recommended Demo Positioning

Use this honest positioning:

> Pact is a Stellar testnet prototype for private milestone-based startup funding. The marketplace and approval flow are database-backed. Stripe test-mode data is fetched through Connect OAuth without startup secret keys. A proof-compatible revenue snapshot gates contract release. The next hardening step is replacing the current placeholder proof binding and state-only escrow with production-grade proof verification and actual token custody.

Avoid saying:

- "The smart contract pays the founder today" until token transfer is implemented.
- "Stripe MRR is fully proven with ZK on-chain" until real proof generation and verification are wired.
- "All data is persistent" until OAuth/proof/snapshot/webhook services use Prisma repositories.

## 15. Short Next Sprint Plan

Suggested order:

1. Real token transfer in `MilestoneEscrow`.
2. Prisma-backed Stripe state and proof jobs.
3. Runtime payment revenue prover integration.
4. Contract/verifier path without mock marker.
5. Persistent contract event indexer.
6. Judge demo stepper UI and explorer-linked proof receipt.
7. Targeted tests for the new marketplace + Stripe + contract path.

If only 1-2 days are available before judging, prioritize:

1. Actual token transfer.
2. Persistent Stripe/proof state.
3. One scripted happy path with explorer links.
4. Clear UI labels for placeholder proof limitations.

## 16. Final Assessment

The project has a strong hackathon concept and a credible architecture. The current implementation already demonstrates meaningful engineering work: role-aware UI, cloud DB marketplace persistence, real Stripe API integration code, deployed testnet contracts, and a working approval-to-program bridge.

The main risk is overclaiming. Judges will likely reward the idea and integration breadth, but technical judges may penalize the lack of real token custody and runtime ZK verification. Fixing those two areas, even in a narrow testnet-only way, would create the largest jump in perceived quality and credibility.
