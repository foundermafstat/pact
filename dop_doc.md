Готово. Я подготовила полноценный Markdown-документ для разработки MVP:
[Скачать технический документ Pact](sandbox:/mnt/data/Pact_MVP_Technical_Document.md)

Ниже — рабочая структурированная версия документа, чтобы сразу можно было передавать в Codex / команду / использовать как основу для README.

---

# Pact — технический документ разработки MVP

## 1. Главная идея продукта

**Pact** — это приватный compliance и milestone escrow слой для токенизированных инвестиций, грантов и RWA-программ.

Продукт позволяет спонсору, инвестору, фонду, DAO, акселератору или грантодателю заблокировать средства в on-chain escrow, а команде получить следующий транш только после ZK-доказательства:

1. что участник или команда имеет право участвовать в программе;
2. что milestone действительно достигнут;
3. что proof нельзя переиспользовать в другом рынке, программе, активе или milestone;
4. что при этом публично не раскрываются документы, KYC/KYB-атрибуты, точные KPI, клиенты, выручка или внутренние отчеты.

Главная формула Pact:

> **Private proof of eligibility + private proof of performance + automatic capital release.**

То есть Pact не просто “гейтит transfer”. Pact становится **договором между капиталом и исполнением**, где публично видно только:

```text
policy passed
proof verified
milestone reached
tranche released
```

Но скрыто:

```text
KYC/KYB documents
jurisdiction attributes
exact revenue
client names
audit documents
raw metrics
internal reports
```

---

## 2. Ключевое решение по MVP

Для MVP не надо сразу строить полноценный regulated RWA marketplace. Это будет слишком широко.

Правильный MVP:

# **Pact MVP: Private Milestone Escrow**

Основной demo-flow:

```text
Sponsor creates funding program
Sponsor locks testnet asset into escrow
Project proves eligibility
Project submits private milestone proof
Contract verifies proof
Tranche is released automatically
Replay / revocation / expired credential attacks are rejected
```

А RWA `mint / transfer / redeem gate` лучше оставить как **второй модуль**, который демонстрирует расширение Pact на regulated assets.

Почему так сильнее: milestone escrow дает понятный вау-эффект — деньги реально заблокированы, proof реально проверяется, payout реально происходит.

---

## 3. Технические допущения по Stellar/Soroban

Pact хорошо ложится на Stellar, потому что Stellar официально поддерживает Soroban smart contracts, Stellar Asset Contract для взаимодействия со Stellar issued assets, а также ZK-oriented primitives. В актуальной документации Stellar описаны BN254 host functions и Poseidon/Poseidon2 как инструменты для ZK-приложений, commitments, Merkle trees и nullifiers. ([Stellar Docs][1])

Для MVP можно использовать testnet XLM или demo issued asset через Stellar Asset Contract. SAC позволяет контрактам взаимодействовать со Stellar assets напрямую: asset и его SAC представляют один и тот же актив, без bridge-токена или промежуточного wrapped-token слоя. ([Stellar Docs][2])

Для regulated asset сценария важно помнить: если asset можно свободно перевести вне Pact-контракта, gate можно обойти. Поэтому в production нужно либо держать актив в contract-controlled flow, либо использовать issuer-level controls. Stellar поддерживает `AUTH_REQUIRED_FLAG`, когда issuer должен одобрить trustline перед тем, как аккаунт сможет держать asset, и `AUTH_REVOCABLE_FLAG`, позволяющий issuer отозвать authorization и заморозить asset на trustline. ([Stellar Docs][3])

Для разработки контрактов на Stellar актуальный путь — Rust smart contracts + Stellar CLI; документация указывает Rust toolchain `v1.84.0+`, `wasm32v1-none` target и Stellar CLI для локального/testnet/mainnet взаимодействия. ([Stellar Docs][4]) Frontend/backend сможет вызывать контракты через Stellar SDK: в официальных гайдах описан flow создания, симуляции, сборки и отправки contract invocation transaction. ([Stellar Docs][5])

