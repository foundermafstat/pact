# Аудит текущей системы Pact и готовности MVP

Дата: 2026-07-03

Область проверки: текущее состояние репозитория, требования из `docs/`, API/UI-сценарии, Prisma schema, артефакт задеплоенных testnet-контрактов, health-check API и статус миграций.

## 1. Краткий вывод

Pact заметно приблизился к MVP, который можно показывать судьям: уже есть role-based dashboard, облачная PostgreSQL-персистентность для marketplace, сценарии заявок между стартапом и инвестором, код Stripe test-mode connector и задеплоенные Stellar testnet contracts.

Но система еще не является полностью реальным продуктом уровня "капитал заблокирован, ZK-пруф проверен, транш выплачен". Самая сильная часть сейчас - database-backed marketplace flow. Самые слабые зоны - реальная custody/transfer логика актива, durable Stripe/proof storage и настоящий runtime ZK proof generation/verification.

Оценка готовности MVP:

| Область | Готовность | Комментарий для судей |
| --- | ---: | --- |
| Продуктовая история | 8/10 | Сильный narrative: startup applies, investor approves, private revenue unlocks tranche. |
| Role-based dashboard | 7/10 | Разделение founder/investor/admin есть; старые demo-surfaces немного шумят. |
| Marketplace DB flow | 8/10 | Реальные формы и Neon-backed records есть. |
| Testnet smart contract integration | 5/10 | Контракты задеплоены и вызываются, но escrow пока state machine, не реальная custody. |
| Stripe test data path | 6/10 | Реальные Stripe API calls реализованы; OAuth/snapshots/proof jobs пока in-memory. |
| ZK runtime path | 3/10 | Circuits есть, но API использует placeholder proof jobs и contract mock proof marker. |
| Public audit trail | 4/10 | Sanitized audit view есть, но live contract event indexing неполный и in-memory. |
| Demo polish для судей | 5/10 | История видна, но payout/proof evidence нужно усилить. |

Итог: примерно 60-65% убедительного MVP. До 80-85% можно дойти сфокусированным проходом по real token escrow, runtime proof wiring, durable Stripe state и scripted judge demo.

## 2. Проверенные исходные требования

Ключевые документы в `docs/`:

- `docs/mvp-scope.md`
- `docs/stack-confirmation.md`
- `docs/final-technical-report.md`
- `docs/final-acceptance-checklist.md`
- `docs/stripe-test-oauth-zk-revenue-proof-implementation-prompt.md`
- `docs/stripe-revenue-proof-setup.md`
- `docs/testnet-deployment-runbook.md`
- `docs/threat-model.md`
- `docs/privacy-disclosure.md`

Исходная цель MVP из `mvp-scope.md`:

1. Sponsor создает и фондирует escrow program.
2. Project/startup приватно доказывает eligibility.
3. Attestor валидирует приватные milestone metrics.
4. Contract проверяет milestone proof, предотвращает replay и release-ит tranche.
5. Public audit показывает accountability без raw private data.

Новая marketplace-цель из implementation plan:

1. Investor/admin создает investment или grant pool.
2. Founder создает startup profile и подает заявку в pool.
3. Investor/admin approve-ит application и задает milestones.
4. Approved application становится funding program с tranches.
5. Founder подключает Stripe test account.
6. Stripe MRR threshold proof запускает smart contract tranche release.

## 3. Проверенные факты

Runtime checks:

- `GET http://127.0.0.1:4000/health` вернул healthy API status.
- `prisma migrate status` против Neon показал 6 migrations и актуальную schema.
- `contracts/deployments/latest.contracts.json` содержит реальные Stellar testnet contract IDs, сгенерированные 2026-07-03.

Проверенные code paths:

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

## 4. Что работает как реальное, не mock-поведение

Эти сценарии подкреплены реальными формами, API validation, PostgreSQL persistence или внешними/testnet calls.

