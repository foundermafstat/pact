# Pact MVP — стек, ключи и поэтапный технический план разработки

Источник: `dop_doc.md` и `Pact_MVP_Technical_Document.md`.

Документ нужен для подтверждения разработчиком выбранного стека, запроса доступов и самостоятельной поэтапной реализации MVP `Pact: Private Milestone Escrow`.

---

## 1. Стек проекта на подтверждение разработчиком

### 1.1 Общая структура

- Репозиторий: `pnpm` monorepo.
- Язык: TypeScript для frontend/backend/shared/sdk/zk helpers.
- Контракты: Rust smart contracts для Stellar Soroban.
- Сеть MVP: Stellar testnet.
- Актив MVP: testnet XLM или demo issued asset через Stellar Asset Contract.
- Основная цель MVP: приватное подтверждение eligibility и milestone completion с публичным escrow/audit trail.

### 1.2 Frontend

- `apps/web`: Next.js + React + TypeScript.
- UI: Tailwind CSS или существующая дизайн-система после утверждения макетов.
- Wallet: Stellar wallet integration через совместимый browser wallet adapter.
- Тесты: Playwright для demo flow и базовых UI-сценариев.

### 1.3 Backend и off-chain services

- `apps/api`: Node.js + TypeScript + Fastify.
- Validation: Zod schemas.
- DB: PostgreSQL.
- ORM: Prisma.
- Queue/cache: Redis + BullMQ.
- Stellar calls: Stellar SDK.
- Services внутри API или отдельными воркерами: issuer mock, milestone attestor mock, root builder, prover jobs, event indexer.
- Тесты: Vitest для unit/integration API tests.

### 1.4 On-chain

- `contracts/*`: Soroban contracts на Rust.
- Contracts: `PolicyRegistry`, `RootRegistry`, `NullifierRegistry`, `VerifierAdapter`, `MilestoneEscrow`, optional `GatedAssetController`.
- Build/deploy: Stellar CLI.
- MVP verifier modes: сначала `Mock`, затем `Groth16Bn254`.
- Тесты: Rust contract unit tests и testnet invocation smoke tests.

### 1.5 ZK

- Circuits: Circom.
- Proof system: Groth16.
- Curve: BN254.
- Hash: Poseidon.
- Tooling: snarkjs-compatible proving pipeline.
- Circuits: `EligibilityProof`, `MilestoneUnlockProof`.
- Тесты: positive/negative circuit tests на witness/proof generation.

### 1.6 Shared packages

- `packages/shared`: schemas, constants, policy format, common DTO.
- `packages/sdk`: TypeScript SDK for API and Soroban contract calls.
- `packages/zk`: proof helpers, public input formatting, artifact loading.

### 1.7 Deployment MVP

- Web: Vercel or equivalent static/server deployment.
- API/prover/indexer: Dockerized Node services.
- DB/Redis: managed service or Docker for staging.
- Contracts: Stellar testnet deploy with saved contract IDs in env.

---

## 2. Ключи и доступы, которые нужно сразу запросить у разработчика

Разработчик должен подтвердить стек выше и предоставить значения для `.env.example`.

### 2.1 Stellar / Soroban

- `STELLAR_RPC_URL`
- `STELLAR_HORIZON_URL`
- `STELLAR_NETWORK_PASSPHRASE`
- `STELLAR_DEPLOYER_SECRET_KEY`
- `STELLAR_SPONSOR_SECRET_KEY`
- `STELLAR_PROJECT_SECRET_KEY`
- `STELLAR_ISSUER_SECRET_KEY`
- `STELLAR_ATTESTOR_SECRET_KEY`
- Demo asset decision: testnet XLM или issued asset.
- Если issued asset: `DEMO_ASSET_CODE`, issuer public/secret key, SAC contract id.

### 2.2 Contracts

- После deploy: contract IDs для всех MVP contracts.
- Подтверждение admin accounts для policy/root/verifier/escrow.
- Подтверждение режима verifier: `Mock` для раннего demo, `Groth16Bn254` для финального testnet demo.

### 2.3 Backend / infrastructure

- `DATABASE_URL`
- `REDIS_URL`
- `API_ADMIN_TOKEN`
- `JWT_SECRET`
- `ENCRYPTION_KEY_BASE64`
- Deployment URLs: web, API, prover.
- CORS origin для frontend.

### 2.4 ZK artifacts

- Powers of Tau file path or download source.
- `.wasm`, `.zkey`, `verification_key.json` для `EligibilityProof`.
- `.wasm`, `.zkey`, `verification_key.json` для `MilestoneUnlockProof`.
- Подтверждение, кто генерирует trusted setup для MVP.

### 2.5 External services

- Hosting provider access.
- DB/Redis provider access.
- Domain/DNS access, если demo будет публичным.
- CI secrets, если будет GitHub Actions или аналог.

---

## 3. Общий env-файл

Создан файл `.env.example`. Реальные секреты не должны коммититься. Для запуска разработчик копирует:

```bash
cp .env.example .env
```

и заполняет значения из раздела 2.

---

## 4. Правила исполнения плана

- Каждый пункт выполнять отдельным минимальным изменением.
- Не переходить к следующему пункту, пока acceptance check текущего пункта не выполнен.
- Сначала использовать mock verifier, затем заменить на real verifier.
- Любой публичный audit trail не должен раскрывать hidden metrics, raw KYC/KYB attributes или private evidence.
- После каждого технического шага добавлять или обновлять только релевантные тесты.

---

## 5. План разработки из 100 этапов

### 001 — Зафиксировать MVP scope