---

# 4. Архитектура MVP

## 4.1 Основные слои

```text
Pact
├── On-chain contracts
│   ├── PolicyRegistry
│   ├── RootRegistry
│   ├── NullifierRegistry
│   ├── VerifierAdapter
│   ├── MilestoneEscrow
│   └── GatedAssetController, optional
│
├── ZK layer
│   ├── EligibilityProof circuit
│   ├── MilestoneUnlockProof circuit
│   ├── witness generation
│   ├── proof generation
│   └── verification key artifacts
│
├── Off-chain services
│   ├── Mock KYC/KYB issuer
│   ├── Mock milestone attestor
│   ├── Merkle root builder
│   ├── proof generation API
│   └── event indexer
│
└── Frontend
    ├── Sponsor dashboard
    ├── Project dashboard
    ├── Issuer console
    ├── Attestor console
    └── Public audit view
```

---

# 5. Главные роли продукта

## Sponsor

Грантодатель, инвестор, фонд, DAO, accelerator или RWA-программа.

Действия:

```text
create funding program
define milestone policies
lock funds into escrow
monitor proof events
see tranche release status
```

## Project / Team

Команда, которая получает funding.

Действия:

```text
pass mock KYB
generate eligibility proof
submit private milestone evidence
generate milestone proof
claim tranche
```

## KYC/KYB Issuer

Off-chain доверенный issuer, который подтверждает eligibility.

Действия:

```text
issue credential commitment
build credential Merkle root
publish active root
rotate root
revoke credential by removing it from active root
```

## Milestone Attestor

Off-chain доверенный attestor, который проверяет скрытые milestone-метрики.

Действия:

```text
validate hidden project data
create metric commitments
build milestone root
publish milestone root
prepare proof inputs
```

## Public Observer

Публичный наблюдатель, донор, аудитор или инвестор.

Видит:

```text
program created
escrow funded
policy activated
proof verified
tranche released
```

Не видит:

```text
exact KPI values
customer list
documents
KYC/KYB attributes
raw evidence
```

---

# 6. On-chain contracts

## 6.1 `PolicyRegistry`

Хранит policy versions.

### Responsibilities

```text
create policy
activate policy
pause policy
deprecate policy
bind policy to verifier
bind policy to program / market / action type
```

### Storage model

```rust
Policy {
    policy_id: BytesN<32>,
    policy_hash: BytesN<32>,
    policy_type: PolicyType, // Eligibility | Milestone | AssetAction
    status: PolicyStatus,   // Active | Paused | Deprecated
    issuer: Address,
    verifier: Address,
    valid_from: u64,
    valid_until: u64,
    created_at: u64,
}
```

### Main methods

```rust
create_policy(policy_id, policy_hash, policy_type, verifier, valid_from, valid_until)
activate_policy(policy_id)
pause_policy(policy_id)
deprecate_policy(policy_id)
get_policy(policy_id) -> Policy
is_policy_active(policy_id, policy_hash, now) -> bool
```

---

## 6.2 `RootRegistry`

Хранит активные Merkle roots.

### Root types

```text
Credential root
Milestone metrics root
Revocation root, later
```

### Storage model

```rust
RootRecord {
    root: BytesN<32>,
    policy_id: BytesN<32>,
    root_type: RootType,
    epoch: u64,
    status: RootStatus,
    valid_from: u64,
    valid_until: u64,
    issuer: Address,
}
```

### Main methods

```rust
activate_root(policy_id, root, root_type, epoch, valid_from, valid_until)
deactivate_root(policy_id, root)
is_root_active(policy_id, root, root_type, now) -> bool
get_current_root(policy_id, root_type) -> RootRecord
```

Для MVP revocation делается просто: issuer публикует новый active root без отозванного credential. Старый root деактивируется.

---

## 6.3 `NullifierRegistry`

Защищает от replay.