| Сценарий | Текущий статус | Почему это реально | Оставшееся ограничение |
| --- | --- | --- | --- |
| Wallet login challenge и session | Работает | Challenge/session хранятся в PostgreSQL; signature verification использует Stellar public key вне test mode. | Project/Investor роль можно выбрать самостоятельно. |
| Admin role management | Работает | Admin-only API может list/assign wallet roles в DB. | Admin bootstrap зависит от env. |
| Founder создает startup profile | Работает | `POST /api/startups` пишет `StartupProfile` в Neon. | Нет KYB/business registry verification. |
| Founder видит свои startup profiles | Работает | `GET /api/startups/mine` фильтрует по authenticated founder wallet. | Зависит от выбранной Project роли. |
| Investor/admin видит startup profiles | Работает | `GET /api/startups` возвращает submitted/listed DB startups. | Качество данных полностью user-submitted. |
| Investor создает investment/grant pool | Работает | `POST /api/investment-pools` пишет `InvestmentPool` в Neon. | Funding pool не escrowed при создании. |
| Founder видит open pools | Работает | `GET /api/investment-pools?scope=open` читает open DB pools. | Нет matching/scoring по требованиям. |
| Founder подает заявку в pool | Работает | `POST /api/investment-pools/:poolId/applications` upsert-ит `StartupPoolApplication` в Neon. | Нет attachments/diligence workflow. |
| Investor видит incoming applications | Работает | `GET /api/investment-pool-applications/incoming` фильтруется по owner pool, кроме admin. | Owner check основан на wallet. |
| Investor reject-ит application | Работает | `POST /api/investment-pool-applications/:id/reject` обновляет DB с owner/admin authorization. | Нет rejection reason. |
| Investor approve-ит application в program/tranches | Частично реально | DB создает `Program`, `Tranche`, связывает `StartupPoolApplication.programId`, затем вызывает testnet `MilestoneEscrow`. | Contract call реальный, но escrow не custody и proof mode mock-compatible. |
| Approved application видна founder-у | Работает | Founder applications включают linked program и ordered tranches из DB. | UI еще требует demo polish. |
| Founder запускает Stripe OAuth | Частично реально | Строится реальный Stripe Connect OAuth URL и проверяется доступ к program. | OAuth state in-memory, не в `StripeOAuthState`. |
| Stripe OAuth callback exchange | Частично реально | Код обменивается на `https://connect.stripe.com/oauth/token`; live mode отклоняется в test mode. | Connection in-memory, не в `StripeConnection`. |
| Stripe revenue data fetch | Частично реально | Используются реальные Stripe API endpoints с `Stripe-Account` header. | Нужен real connected test account; snapshot не durable. |
| Stripe revenue normalization | Работает | Считает gross/refund/fee/net и отклоняет пустые successful charges. | Fee attribution требует усиления для edge cases. |
| Stripe snapshot redaction | Частично реально | Public DTO не раскрывает raw charge IDs/customer data; private values encrypted в service record. | Service record in-memory, не в Prisma table. |
| Stripe proof submit to contract | Частично реально | Submit валидирует job/program/milestone public inputs, вызывает Stellar CLI через SDK и обновляет tranche после tx hash. | Proof job placeholder и in-memory; on-chain proof использует mock marker. |
| Role-specific dashboard gating | Работает | `RoleGate` и sidebar mode filter скрывают чужие страницы; admin видит combined marketplace. | Project/Investor роль можно self-add через role selection. |
| Contract deployment artifact | Работает | `latest.contracts.json` содержит реальные testnet IDs. | Contract behavior не full token escrow. |

## 5. Что остается mock, placeholder или demo-only

Эти зоны нельзя подавать судьям как полностью реальные без аккуратной формулировки.