- Цель: перевести текущие документы в короткий утвержденный MVP scope.
- Что/как/зачем: выделить in-scope и out-of-scope, чтобы команда не добавляла production-фичи раньше demo.
- Технический промпт: "Создай `docs/mvp-scope.md` на основе `dop_doc.md` и `Pact_MVP_Technical_Document.md`: опиши product goal, roles, in-scope, out-of-scope, main demo flow, attack demo flow. Не добавляй новые продуктовые требования."
- Проверка: review документа; все роли Sponsor, Project, Issuer, Attestor, Observer присутствуют.

### 002 — Подтвердить финальный стек

- Цель: получить явное approval от разработчика по стеку.
- Что/как/зачем: оформить выбранные технологии и альтернативы, чтобы не менять фундамент после старта.
- Технический промпт: "Создай `docs/stack-confirmation.md`: зафиксируй pnpm monorepo, Next.js, Fastify, PostgreSQL, Prisma, Redis/BullMQ, Soroban Rust, Circom/snarkjs Groth16 BN254, Stellar SDK. Добавь чеклист подтверждения и открытые вопросы."
- Проверка: разработчик отмечает подтверждение или правки по каждому слою.

### 003 — Запросить ключи и доступы

- Цель: собрать все переменные для `.env`.
- Что/как/зачем: без ключей нельзя завершить deploy, testnet invocation, prover и frontend wallet config.
- Технический промпт: "На основе `.env.example` создай `docs/developer-access-request.md`: сгруппируй все нужные ключи по Stellar, contracts, backend, ZK, deploy. Для каждого укажи owner, required/optional и где используется."
- Проверка: документ покрывает все пустые переменные из `.env.example`.

### 004 — Инициализировать monorepo

- Цель: создать базовую структуру проекта.
- Что/как/зачем: единая workspace-структура нужна для shared types, SDK, contracts, circuits и apps.
- Технический промпт: "Инициализируй pnpm monorepo со структурой `apps/web`, `apps/api`, `contracts`, `circuits`, `packages/shared`, `packages/sdk`, `packages/zk`, `scripts`, `docs`. Добавь root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`."
- Проверка: `pnpm install` и `pnpm -r typecheck` запускаются без отсутствующих workspace errors.

### 005 — Настроить общие TypeScript conventions

- Цель: обеспечить единые compiler options и import boundaries.
- Что/как/зачем: shared packages должны одинаково собираться в API, web и SDK.
- Технический промпт: "Добавь базовые TS configs для apps/packages. Настрой path aliases только для workspace packages. Не добавляй сложный build system сверх pnpm scripts."
- Проверка: `pnpm -r typecheck`.

### 006 — Добавить shared domain constants

- Цель: централизовать имена ролей, policy types, root types, statuses.
- Что/как/зачем: contracts/API/frontend должны использовать одинаковую терминологию.
- Технический промпт: "В `packages/shared` создай constants и enums для `PolicyType`, `PolicyStatus`, `RootType`, `RootStatus`, `ProgramStatus`, `TrancheStatus`, `ProofType`, `Role`. Экспортируй через package entry."
- Проверка: unit test на экспорт всех constants.

### 007 — Описать policy JSON schema

- Цель: зафиксировать формат eligibility и milestone policies.
- Что/как/зачем: policy hash должен строиться из стабильного JSON без неоднозначности.
- Технический промпт: "В `packages/shared` добавь Zod schemas для eligibility policy и milestone policy. Поддержи MVP rules: sanctions, expiry, accredited/non-US, active_users, pilot_partners, audit_passed."
- Проверка: Vitest positive/negative schema tests.

### 008 — Реализовать canonical policy hashing

- Цель: получить стабильный `policy_hash`.
- Что/как/зачем: одинаковый policy JSON должен давать одинаковый hash в API, circuits и contracts inputs.
- Технический промпт: "Добавь helper canonicalize+hash для policy JSON. Исключи зависимость от порядка ключей. Подготовь fixtures для двух MVP policies."
- Проверка: тест на одинаковый hash при разном порядке ключей.

### 009 — Описать circuit IO schemas

- Цель: зафиксировать public/private inputs для двух circuits.
- Что/как/зачем: API/prover/contracts должны согласованно форматировать proof payload.
- Технический промпт: "В `packages/shared` создай схемы `EligibilityPrivateInput`, `EligibilityPublicInput`, `MilestonePrivateInput`, `MilestonePublicInput`. Поля бери из исходных документов."
- Проверка: schema tests на required fields и типы.

### 010 — Описать API DTO schemas

- Цель: подготовить контракт между frontend и backend.
- Что/как/зачем: API endpoints должны валидировать body/params одинаково.
- Технический промпт: "Добавь Zod schemas для Program, Tranche, Policy, Root, Credential, MilestoneAttestation, ProofJob и request/response DTO для MVP endpoints."
- Проверка: unit tests на валидные и невалидные DTO.

### 011 — Поднять Fastify API skeleton

- Цель: создать минимальный backend runtime.
- Что/как/зачем: API будет координировать issuer, attestor, prover, indexer и contract calls.
- Технический промпт: "В `apps/api` создай Fastify server с `/health`, env loading, structured logger, CORS из env и централизованной обработкой ошибок."
- Проверка: targeted API test для `/health`.

### 012 — Настроить Prisma и PostgreSQL schema

- Цель: перенести core tables из документа в DB model.
- Что/как/зачем: audit trail, proof jobs и roots должны сохраняться off-chain.
- Технический промпт: "Добавь Prisma schema для `programs`, `tranches`, `policies`, `roots`, `credentials`, `milestone_attestations`, `proof_jobs`, `contract_events`."
- Проверка: `prisma validate`; миграция создается локально.