### Responsibilities

```text
check if nullifier was used
mark nullifier as used
prevent double milestone claim
prevent proof reuse across program / asset / market / action
```

### Main methods

```rust
is_used(nullifier) -> bool
mark_used(nullifier, used_for)
assert_unused(nullifier)
```

---

## 6.4 `VerifierAdapter`

Абстракция над proof verification.

Для разработки лучше сделать два режима:

```rust
VerifierMode::Mock
VerifierMode::Groth16Bn254
```

Сначала весь escrow flow можно собрать через `MockVerifier`, а потом заменить на реальный Groth16 verification.

### Main methods

```rust
verify_eligibility(proof, public_inputs) -> bool
verify_milestone(proof, public_inputs) -> bool
```

---

## 6.5 `MilestoneEscrow`

Главный контракт MVP.

### Responsibilities

```text
create funding program
accept sponsor funding
store tranches
verify project eligibility proof
verify milestone proof
release tranche
prevent double release
emit public audit events
```

### Program model

```rust
Program {
    program_id: BytesN<32>,
    sponsor: Address,
    project: Address,
    asset: Address,
    total_amount: i128,
    funded_amount: i128,
    status: ProgramStatus,
    eligibility_policy_id: BytesN<32>,
    created_at: u64,
}
```

### Tranche model

```rust
Tranche {
    program_id: BytesN<32>,
    milestone_id: BytesN<32>,
    milestone_policy_id: BytesN<32>,
    amount: i128,
    status: TrancheStatus,
    release_to: Address,
    released_at: Option<u64>,
}
```

### Main methods

```rust
create_program(program_id, project, asset, total_amount, eligibility_policy_id)
add_tranche(program_id, milestone_id, milestone_policy_id, amount, release_to)
fund_program(program_id, amount)
activate_program(program_id)
submit_project_eligibility(program_id, proof, public_inputs)
submit_milestone_proof(program_id, milestone_id, proof, public_inputs)
release_tranche(program_id, milestone_id)
pause_program(program_id)
cancel_program(program_id)
```

### Release checks

Перед выплатой контракт должен проверить:

```text
program is active
tranche exists
tranche is locked
milestone policy is active
milestone root is active
nullifier is unused
proof is valid
recipient equals tranche.release_to
tranche_amount equals configured amount
proof is bound to program_id
proof is bound to milestone_id
```

После успешной проверки:

```text
mark nullifier used
mark tranche released
transfer funds to project wallet
emit TrancheReleased
```

---

# 7. ZK circuits

## 7.1 Circuit 1 — `EligibilityProof`

Доказывает, что wallet имеет активный credential и соответствует policy.

### Private inputs

```text
credential_secret
credential_salt
subject_id
jurisdiction_code
is_accredited
is_non_us
sanctions_passed
expires_at
issuer_id
merkle_path_elements
merkle_path_indices
```

### Public inputs

```text
policy_hash
credential_root
nullifier
market_id
asset_id
action_type
account_binding
current_epoch
```

### Constraints

```text
credential_leaf = Poseidon(subject_commitment, attributes, expires_at, issuer_id, salt)

credential_leaf is included in credential_root

sanctions_passed == true

expires_at > current_epoch

policy passes:
  is_accredited == true OR is_non_us == true

nullifier = Poseidon(
  credential_secret,
  chain_id,
  contract_id,
  market_id,
  asset_id,
  action_type
)
```

### MVP policy

```text
Policy: accredited_or_non_us

Rules:
- sanctions_passed == true
- expires_at > current_epoch
- is_accredited == true OR is_non_us == true
```

---

## 7.2 Circuit 2 — `MilestoneUnlockProof`

Доказывает, что скрытые project metrics достигают milestone threshold.

### Private inputs

```text
project_secret
active_users
pilot_partners
audit_passed
metric_salts
attestation_merkle_path
```

### Public inputs

