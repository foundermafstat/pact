# Pact MVP Final Acceptance Checklist

Date: 2026-07-02

Status: accepted for MVP local/testnet demo.

## Deployment Artifacts

| Area | Artifact | Status |
| --- | --- | --- |
| Contracts | `contracts/deployments/latest.contracts.json` | Real Stellar testnet contract IDs recorded. |
| Off-chain services | `docs/deployment/offchain-services.latest.json` | Passed in `production-like-local-auto` mode. |
| Frontend demo | `docs/deployment/frontend-demo.latest.json` | Next build and Playwright smoke passed. |

## Acceptance Checks

| Check | Command / evidence | Result |
| --- | --- | --- |
| Happy path releases tranche | `pnpm demo:happy-path` | Passed. Eligibility proof `Succeeded`, milestone proof `Succeeded`, tranche `Released`, tx hash generated. |
| Replay rejected | `pnpm demo:attacks` | Passed. Rejected with `tranche_release_failed`. |
| Revoked credential rejected | `pnpm demo:attacks` | Passed. Rejected with `credential_not_active`. |
| Cross-program proof rejected | `pnpm demo:attacks` | Passed. Rejected with `milestone_public_inputs_mismatch`. |
| Wrong recipient rejected | `pnpm demo:attacks` | Passed. Rejected with `milestone_public_inputs_mismatch`. |
| Inactive root rejected | `pnpm demo:attacks` | Passed. Rejected with `milestone_proof_input_unavailable`. |
| Public audit hides private data | `pnpm --filter @pact/web test -- privacy-guards.test.ts` | Passed. 14 files, 17 tests. |
| Contract events indexed | `pnpm --filter @pact/indexer test` | Passed. 1 file, 3 tests. |
| Contract read smoke | `stellar contract invoke ... -- version` | Passed. Policy registry returned `1`. |

## Notes

- External public hosting URL is not configured in this workspace; frontend demo artifact uses `http://127.0.0.1:3100`.
- Docker daemon was unavailable. Off-chain service verification tried real Postgres/Redis first, then passed with schema-only DB and mock queue fallback for MVP demo mode.
- No real secrets are stored in committed artifacts.