### 013 — Добавить DB client package

- Цель: дать API единый доступ к Prisma.
- Что/как/зачем: избежать разрозненных Prisma clients и упростить тесты.
- Технический промпт: "В `apps/api` добавь singleton Prisma client, graceful shutdown и test helper для transaction cleanup."
- Проверка: unit/integration test на подключение к тестовой DB или mock client.

### 014 — Настроить Redis и BullMQ

- Цель: подготовить очередь proof jobs.
- Что/как/зачем: генерация proof может быть долгой и не должна блокировать HTTP request.
- Технический промпт: "Добавь Redis connection и BullMQ queue `proof-jobs` с env config. Сделай health check queue connection."
- Проверка: test с mocked Redis или локальный smoke через targeted script.

### 015 — Создать API route registry

- Цель: объявить все MVP endpoints из документа.
- Что/как/зачем: маршрутная структура должна соответствовать спецификации до реализации логики.
- Технический промпт: "Создай route modules для programs, policies, issuer, attestor, proofs. Пока возвращай typed `501 not_implemented` там, где logic еще не готова."
- Проверка: endpoint snapshot test на список маршрутов.

### 016 — Создать Stellar config module

- Цель: централизовать network/passphrase/RPC settings.
- Что/как/зачем: contract calls и indexer должны использовать одну конфигурацию.
- Технический промпт: "В `packages/sdk` или `apps/api` добавь Stellar config loader из env: RPC URL, Horizon URL, network passphrase, secret keys. Запрещай старт API без required env в non-local mode."
- Проверка: unit tests env validation.

### 017 — Подготовить Soroban workspace

- Цель: создать Rust workspace для contracts.
- Что/как/зачем: контракты должны собираться независимо от frontend/backend.
- Технический промпт: "Создай Rust workspace в `contracts/` с crates для пяти MVP contracts. Добавь минимальные lib files, Cargo workspace config и build scripts."
- Проверка: `cargo check` для contracts workspace.

### 018 — Реализовать shared contract types

- Цель: унифицировать Rust structs/enums.
- Что/как/зачем: Policy/Root/Program/Tranche statuses должны совпадать между contracts.
- Технический промпт: "Добавь crate/module `contracts/shared` или common module с enums и BytesN aliases. Не дублируй одинаковые статусы в каждом контракте."
- Проверка: `cargo test` на serialization/usage basics.

### 019 — Реализовать PolicyRegistry skeleton

- Цель: создать контракт policy lifecycle.
- Что/как/зачем: policies управляют eligibility/milestone verification rules.
- Технический промпт: "Реализуй `PolicyRegistry` storage и методы `create_policy`, `activate_policy`, `pause_policy`, `deprecate_policy`, `get_policy`, `is_policy_active`."
- Проверка: contract tests create/activate/pause/deprecate/get.

### 020 — Добавить PolicyRegistry authorization

- Цель: защитить изменение policies.
- Что/как/зачем: только admin/issuer должен управлять policy records.
- Технический промпт: "Добавь admin address в init/config и require_auth для write methods. Read methods оставь публичными."
- Проверка: tests unauthorized admin fails.

### 021 — Реализовать RootRegistry skeleton

- Цель: создать хранение активных Merkle roots.
- Что/как/зачем: credentials и milestone evidence доказываются через roots.
- Технический промпт: "Реализуй `RootRegistry` с `activate_root`, `deactivate_root`, `is_root_active`, `get_current_root`. Поддержи root types Credential и MilestoneMetrics."
- Проверка: contract tests activate/deactivate/current root.

### 022 — Добавить root validity windows

- Цель: учитывать `valid_from` и `valid_until`.
- Что/как/зачем: expired/revoked credentials должны отклоняться через root lifecycle.
- Технический промпт: "Обнови `is_root_active`, чтобы проверять status и временное окно. Добавь ошибки для inactive/expired/not-yet-valid."
- Проверка: tests inactive root fails, expired root fails.

### 023 — Реализовать NullifierRegistry

- Цель: защитить proof flow от replay.
- Что/как/зачем: один proof/nullifier нельзя использовать повторно.
- Технический промпт: "Реализуй методы `is_used`, `assert_unused`, `mark_used`. Храни контекст `used_for` и ledger timestamp."
- Проверка: tests mark used, duplicate mark fails, unused passes.

### 024 — Реализовать VerifierAdapter mock mode

- Цель: разблокировать escrow flow до real ZK verifier.
- Что/как/зачем: бизнес-логика контрактов тестируется раньше, чем circuits готовы.
- Технический промпт: "Создай `VerifierAdapter` с mode `Mock`. Методы `verify_eligibility` и `verify_milestone` возвращают true только для валидного mock proof marker/public inputs fixture."
- Проверка: tests valid mock proof passes, invalid marker fails.

### 025 — Подготовить Groth16 verifier interface

- Цель: заранее стабилизировать API для real verifier.
- Что/как/зачем: later integration не должен менять `MilestoneEscrow` interface.
- Технический промпт: "Добавь enum `VerifierMode::Groth16Bn254` и placeholder verification path с typed error `RealVerifierNotConfigured`."
- Проверка: test mock mode works, real mode returns configured error.

### 026 — Реализовать MilestoneEscrow program model

- Цель: создать главный contract state для funding program.
- Что/как/зачем: escrow должен хранить sponsor/project/asset/amount/status.
- Технический промпт: "В `MilestoneEscrow` реализуй `create_program`, `get_program`, storage model `Program`, statuses Draft/Active/Paused/Cancelled/Completed."
- Проверка: tests create program succeeds, duplicate program fails.

### 027 — Реализовать tranche model