```text
policy_hash
milestone_root
nullifier
program_id
milestone_id
recipient
tranche_amount
current_epoch
```

### MVP milestone

```text
M1:
- active_users >= 500
- pilot_partners >= 3
- audit_passed == true
```

### Constraints

```text
active_users >= 500
pilot_partners >= 3
audit_passed == 1

metric commitments are included in milestone_root

nullifier = Poseidon(project_secret, program_id, milestone_id)

recipient is bound to proof

tranche_amount is bound to proof
```

---

# 8. Off-chain services

## 8.1 Backend API

Рекомендованный стек:

```text
Node.js + TypeScript
Express / Fastify / NestJS
PostgreSQL
Redis
BullMQ or similar proof queue
Prisma / Drizzle
Stellar SDK
```

## 8.2 Mock KYC/KYB Issuer

Для MVP это не настоящий KYC provider, а mock issuer.

Функции:

```text
create mock credential
build Merkle tree
publish root on-chain
rotate root
revoke credential
return private credential package to user/prover
```

Credential example:

```json
{
  "credential_id": "cred_001",
  "wallet": "G_PROJECT",
  "issuer_id": "PACT_KYB_MOCK_ISSUER",
  "is_accredited": true,
  "is_non_us": false,
  "jurisdiction_group": "allowed",
  "sanctions_passed": true,
  "expires_at": 1785600000,
  "salt": "0x...",
  "credential_secret": "0x..."
}
```

On-chain попадает только Merkle root, а не весь credential.

---

## 8.3 Mock Milestone Attestor

Функции:

```text
accept hidden milestone evidence
validate mock data
build metric commitments
publish milestone root
create proof input package
```

Hidden evidence example:

```json
{
  "program_id": "PACT_GRANT_001",
  "milestone_id": "M1",
  "metrics": {
    "active_users": 735,
    "pilot_partners": 4,
    "audit_passed": 1
  },
  "source_refs": [
    "mock_github_release_001",
    "mock_auditor_letter_001",
    "mock_analytics_snapshot_001"
  ]
}
```

Public output:

```json
{
  "program_id": "PACT_GRANT_001",
  "milestone_id": "M1",
  "milestone_root": "0x...",
  "policy_hash": "0x..."
}
```

---

## 8.4 Prover Service

Для MVP proof можно генерировать server-side. В production лучше переносить witness generation в браузер или локальный клиент.

Endpoints:

```text
POST /api/proofs/eligibility/generate
POST /api/proofs/milestone/generate
GET  /api/proofs/jobs/:jobId
POST /api/proofs/milestone/submit
```

---

# 9. Frontend screens

## Sponsor Dashboard

```text
Create program
Add tranches
Fund escrow
See milestone status
See proof verification status
See released payouts
```

## Project Dashboard

```text
Pass mock KYB
Generate eligibility proof
Submit hidden milestone evidence
Generate milestone proof
Submit proof on-chain
Claim tranche
```

## Issuer Console

```text
Create credential
Build root
Publish root
Revoke credential
Rotate root
Run revoked credential attack demo
```

## Attestor Console

```text
Create mock milestone evidence
Show hidden metrics locally
Build metric root
Publish milestone root
Generate milestone proof package
```

## Public Audit View

Публично показывает только:

```text
Program created
Escrow funded
Policy activated
Credential root activated
Project eligibility verified
Milestone root activated
Milestone proof verified
Tranche released
```

Не показывает:

```text
active_users = 735
pilot_partners = 4
audit document
KYC/KYB attributes
```

Для индексации событий можно использовать contract events. В Stellar docs описан `getEvents` через RPC, но также указано, что retention window для таких событий ограничен, поэтому для долгого audit trail нужен собственный indexer/database. ([Stellar Docs][6])

---

# 10. Этапы разработки MVP

## Stage 0 — Protocol freeze

Deliverables:

```text
final MVP scope
policy JSON examples
public/private input schemas
contract interfaces
demo asset decision
repository structure
```