| Область | Текущая реализация | Риск |
| --- | --- | --- |
| Старый `/api/proofs/eligibility/generate` | Создает `proofJson.mode = "mock"` в memory map. | Не real ZK proof generation. |
| Старый `/api/proofs/milestone/generate` | Создает `proofJson.mode = "mock"` из attestor proof input. | Не real ZK proof generation. |
| Старый `/api/proofs/milestone/submit` | Вычисляет fake tx hash через SHA-256 и обновляет DB tranche. | В старом path нет contract release. |
| `ProofJobService` | In-memory `Map`. | Jobs исчезают после API restart. |
| Stripe OAuth state | In-memory `Map`. | OAuth callback ломается после restart/multi-instance. |
| Stripe connection | In-memory `Map`. | Connected account исчезает после restart. |
| Stripe snapshot | In-memory `Map`. | Snapshot/proof нельзя аудитить позже. |
| Stripe webhook idempotency | In-memory `Set`. | Duplicate detection сбрасывается после restart. |
| Public audit events | In-memory `Map`. | Нет durable indexer actual Soroban events. |
| Payment revenue ZK proof | API возвращает `proofSystem: "zk-compatible-placeholder"`. | Нельзя называть real ZK proof verification. |
| Contract proof verification | `EscrowContractService` отправляет `MOCK_PROOF_MARKER`. | On-chain verifier не проверяет Stripe proof. |
| Token escrow/funding | `fund_program` увеличивает stored funded amount; `release_tranche` меняет status и emits event. | Нет SAC/XLM transfer founder-у. |
| Seed marketplace data | Artificial demo rows и fake-looking wallets. | Подходит для UI population, не для доказательства реального workflow. |
| Issuer/attestor services | Mock services по MVP docs. | Допустимо только как явно обозначенная demo trust assumption. |

## 6. Инвентаризация сценариев

### 6.1 Founder Marketplace Scenario

Сейчас реально:

1. Founder логинится wallet-ом.
2. Founder выбирает Startup representative workspace.
3. Founder создает startup profile с name, industry, stage, amount, requirements, traction.
4. Profile сохраняется в PostgreSQL.
5. Founder видит open investment/grant pools из DB.
6. Founder applies to selected pool.
7. Application сохраняется в PostgreSQL и видна в "My applications".
8. Если investor approve-ит, founder видит approved program/tranches.

Пока недостаточно реально:

- Нет KYB provider или signed business credential.
- Нет attachments/data room.
- Нет automatic matching/scoring against pool criteria.
- Founder не получает actual token transfer after release.

### 6.2 Investor Marketplace Scenario

Сейчас реально:

1. Investor логинится wallet-ом.
2. Investor выбирает Investor workspace.
3. Investor создает Investment или Grant pool.
4. Pool сохраняется в PostgreSQL и становится видимым founder-ам.
5. Investor видит applications только для своих pools.
6. Investor может reject-ить application.
7. Investor может approve-ить application с approved amount, asset contract, eligibility policy, release wallet, MRR threshold, currency и period.
8. Approval создает DB program/tranches и пытается выполнить real Stellar testnet program setup.

Пока недостаточно реально:

- Реальные investor funds не переводятся в escrow.
- Нет lifecycle от investment offer до signed/funded allocation.
- Нет portfolio/status screen с actual contract balances или claimable/released funds.
- Нет grant-specific review workflow.

### 6.3 Admin Scenario

Сейчас реально:

1. Admin role открывает admin marketplace.
2. Admin marketplace показывает founder и investor workspaces в одном view.
3. Admin может открывать RBAC и assign-ить roles.
4. Admin может approve/reject applications по всем pools.

Пока недостаточно реально:

- Admin dashboard пока combined operational view, а не полноценный compliance/control center.
- Нет system health, contract event, failed job или Stripe connection monitoring.
- Нет audit log для role changes.

### 6.4 Stripe MRR Proof Scenario

Сейчас частично реально:

1. Founder открывает approved program/tranche.
2. Founder starts Stripe OAuth for that program.
3. API строит real Stripe OAuth URL.
4. Stripe callback может exchange-ить real OAuth code.
5. API может fetch-ить real test-mode charges/refunds/balance transactions.
6. API может normalize-ить net revenue и создать public commitments.
7. API может создать proof job и отметить его succeeded, если threshold passed.
8. Submit валидирует public inputs against program/tranche policy.
9. Submit вызывает real testnet contract methods и сохраняет tx hash после success.

Пока недостаточно реально:

- OAuth state, connection, snapshot и proof job не durable.
- API не запускает `snarkjs`/prover artifacts для real proof.
- Payment revenue circuit имеет placeholder commitment/hash binding.
- Contract не verifies real Stripe-derived proof.
- Release не transfer-ит asset.

### 6.5 Original Sponsor/Project Demo Scenario

Сейчас частично реально, но старый/demo-oriented:

1. Sponsor/investor создает program в DB через `/api/programs`.
2. Sponsor funds/activates program в DB.
3. Issuer создает mock credential.
4. Attestor создает mock/private milestone evidence и root.
5. Project генерирует mock eligibility/milestone proof jobs.
6. Project submits milestone proof.
7. DB tranche status становится `Released`.

Не реально:

- Proof jobs mock.
- Submit генерирует deterministic fake tx hash.
- Нет contract call в старом proof submit route.
- Нет actual token transfer.

## 7. Готовность контрактов

Задеплоенные testnet contracts:

- `POLICY_REGISTRY_CONTRACT_ID`
- `ROOT_REGISTRY_CONTRACT_ID`
- `NULLIFIER_REGISTRY_CONTRACT_ID`
- `VERIFIER_ADAPTER_CONTRACT_ID`
- `MILESTONE_ESCROW_CONTRACT_ID`
- `GATED_ASSET_CONTROLLER_CONTRACT_ID`

Сильные стороны:

- Deployment artifact реальный и актуальный.
- API имеет real Stellar CLI transport через `MilestoneEscrowClient`.
- Marketplace approval вызывает contract setup methods.
- Stripe submit вызывает contract proof/eligibility/release methods.
- Contract проверяет program status, tranche totals, recipient match, amount match, root active, policy active, nullifier used и tranche state.

Чего не хватает:

- `fund_program` не переводит assets в escrow.
- `release_tranche` не переводит SAC/XLM recipient-у.
- Proof verification mock/digest style, не full Groth16 verifier integration.
- Нет indexed durable contract event sync в `ContractEvent`.
- Нет wallet authorization/`require_auth` model в escrow methods.

Judge risk: технический судья может открыть `release_tranche` и увидеть, что asset transfer отсутствует. Это главный разрыв между product claim и implementation.

## 8. Готовность ZK

Что есть:

- Eligibility circuit source и build artifacts.
- Milestone unlock circuit source и build artifacts.
- Payment revenue threshold circuit source и fixtures.
- `packages/zk` helpers для formatting public inputs.
- Scripts для compile/prove/test flows.

Что не wired:

- API proof generation не вызывает Circom/snarkjs pipeline.
- Stripe proof generation возвращает `zk-compatible-placeholder`.
- Payment revenue circuit commitment binding явно placeholder style.
- Contract получает `MOCK_PROOF_MARKER`, а не real proof.
- Нет verifier-key governance или on-chain verifier adapter integration для Stripe revenue proof.

Корректная judge-facing формулировка:

- Можно: "ZK-compatible revenue proof model with current placeholder commitment binding."
- Нельзя: "Fully verifies Stripe MRR with ZK on-chain."

## 9. Готовность Stripe

Сильные стороны:

- OAuth использует Stripe Connect Standard account URL.
- OAuth exchange вызывает real Stripe endpoint.
- Revenue source fetch вызывает real Stripe charges/refunds/balance transaction endpoints.
- Startup Stripe secret keys не запрашиваются.
- Public responses скрывают raw Stripe rows и customer data.
- Empty successful-charge data отклоняется.
- Webhook route проверяет `Stripe-Signature`.

Чего не хватает:

- Persist `StripeOAuthState`, `StripeConnection`, `PaymentRevenueSnapshot`, `ProofJob` и `StripeWebhookEvent` через Prisma.
- Store encrypted Stripe private snapshot fields в DB вместо memory.
- Добавить real integration test evidence с подготовленным connected test account.
- Build webhook-backed source root, если заявляется stronger third-party event evidence.
- Добавить admin operational screen для connected account/proof status.

## 10. UI/UX Readiness

Что работает:

- Dashboard темный и визуально согласован с shadcn/Tailwind primitives.
- Sidebar фильтруется по active mode: startup, investor, admin.
- Startup workspace содержит profile creation, available pools, applications, approved programs и Stripe actions.
- Investor workspace содержит pool creation, incoming applications, approval/rejection, milestone fields, startup list и commitments.
- Admin marketplace объединяет startup и investor panels.

Что нужно отполировать:

- Investor и startup panels плотные и местами выглядят как database forms, а не guided investment flow.
- Approved-program Stripe flow должен стать clear stepper: Connect Stripe -> Snapshot -> Generate proof -> Release.
- Error states должны переводить technical failures в dark, human-readable messages.
- Judge demo должен показывать proof artifacts, contract tx link и tranche status transition на одном экране.
- Старые Sponsor/Project/Issuer/Attestor surfaces лучше скрыть из primary marketplace demo или обозначить как "protocol internals".

## 11. Security and Trust Model Gaps

Критичные gaps:

1. Project/Investor role can be self-selected after wallet login.
2. Admin role зависит от env/bootstrap и manual assignment.
3. Contract methods не require sponsor/project auth.
4. Нет real custody или token transfer.
5. In-memory proof/OAuth/snapshot state ломает auditability.
6. Mock issuer/attestor допустимы только для demo.
7. Placeholder proof binding не production cryptography.
8. Нет durable audit log для RBAC actions, approvals, Stripe proofs и contract events.

## 12. MVP Gap Analysis

| Requirement | Current state | Gap |
| --- | --- | --- |
| Capital locked in escrow | Contract stores funded amount | Реализовать actual asset transfer into escrow. |
| Tranche released after proof | Contract status release exists | Добавить actual transfer to recipient. |
| Private milestone proof | Mock/path и placeholder Stripe proof | Wire real prover and verifier. |
| Public audit trail | Sanitized view, in-memory events | Persistent event indexer from Soroban RPC. |
| Real Stripe data | Real Stripe API client exists | Persist OAuth/snapshot/proof и run real test evidence. |
| Founder/investor marketplace | DB-backed flow exists | Добавить funding/approval lifecycle depth и demo polish. |
| Admin oversight | RBAC и combined marketplace | Добавить audit, system status, failed jobs, contract event monitoring. |
| Judge-ready demo | Local app works | Нужен scripted repeatable path с tx links и proof artifacts. |

## 13. Priority Plan

### P0 - Обязательно до серьезного judge demo

1. Реализовать real token custody в `MilestoneEscrow`.
   - Использовать Stellar token client/SAC interface.
   - `fund_program` должен переводить asset от sponsor в escrow.
   - `release_tranche` должен переводить tranche amount из escrow recipient-у.
   - Добавить contract tests, доказывающие balance changes.
   - UI должен показывать contract tx hash и explorer link.

2. Persist Stripe integration state.
   - Заменить in-memory OAuth states на `StripeOAuthState`.
   - Заменить in-memory connections на `StripeConnection`.
   - Заменить in-memory snapshots на `PaymentRevenueSnapshot`.
   - Persist webhook IDs в `StripeWebhookEvent`.
   - Добавить restart-safe tests.

3. Persist proof jobs.
   - Заменить `ProofJobService` memory map на Prisma-backed repository.
   - Убедиться, что proof status survives API restart.
   - Добавить duplicate release protection на DB и contract layers.

4. Wire real payment revenue prover path.
   - Generate witness из stored encrypted Stripe snapshot.
   - Run `snarkjs` или prover service для `PaymentRevenueThreshold`.
   - Store proof JSON и public inputs.
   - Явно маркировать placeholder commitment limitations до полной Poseidon binding.

5. Убрать mock marker из Stripe release path.
   - Contract submit должен получать verifier-compatible proof/digest.
   - Если full Groth16 on-chain невозможен для хакатона, сделать честный "off-chain verified proof + on-chain proof hash attestation" и ясно это label-ить.

6. Собрать единый judge-ready E2E flow.
   - Investor creates pool.
   - Founder creates startup.
   - Founder applies.
   - Investor approves with one MRR milestone.
   - Founder connects prepared Stripe test account.
   - Founder generates proof.
   - Contract releases real test token tranche.
   - Admin/public audit shows event trail.

### P1 - Желательно для сильного MVP

1. Добавить contract event indexer.
   - Читать Soroban events для deployed contracts.
   - Persist `ContractEvent`.
   - Idempotent cursor-based processing.
   - Показывать events в admin/audit view.

2. Добавить real role onboarding.
   - Founder и investor могут self-select workspace для demo, но production role должен verify-ить admin.
   - Добавить "unverified" badge и admin approval state.
   - Audit all role changes.