- Цель: добавить milestone-based payouts.
- Что/как/зачем: funding выпускается частями после proof.
- Технический промпт: "Добавь `add_tranche`, `get_tranche`, storage model `Tranche`. Проверяй amount > 0 и release_to address."
- Проверка: tests add tranche succeeds, duplicate milestone fails, invalid amount fails.

### 028 — Реализовать funding logic

- Цель: принять sponsor funding.
- Что/как/зачем: escrow должен иметь funds до release.
- Технический промпт: "Реализуй `fund_program` с transfer через Stellar asset/SAC interface или test abstraction. Обновляй `funded_amount`."
- Проверка: tests fund program succeeds, wrong amount fails.

### 029 — Реализовать program activation

- Цель: разрешить запуск только корректно профинансированных программ.
- Что/как/зачем: proof submission не должен работать для незапущенного escrow.
- Технический промпт: "Добавь `activate_program`: проверяй sponsor auth, total tranches, funded amount, eligibility policy id."
- Проверка: tests activate funded program, reject underfunded program.

### 030 — Реализовать eligibility proof submission

- Цель: отметить, что project прошел private eligibility.
- Что/как/зачем: milestone unlock должен быть доступен только eligible project.
- Технический промпт: "Добавь `submit_project_eligibility`: проверяй active program, active policy/root через registries, unused nullifier, verifier result и account binding."
- Проверка: tests valid eligibility passes, inactive policy/root fails, replay fails.

### 031 — Реализовать milestone proof submission

- Цель: принять proof достижения milestone.
- Что/как/зачем: release должен зависеть от verified hidden metrics threshold.
- Технический промпт: "Добавь `submit_milestone_proof`: проверяй active program, tranche locked, milestone policy/root, unused nullifier, verifier result, recipient, amount, program_id, milestone_id."
- Проверка: tests valid milestone proof releases or marks ready; wrong recipient/amount/program fails.

### 032 — Реализовать release_tranche

- Цель: выпустить средства project wallet.
- Что/как/зачем: контракт завершает escrow obligation после валидного proof.
- Технический промпт: "Реализуй `release_tranche`: mark nullifier used, set tranche released, transfer funds, emit event. Сделай операцию атомарной."
- Проверка: tests tranche released once, same tranche cannot release twice.

### 033 — Добавить pause/cancel flow

- Цель: дать sponsor/admin безопасную остановку demo program.
- Что/как/зачем: threat model требует paused program rejection.
- Технический промпт: "Добавь `pause_program` и `cancel_program` с authorization и status checks. Proof submissions для paused/cancelled должны падать."
- Проверка: tests paused program fails.

### 034 — Добавить contract events

- Цель: обеспечить public audit trail.
- Что/как/зачем: frontend/indexer должны показывать события без скрытых данных.
- Технический промпт: "Эмитируй events: ProgramCreated, ProgramFunded, PolicyActivated, RootActivated, EligibilityVerified, MilestoneVerified, TrancheReleased, ProgramPaused."
- Проверка: contract tests assert event names and public payload fields.

### 035 — Создать contract error catalog

- Цель: сделать ошибки читаемыми для API/frontend.
- Что/как/зачем: attack demo должен объяснять expected rejection.
- Технический промпт: "Добавь typed errors для unauthorized, inactive policy/root, used nullifier, wrong recipient, wrong amount, wrong program, paused program."
- Проверка: tests assert expected error codes.

### 036 — Собрать contracts deployment scripts

- Цель: развернуть MVP contracts на testnet.
- Что/как/зачем: contract IDs нужны API/frontend/prover.
- Технический промпт: "В `scripts/deploy` создай deploy script для five contracts, init admin/config и запись contract IDs в JSON artifact."
- Проверка: dry-run/localnet или testnet smoke deploy script.

### 037 — Создать contract SDK wrappers

- Цель: упростить вызовы контрактов из API и frontend.
- Что/как/зачем: raw Stellar transaction calls не должны расползаться по коду.
- Технический промпт: "В `packages/sdk` добавь clients для PolicyRegistry, RootRegistry, NullifierRegistry, VerifierAdapter, MilestoneEscrow с typed methods."
- Проверка: unit tests на request building/mocking.

### 038 — Реализовать Program APIs

- Цель: открыть backend endpoints для program lifecycle.
- Что/как/зачем: frontend sponsor dashboard должен создавать и управлять program.
- Технический промпт: "Реализуй `POST /api/programs`, `GET /api/programs/:programId`, `POST /fund`, `POST /activate`, `GET /audit`. Сохраняй DB state и вызывай SDK там, где нужно."
- Проверка: API integration tests for create/get/fund/activate/audit.

### 039 — Реализовать Policy APIs

- Цель: управлять policy records через backend.
- Что/как/зачем: issuer/admin должен создавать и активировать eligibility/milestone policies.
- Технический промпт: "Реализуй `POST /api/policies`, `GET`, `POST /activate`, `POST /pause`. Хешируй canonical policy JSON и синхронизируй с contract."
- Проверка: API tests create policy, activate, pause, invalid schema fails.

### 040 — Реализовать Issuer credential mock

- Цель: создать MVP KYB credential без реального provider.
- Что/как/зачем: demo показывает приватный eligibility proof без production KYC.
- Технический промпт: "Реализуй `POST /api/issuer/credentials/mock`: генерируй credential package с wallet, issuer_id, sanctions_passed, expiry, flags, salt, credential_secret. Сохраняй DB record."
- Проверка: API test credential created and private fields are not returned in public views.

### 041 — Реализовать credential Merkle builder