Acceptance criteria:

```text
product summary exists
policy schema exists
circuit IO schema exists
contract method names frozen
demo flow frozen
```

---

## Stage 1 — Repository and local setup

Repository structure:

```text
pact/
  apps/
    web/
    api/
  contracts/
    policy-registry/
    root-registry/
    nullifier-registry/
    verifier-adapter/
    milestone-escrow/
    gated-asset-controller/
  circuits/
    eligibility-proof/
    milestone-unlock-proof/
  packages/
    sdk/
    shared/
    zk/
  scripts/
    deploy/
    seed/
    demo/
  docs/
    architecture.md
    demo-script.md
    threat-model.md
    policy-format.md
```

Acceptance criteria:

```text
pnpm install works
pnpm typecheck passes
contracts compile
local test command works
demo seed script exists
```

---

## Stage 2 — On-chain skeleton with mock verifier

Build:

```text
PolicyRegistry
RootRegistry
NullifierRegistry
MilestoneEscrow
VerifierAdapter in mock mode
contract tests
```

Acceptance criteria:

```text
sponsor can create program
sponsor can fund program
policy can be activated
root can be activated/deactivated
mock proof can release tranche
same nullifier fails
same tranche cannot release twice
inactive policy fails
inactive root fails
```

---

## Stage 3 — Off-chain issuer and attestor mocks

Build:

```text
mock KYB credential generator
credential Merkle tree builder
root publishing script
mock milestone evidence generator
milestone root builder
API endpoints for root publishing
```

Acceptance criteria:

```text
issuer creates credential package
issuer publishes root
issuer revokes credential by rotating root
attestor creates milestone package
attestor publishes milestone root
```

---

## Stage 4 — ZK circuits and proof generation

Build:

```text
EligibilityProof circuit
MilestoneUnlockProof circuit
witness generation
proof generation
verification key artifacts
local proof tests
```

Acceptance criteria:

```text
valid eligibility proof passes
expired credential fails
sanctions false fails
wrong Merkle path fails
valid milestone proof passes
active_users below threshold fails
pilot_partners below threshold fails
audit_passed false fails
```

---

## Stage 5 — Real verifier integration

Build:

```text
Groth16 BN254 verifier adapter
formatted public inputs
contract-level proof verification
testnet proof submission
```

Acceptance criteria:

```text
contract accepts real proof
contract rejects modified public inputs
contract rejects wrong milestone
contract rejects wrong recipient
testnet invocation succeeds
```

---

## Stage 6 — Frontend dashboard

Build:

```text
Sponsor dashboard
Project dashboard
Issuer console
Attestor console
Public audit view
Wallet integration
Transaction status UI
Proof generation UI
Attack simulation UI
```

Acceptance criteria:

```text
full demo can run without CLI
events appear in audit view
hidden values are not shown publicly
attack buttons show expected rejection
```

---

## Stage 7 — Testnet demo package

Build:

```text
deployed contract IDs
deployed frontend
deployed backend
seeded demo program
README
demo script
threat model
disclosure section
```

Acceptance criteria:

```text
testnet escrow payout works
public audit trail works
revocation demo works
replay demo works
repo validation commands pass
```

---

# 11. Demo scenario

## Program

```json
{
  "program_id": "PACT_GRANT_001",
  "name": "Private Growth Grant",
  "asset": "PACTUSD",
  "total_amount": "10000",
  "sponsor": "G_SPONSOR",
  "project": "G_PROJECT",
  "eligibility_policy": "PROJECT_KYB_ALLOWED_V1",
  "tranches": [
    {
      "milestone_id": "M1",
      "amount": "3000",
      "policy": "MILESTONE_USERS_AUDIT_V1"
    },
    {
      "milestone_id": "M2",
      "amount": "7000",
      "policy": "MILESTONE_REVENUE_RETENTION_V1"
    }
  ]
}
```

## Hidden milestone evidence