3. Улучшить marketplace domain model.
   - Добавить application review notes.
   - Добавить due diligence fields/attachments.
   - Добавить grant vs investment-specific statuses.
   - Добавить investor commitment acceptance и funding status.

4. Усилить Stripe proof trust model.
   - Добавить webhook-backed event root.
   - Включить test evidence setup doc с exact Stripe dashboard steps.
   - Добавить real integration test artifact from `STRIPE_REAL_CONNECTED_ACCOUNT_ID`.

5. Сделать admin panel operational.
   - Cards для pending approvals, failed proof jobs, disconnected Stripe accounts, contract errors.
   - Contract event table.
   - Recent releases и unreleased ready tranches.

6. Добавить targeted test coverage.
   - Founder creates startup.
   - Founder applies.
   - Non-owner investor cannot approve.
   - Owner approves and creates DB program/tranches plus contract setup.
   - Stripe proof cannot be submitted for wrong startup/program/milestone.
   - Duplicate release is rejected.
   - API restart does not lose OAuth/proof/snapshot.

### P2 - Wow Effect Work

1. Создать judge demo command.
   - `pnpm demo:marketplace-stripe-contract`
   - Выводит startup ID, pool ID, application ID, program ID, proof job ID, contract tx hashes и explorer links.

2. Добавить "Proof Receipt" UI.
   - Показывает public policy fields, threshold passed, commitment, nullifier, proof hash, tx hash.
   - Не раскрывает raw Stripe account ID, charge IDs, customers или exact private revenue.

3. Добавить visual funding timeline.
   - Applied -> Approved -> Escrow funded -> Stripe connected -> Proof generated -> Tranche released.

4. Добавить contract explorer links.
   - Каждый contract tx показывается как clickable testnet explorer link.

5. Добавить judge-safe demo dataset.
   - Real Stellar test accounts.
   - Real test token/SAC balances.
   - Real Stripe test connected account with non-empty test charges.
   - Без fake wallet strings в primary demo.

6. Добавить final demo script и fallback script.
   - Main script: real Stripe + real test token release.
   - Fallback script: pre-recorded proof receipt и tx hashes, если Stripe OAuth недоступен во время live judging.

## 14. Рекомендуемое позиционирование demo

Честная формулировка:

> Pact - это Stellar testnet prototype для private milestone-based startup funding. Marketplace и approval flow уже database-backed. Stripe test-mode data забирается через Connect OAuth без startup secret keys. Proof-compatible revenue snapshot gate-ит contract release. Следующий hardening step - заменить current placeholder proof binding и state-only escrow на production-grade proof verification и actual token custody.

Не стоит говорить:

- "The smart contract pays the founder today" до реализации token transfer.
- "Stripe MRR is fully proven with ZK on-chain" до wiring real proof generation and verification.
- "All data is persistent" до перевода OAuth/proof/snapshot/webhook services на Prisma repositories.

## 15. Short Next Sprint Plan

Рекомендуемый порядок:

1. Real token transfer in `MilestoneEscrow`.
2. Prisma-backed Stripe state and proof jobs.
3. Runtime payment revenue prover integration.
4. Contract/verifier path without mock marker.
5. Persistent contract event indexer.
6. Judge demo stepper UI and explorer-linked proof receipt.
7. Targeted tests for the new marketplace + Stripe + contract path.

Если до judging есть только 1-2 дня, приоритет:

1. Actual token transfer.
2. Persistent Stripe/proof state.
3. One scripted happy path with explorer links.
4. Clear UI labels for placeholder proof limitations.

## 16. Финальная оценка

У проекта сильная hackathon-концепция и убедительная архитектура. Текущая реализация уже показывает значимую инженерную работу: role-aware UI, cloud DB marketplace persistence, real Stripe API integration code, deployed testnet contracts и working approval-to-program bridge.

Главный риск - overclaiming. Судьи, скорее всего, оценят идею и breadth интеграций, но технические судьи могут снизить оценку из-за отсутствия real token custody и runtime ZK verification. Исправление этих двух зон, даже narrow testnet-only способом, даст самый большой рост качества и доверия.