- Цель: собрать root из active credentials.
- Что/как/зачем: circuit доказывает membership credential leaf in root.
- Технический промпт: "Добавь Merkle tree builder на Poseidon-compatible abstraction. Для MVP допускается deterministic test implementation, но интерфейс должен поддерживать real Poseidon."
- Проверка: unit test stable root for fixture credentials.

### 042 — Реализовать issuer root build API

- Цель: создать credential root перед публикацией.
- Что/как/зачем: issuer должен контролировать root rotation.
- Технический промпт: "Реализуй `POST /api/issuer/roots/build`: выбирай active credentials, строй root, сохраняй root pending, возвращай root id/public root."
- Проверка: API test root contains created credential fixture.

### 043 — Реализовать issuer root publish API

- Цель: опубликовать credential root on-chain.
- Что/как/зачем: contracts должны проверять active credential root.
- Технический промпт: "Реализуй `POST /api/issuer/roots/publish`: вызывай RootRegistry activate_root, сохраняй tx_hash/status active."
- Проверка: API test mocked contract call and DB status update.

### 044 — Реализовать credential revocation by root rotation

- Цель: показать revoked credential attack demo.
- Что/как/зачем: MVP revocation делается исключением credential из нового root.
- Технический промпт: "Реализуй `POST /api/issuer/credentials/:credentialId/revoke`: помечай credential revoked, деактивируй старый root при publish нового root."
- Проверка: integration test old credential omitted from new root.

### 045 — Реализовать Attestor evidence mock

- Цель: создать hidden milestone evidence.
- Что/как/зачем: demo должен иметь private KPI values, которые не публикуются.
- Технический промпт: "Реализуй `POST /api/attestor/milestone-evidence/mock`: принимай program_id, milestone_id, active_users, pilot_partners, audit_passed, source_refs. Сохраняй private metrics encrypted or marked private."
- Проверка: API test hidden values not visible in audit response.

### 046 — Реализовать milestone validation

- Цель: проверить, что evidence соответствует MVP policy.
- Что/как/зачем: attestor не должен строить root для проваленного milestone.
- Технический промпт: "Добавь validator: active_users >= 500, pilot_partners >= 3, audit_passed == true. Возвращай structured rejection."
- Проверка: tests below-threshold metrics rejected.

### 047 — Реализовать milestone root builder

- Цель: собрать root для hidden metric commitments.
- Что/как/зачем: proof раскрывает только threshold satisfaction, а не raw values.
- Технический промпт: "Добавь commitment builder для milestone metrics и Merkle root. Вынеси salt generation. Сохраняй root pending."
- Проверка: unit test stable commitment/root from fixture.

### 048 — Реализовать milestone root publish API

- Цель: активировать milestone root on-chain.
- Что/как/зачем: escrow принимает milestone proof только против active root.
- Технический промпт: "Реализуй `POST /api/attestor/milestone-root/publish`: RootRegistry activate_root для RootType MilestoneMetrics, save tx_hash/status."
- Проверка: API test mocked contract publish.

### 049 — Реализовать milestone proof input API

- Цель: подготовить private/public input package для prover.
- Что/как/зачем: project должен генерировать proof без ручного сбора полей.
- Технический промпт: "Реализуй `GET /api/attestor/programs/:programId/milestones/:milestoneId`: возвращай proof input package только authorized project/admin."
- Проверка: API auth test; public audit endpoint не возвращает private package.

### 050 — Создать prover service skeleton

- Цель: отделить proof generation runtime.
- Что/как/зачем: circuits/proving artifacts тяжелые и должны исполняться воркером.
- Технический промпт: "Создай prover worker или service endpoint с `/health` и job processor для BullMQ proof jobs. Поддержи mode local/mock."
- Проверка: health test and queue job consumed in mock mode.

### 051 — Реализовать proof job model

- Цель: отслеживать lifecycle proof generation.
- Что/как/зачем: frontend должен видеть pending/success/error.
- Технический промпт: "Добавь statuses queued/running/succeeded/failed для `proof_jobs`, сохраняй request_json, public_inputs_json, proof_json, error."
- Проверка: unit test job status transitions.

### 052 — Реализовать eligibility proof generate API

- Цель: создать endpoint для proof eligibility.
- Что/как/зачем: project вызывает proof generation перед contract submission.
- Технический промпт: "Реализуй `POST /api/proofs/eligibility/generate`: валидируй input, создай BullMQ job, верни job id, после выполнения сохрани mock/real proof payload."
- Проверка: API test job created and status retrievable.

### 053 — Реализовать milestone proof generate API

- Цель: создать endpoint для milestone unlock proof.
- Что/как/зачем: project должен получить proof payload для release.
- Технический промпт: "Реализуй `POST /api/proofs/milestone/generate`: подтягивай milestone input package, формируй public inputs, ставь proof job."
- Проверка: API test valid milestone job and invalid evidence rejection.

### 054 — Реализовать proof status API

- Цель: дать frontend polling по proof jobs.
- Что/как/зачем: пользователь видит progress/error вместо зависшего UI.
- Технический промпт: "Реализуй `GET /api/proofs/:proofId`: возвращай status, public inputs, safe proof metadata, error code. Не отдавай private inputs."
- Проверка: API test private fields absent.

### 055 — Реализовать milestone proof submit API

- Цель: отправить proof в contract.
- Что/как/зачем: backend связывает generated proof и escrow release.
- Технический промпт: "Реализуй `POST /api/proofs/milestone/submit`: загружай proof job, вызывай MilestoneEscrow submit/release flow, сохраняй tx_hash."
- Проверка: integration test mocked contract release and DB update.

### 056 — Создать Circom eligibility circuit skeleton