```json
{
  "active_users": 735,
  "pilot_partners": 4,
  "audit_passed": true,
  "audit_document": "encrypted://mock_audit_report_001"
}
```

## Public on-chain result

```json
{
  "program_id": "PACT_GRANT_001",
  "milestone_id": "M1",
  "policy_hash": "0x...",
  "proof_verified": true,
  "tranche_released": "3000 PACTUSD",
  "recipient": "G_PROJECT"
}
```

---

# 12. Attack demos

## Attack 1 — replay milestone proof

```text
Project submits same proof twice.
Expected result: rejected because nullifier already used.
```

## Attack 2 — revoked credential

```text
Issuer removes credential from active root.
Project tries to use old credential.
Expected result: rejected because root is inactive / credential no longer active.
```

## Attack 3 — cross-market replay

```text
Investor uses proof from Market A in Market B.
Expected result: rejected because market_id is bound into nullifier/public inputs.
```

## Attack 4 — wrong recipient

```text
Project tries to redirect payout to another wallet.
Expected result: rejected because recipient is bound to proof and tranche config.
```

---

# 13. MVP success metrics

## Compliance metrics

```text
approval rate
rejection rate
root update speed
revocation latency
expired credential rejection
cross-market replay rejection
```

## Milestone metrics

```text
proof generation success rate
proof verification success rate
tranche release latency
manual review replaced by proof
number of hidden KPI fields
number of public proof fields
```

## Privacy metrics

```text
raw documents revealed: 0
exact KPI values revealed: 0
KYC/KYB attributes revealed: 0
public proof events emitted: yes
selective disclosure architecture described: yes
```

---

# 14. Главный development priority

Сначала строить именно это:

```text
1. MilestoneEscrow
2. PolicyRegistry
3. RootRegistry
4. NullifierRegistry
5. Mock verifier
6. Mock issuer / attestor
7. One real milestone proof
8. Escrow payout on testnet
9. Public audit dashboard
```

Потом добавлять:

```text
1. Real eligibility proof
2. Real Groth16 verifier path
3. Gated mint / transfer / redeem demo
4. Revocation UI
5. Attack simulation UI
```

После MVP:

```text
1. Real KYC/KYB integrations
2. Real attestor integrations
3. Browser-side proving
4. zkTLS / source proofs
5. selective disclosure
6. dispute window
7. admin multisig / timelock
8. contract and circuit audit
```

---

# 15. Финальная формулировка Pact

> **Pact is a privacy-preserving milestone escrow for tokenized capital. It allows sponsors and investors to release funding only when teams prove compliance and milestone completion in zero-knowledge, without exposing sensitive documents, business metrics, or identity attributes.**

По-русски:

> **Pact — это приватный escrow-протокол для инвестиций, грантов и RWA-программ, где выплаты происходят автоматически после ZK-доказательства соответствия policy и достижения milestone.**

Следующий логичный шаг — на основе этого документа сделать отдельный **implementation prompt для Codex**: какие контракты писать первыми, какие тесты обязательны, какую структуру репозитория создать и какой demo-flow должен пройти в конце.

[1]: https://developers.stellar.org/docs/build/apps/privacy "Privacy on Stellar | Stellar Docs"
[2]: https://developers.stellar.org/docs/tokens/stellar-asset-contract "Use Issued Assets in Smart Contracts with the Stellar Asset Contract (SAC) | Stellar Docs"
[3]: https://developers.stellar.org/docs/tokens/control-asset-access "Asset Design Considerations | Stellar Docs"
[4]: https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup "Set Up and Configure Your Environment for Writing Smart Contracts | Stellar Docs"
[5]: https://developers.stellar.org/docs/build/guides/transactions/invoke-contract-tx-sdk "Invoke a contract function in a transaction using SDKs | Stellar Docs"
[6]: https://developers.stellar.org/docs/build/guides/events/ingest?utm_source=chatgpt.com "Ingest events published from a contract | Stellar Docs"