- Цель: начать real ZK implementation.
- Что/как/зачем: circuit должен доказать credential membership и policy compliance.
- Технический промпт: "В `circuits/eligibility-proof` создай Circom circuit с inputs из схемы. Сначала реализуй структуры сигналов и compile pipeline без полной криптографии."
- Проверка: circuit compiles.

### 057 — Реализовать eligibility constraints

- Цель: проверить MVP policy in circuit.
- Что/как/зачем: proof должен отклонять sanctions false, expiry и неправильный policy.
- Технический промпт: "Добавь constraints для sanctions_passed, expires_at > current_epoch, accredited OR non_us, credential leaf/root membership placeholder/real Merkle."
- Проверка: circuit tests valid passes, sanctions false fails, expired fails.

### 058 — Реализовать eligibility nullifier

- Цель: связать proof с market/asset/action.
- Что/как/зачем: cross-market replay должен быть невозможен.
- Технический промпт: "Добавь nullifier derivation Poseidon(credential_secret, chain_id, contract_id, market_id, asset_id, action_type). Сверяй с public nullifier."
- Проверка: circuit test wrong context fails.

### 059 — Создать MilestoneUnlock circuit skeleton

- Цель: начать proof для hidden milestone metrics.
- Что/как/зачем: project доказывает достижение KPI без раскрытия значений.
- Технический промпт: "В `circuits/milestone-unlock-proof` создай Circom circuit с private metrics и public inputs из документа."
- Проверка: circuit compiles.

### 060 — Реализовать milestone threshold constraints

- Цель: проверить MVP M1.
- Что/как/зачем: active_users, pilot_partners и audit_passed должны соответствовать policy.
- Технический промпт: "Добавь constraints active_users >= 500, pilot_partners >= 3, audit_passed == 1 и membership in milestone_root."
- Проверка: tests below active_users, below pilot_partners, audit false fail.

### 061 — Реализовать milestone nullifier and binding

- Цель: защитить release от replay и wrong recipient.
- Что/как/зачем: proof должен быть привязан к program, milestone, recipient и amount.
- Технический промпт: "Добавь nullifier Poseidon(project_secret, program_id, milestone_id), recipient binding и tranche_amount binding."
- Проверка: tests wrong recipient, wrong amount, wrong milestone fail.

### 062 — Настроить snarkjs build pipeline

- Цель: собрать witness/proof artifacts.
- Что/как/зачем: prover service должен иметь repeatable commands.
- Технический промпт: "Добавь scripts для compile, witness generation, setup, prove, verify для обоих circuits. Пути должны совпадать с `.env.example`."
- Проверка: targeted script generates proof for fixture.

### 063 — Создать ZK fixtures

- Цель: иметь стабильные positive/negative inputs.
- Что/как/зачем: tests и demo должны использовать воспроизводимые данные.
- Технический промпт: "Добавь fixtures для valid eligibility, expired credential, sanctions false, valid milestone, below threshold, wrong recipient."
- Проверка: fixture validation through shared schemas.

### 064 — Интегрировать real proof generation в prover

- Цель: заменить mock proof payload на real Groth16 proof.
- Что/как/зачем: финальный testnet demo должен использовать реальную proof pipeline.
- Технический промпт: "Обнови prover worker: при `PROVER_MODE=local` запускай witness/prove для выбранного circuit, сохраняй proof_json и public_inputs_json."
- Проверка: integration test generates and verifies local proof for fixture.

### 065 — Форматировать public inputs для contracts

- Цель: обеспечить совместимость prover и VerifierAdapter.
- Что/как/зачем: неправильный порядок public inputs сломает on-chain verification.
- Технический промпт: "В `packages/zk` создай helpers для ordered public inputs eligibility/milestone. Добавь snapshot tests на порядок и формат."
- Проверка: snapshot tests for public input arrays.

### 066 — Интегрировать Groth16 verifier в VerifierAdapter

- Цель: включить real verification path.
- Что/как/зачем: contracts должны отклонять измененные proof/public inputs.
- Технический промпт: "Подключи BN254/Groth16 verification в `VerifierAdapter` согласно возможностям Soroban host functions. Сохрани mock mode."
- Проверка: contract tests real proof accepted, modified public input rejected.

### 067 — Обновить escrow на real verifier mode

- Цель: проверить полный on-chain path без mock.
- Что/как/зачем: final demo должен использовать real proofs.
- Технический промпт: "Переключи config `VerifierAdapter` на `Groth16Bn254` для integration environment. Убедись, что `MilestoneEscrow` interface не меняется."
- Проверка: integration test real proof releases tranche.

### 068 — Создать event indexer skeleton

- Цель: читать public contract events.
- Что/как/зачем: audit view не должен зависеть от ручных DB updates.
- Технический промпт: "Создай indexer worker, который poll Stellar RPC events, фильтрует Pact contract IDs и пишет `contract_events`."
- Проверка: unit test event payload mapping.

### 069 — Реализовать indexer resume cursor

- Цель: не терять события и не дублировать их.
- Что/как/зачем: RPC event retention ограничен, нужен controlled audit trail.
- Технический промпт: "Добавь storage для last processed ledger/cursor. При restart продолжай с последнего сохраненного ledger."
- Проверка: test duplicate polling does not duplicate DB records.

### 070 — Собрать public audit projection

- Цель: подготовить данные для Public Audit View.
- Что/как/зачем: public observer видит только события и статусы, без hidden metrics.
- Технический промпт: "Создай service `getProgramAudit(programId)`: объединяй DB program/tranches/policies/roots/events и возвращай public timeline."
- Проверка: API test audit response excludes private fields.

### 071 — Создать Next.js app skeleton

- Цель: поднять frontend shell.
- Что/как/зачем: demo должен выполняться без CLI.
- Технический промпт: "В `apps/web` создай Next.js app с shared env config, base layout, navigation между Landing, Sponsor, Project, Issuer, Attestor, Audit."
- Проверка: `pnpm --filter web typecheck`.

### 072 — Реализовать API client для web

- Цель: типобезопасно вызывать backend.
- Что/как/зачем: UI не должен вручную собирать endpoint payloads.
- Технический промпт: "Добавь web API client на основе DTO schemas или SDK. Обрабатывай loading/error states единообразно."
- Проверка: unit test client builds correct requests.

### 073 — Реализовать wallet connection UI

- Цель: дать пользователю подключить Stellar wallet/account.
- Что/как/зачем: sponsor/project actions требуют account binding.
- Технический промпт: "Добавь wallet connect component, отображение public key, disconnect, network mismatch warning. Не храни secret keys во frontend."
- Проверка: component test или Playwright smoke mock.

### 074 — Реализовать Public Landing

- Цель: объяснить demo за минуту.
- Что/как/зачем: новая аудитория должна понять private proof + public accountability.
- Технический промпт: "Создай landing screen с тезисом `Private proof. Public accountability.`, funding flow diagram, demo CTA и ссылкой на audit view."
- Проверка: Playwright screenshot/smoke for landing route.

### 075 — Реализовать Sponsor Dashboard create program

- Цель: дать sponsor создать funding program.
- Что/как/зачем: demo начинается с program/tranches setup.
- Технический промпт: "Добавь форму create program: project wallet, asset, total amount, eligibility policy, tranches. После submit вызывай Program API."
- Проверка: Playwright form submit with mocked API.

### 076 — Реализовать Sponsor funding flow

- Цель: профинансировать escrow.
- Что/как/зачем: без funding milestone release невозможен.
- Технический промпт: "Добавь UI fund program, transaction status, funded amount progress, activate program action."
- Проверка: Playwright mocked fund/activate flow.

### 077 — Реализовать Sponsor milestone status

- Цель: показать состояние tranches и proofs.
- Что/как/зачем: sponsor должен видеть, когда funds released.
- Технический промпт: "Добавь таблицу tranches со status locked/released, proof events, tx_hash links, rejection states."
- Проверка: UI test renders statuses from fixture.

### 078 — Реализовать Project Dashboard eligibility

- Цель: дать project пройти mock KYB и eligibility proof.
- Что/как/зачем: project должен показать право участвовать без раскрытия credential.
- Технический промпт: "Добавь UI: pass mock KYB, generate eligibility proof, submit eligibility, show status and errors."
- Проверка: Playwright mocked eligibility success and failure.

### 079 — Реализовать Project Dashboard milestone flow

- Цель: дать project запросить milestone proof и payout.
- Что/как/зачем: это основной value demo.
- Технический промпт: "Добавь UI: fetch milestone input, generate proof, submit proof, show payout tx/status. Hidden metrics не показывай публично."
- Проверка: Playwright mocked milestone proof and payout.

### 080 — Реализовать Issuer Console credential flow

- Цель: управлять mock credentials.
- Что/как/зачем: issuer показывает credential issuance/root publishing/revocation.
- Технический промпт: "Добавь UI create credential, build root, publish root, revoke credential, rotate root. Покажи only safe public root data."
- Проверка: Playwright mocked issuer flow.

### 081 — Реализовать Attestor Console evidence flow

- Цель: управлять hidden milestone evidence.
- Что/как/зачем: attestor подтверждает hidden metrics и публикует root.
- Технический промпт: "Добавь UI create evidence, validate thresholds, build milestone root, publish root, create proof input package."
- Проверка: Playwright mocked attestor flow.

### 082 — Реализовать Public Audit View

- Цель: показать публичную трассу событий.
- Что/как/зачем: observer должен видеть accountability без private data.
- Технический промпт: "Добавь audit timeline: Program created, Escrow funded, Policy activated, Root activated, Eligibility verified, Milestone verified, Tranche released."
- Проверка: UI test confirms no raw metrics/KYC fields in DOM.

### 083 — Реализовать attack simulation UI

- Цель: показать security guarantees MVP.
- Что/как/зачем: demo должен явно отклонять replay/revoked/cross-market/wrong recipient.
- Технический промпт: "Добавь attack panel с кнопками replay milestone proof, revoked credential, cross-market replay, wrong recipient. Показывай expected rejection code."
- Проверка: Playwright mocked attacks return expected errors.

### 084 — Добавить frontend transaction status model

- Цель: сделать blockchain actions понятными.
- Что/как/зачем: пользователь должен видеть pending/simulating/submitted/confirmed/failed.
- Технический промпт: "Создай shared UI state для transaction lifecycle, reusable status component и error mapping from contract/API errors."
- Проверка: component tests for status rendering.

### 085 — Добавить frontend privacy guards

- Цель: предотвратить случайное раскрытие private data.
- Что/как/зачем: UI не должен показывать hidden evidence публично.
- Технический промпт: "Добавь denylist/typed separation для private fields в public components. Audit route принимает только PublicAudit DTO."
- Проверка: test raw metrics, credential_secret, project_secret not rendered.

### 086 — Создать demo seed script

- Цель: получить воспроизводимый demo state.
- Что/как/зачем: reviewer должен запустить demo без ручной подготовки.
- Технический промпт: "В `scripts/seed` создай seed demo program: sponsor, project, policies, credential, milestone evidence, roots, proof fixtures."
- Проверка: seed script runs idempotently in local env.

### 087 — Создать end-to-end happy path script

- Цель: проверить demo flow без UI.
- Что/как/зачем: CLI smoke быстрее локализует backend/contract/prover ошибки.
- Технический промпт: "Создай `scripts/demo/run-happy-path.ts`: create program, fund, publish roots, generate proofs, submit milestone, verify release."
- Проверка: script exits 0 and prints final tx/status summary.

### 088 — Создать attack demo script

- Цель: проверить негативные сценарии.
- Что/как/зачем: threat model должен быть доказан runnable checks.
- Технический промпт: "Создай `scripts/demo/run-attack-cases.ts` для replay, revoked credential, cross-program replay, wrong recipient, inactive root."
- Проверка: script exits 0 only when all attacks are rejected.

### 089 — Добавить API integration tests

- Цель: покрыть основную backend логику.
- Что/как/зачем: regressions в endpoints ломают frontend demo.
- Технический промпт: "Добавь integration tests для issuer root flow, attestor root flow, proof job flow, program audit flow. Используй test DB или mocked repositories."
- Проверка: `pnpm --filter api test`.

### 090 — Добавить contract integration tests

- Цель: покрыть escrow/replay/release.
- Что/как/зачем: on-chain safety критична для MVP.
- Технический промпт: "Добавь tests: create/fund/activate, eligibility verified, milestone release, same nullifier fails, same tranche twice fails, inactive policy/root fails, wrong amount/recipient/program fails."
- Проверка: `cargo test` in contracts workspace.

### 091 — Добавить circuit test suite

- Цель: покрыть ZK constraints.
- Что/как/зачем: proof должен принимать только корректные private inputs.
- Технический промпт: "Добавь tests/scripts для eligibility and milestone fixtures: valid passes, expired fails, sanctions false fails, wrong Merkle path fails, below thresholds fail, wrong nullifier context fails."
- Проверка: targeted circuit test command.

### 092 — Добавить Playwright demo tests

- Цель: проверить browser demo.
- Что/как/зачем: investor/demo reviewer оценивает продукт через UI.
- Технический промпт: "Добавь Playwright tests для landing, sponsor create/fund, issuer root, attestor root, project proof, public audit, attack panel."
- Проверка: `pnpm --filter web test:e2e` with mocked or seeded backend.

### 093 — Добавить security checklist

- Цель: зафиксировать MVP threat mitigations.
- Что/как/зачем: security claims должны быть проверяемыми.
- Технический промпт: "Создай `docs/threat-model.md`: таблица threats из исходного документа, mitigation, test/script proving mitigation, known limitation."
- Проверка: review checklist maps each threat to test or accepted limitation.

### 094 — Добавить privacy disclosure

- Цель: честно описать, что скрыто и что раскрывается.
- Что/как/зачем: threshold proof раскрывает факт прохождения порога.
- Технический промпт: "Создай `docs/privacy-disclosure.md`: raw documents hidden, exact KPI hidden, KYC attributes hidden, threshold satisfaction public, public events visible."
- Проверка: document matches UI audit behavior.

### 095 — Подготовить testnet deployment runbook

- Цель: сделать deploy повторяемым.
- Что/как/зачем: contract/API/web deploy должен выполняться по шагам без догадок.
- Технический промпт: "Создай `docs/testnet-deployment-runbook.md`: env prerequisites, funding accounts, deploy contracts, update env, migrate DB, start API/prover/indexer, deploy web, seed demo."
- Проверка: dry run review; все env keys referenced from `.env.example`.

### 096 — Выполнить testnet contract deploy

- Цель: получить реальные contract IDs.
- Что/как/зачем: frontend/backend должны работать с testnet state.
- Технический промпт: "Запусти deploy script на Stellar testnet, сохрани contract IDs в deploy artifact и обнови локальный `.env` без коммита секретов."
- Проверка: smoke call `get_policy`/`get_program` or equivalent read succeeds.

### 097 — Развернуть backend/prover/indexer

- Цель: поднять off-chain services для demo.
- Что/как/зачем: UI должен обращаться к публичному API, prover и indexer.
- Технический промпт: "Разверни API, prover worker, indexer с production-like env. Прогони migrations, health checks, queue check, DB connectivity check."
- Проверка: `/health`, proof queue health, indexer cursor health.

### 098 — Развернуть frontend demo

- Цель: дать публичный demo URL.
- Что/как/зачем: stakeholder может пройти flow без локального окружения.
- Технический промпт: "Разверни `apps/web`, укажи public API URL, Stellar network, contract IDs. Проверь landing/dashboard/audit routes."
- Проверка: Playwright smoke against deployed URL.

### 099 — Провести финальную приемку MVP

- Цель: подтвердить end-to-end готовность.
- Что/как/зачем: demo считается готовым только если happy path и attacks проходят.
- Технический промпт: "Прогони финальный checklist: happy path, replay rejected, revoked rejected, cross-program rejected, wrong recipient rejected, public audit hides private data, contract events indexed."
- Проверка: сохранить результат в `docs/final-acceptance-checklist.md`.

### 100 — Создать технический отчет созданного приложения

- Цель: подготовить итоговый технический отчет по реализованному MVP.
- Что/как/зачем: отчет нужен для передачи, аудита и дальнейшего production planning.
- Технический промпт: "Создай `docs/final-technical-report.md`: опиши реализованную архитектуру, стек, deployed URLs, contract IDs, env keys без секретов, DB model, API endpoints, circuits/artifacts, тесты и результаты, known limitations, security/privacy notes, список следующих production hardening задач."
- Проверка: отчет содержит ссылки на deploy artifacts, acceptance checklist, test outputs и не содержит real secrets.

