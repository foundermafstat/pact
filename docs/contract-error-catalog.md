# Pact Contract Error Catalog

This catalog is the stable MVP mapping used by API and frontend error handling.

## PolicyRegistry

| Code | Error | Meaning |
|---:|---|---|
| 1 | `PolicyAlreadyExists` | Policy ID already exists. |
| 2 | `PolicyNotFound` | Policy ID was not found. |
| 3 | `InvalidValidityWindow` | `valid_until <= valid_from`. |
| 4 | `AlreadyInitialized` | Admin was already initialized. |
| 5 | `AdminNotInitialized` | Admin is required before write operations. |
| host auth | unauthorized admin | Soroban `require_auth` rejected the caller. |

## RootRegistry

| Code | Error | Meaning |
|---:|---|---|
| 1 | `RootNotFound` | Root/current root was not found. |
| 2 | `InvalidValidityWindow` | `valid_until <= valid_from`. |

## NullifierRegistry

| Code | Error | Meaning |
|---:|---|---|
| 1 | `NullifierAlreadyUsed` | Proof/nullifier replay was attempted. |

## VerifierAdapter

| Code | Error | Meaning |
|---:|---|---|
| 1 | `RealVerifierNotConfigured` | Groth16 verifier mode was selected before verifier integration. |

## MilestoneEscrow

| Code | Error | Meaning |
|---:|---|---|
| 1 | `ProgramAlreadyExists` | Program ID already exists. |
| 2 | `ProgramNotFound` | Program ID was not found. |
| 3 | `InvalidAmount` | Amount is zero or negative. |
| 4 | `TrancheAlreadyExists` | Tranche already exists for program/milestone. |
| 5 | `TrancheNotFound` | Tranche was not found. |
| 6 | `Overfunded` | Funding exceeds configured program total. |
| 7 | `ProgramNotFunded` | Program is not fully funded. |
| 8 | `NoTranches` | Program activation requires at least one tranche. |
| 9 | `TrancheTotalMismatch` | Sum of tranches does not equal program total. |
| 10 | `InvalidProgramStatus` | Operation requires a different program status. Covers paused/cancelled rejection. |
| 11 | `InactivePolicy` | Required policy is inactive or missing. |
| 12 | `InactiveRoot` | Required root is inactive or missing. |
| 13 | `InvalidProof` | Proof payload does not pass verifier/mock verifier. |
| 14 | `NullifierAlreadyUsed` | Eligibility or milestone proof replay was attempted. |
| 15 | `WrongAccountBinding` | Eligibility proof is not bound to the project account. |
| 16 | `ProjectNotEligible` | Milestone proof was submitted before project eligibility. |
| 17 | `WrongRecipient` | Milestone proof recipient does not match tranche recipient. |
| 18 | `WrongAmount` | Milestone proof amount does not match tranche amount. |
| 19 | `TrancheNotLocked` | Milestone proof can only mark a locked tranche as ready. |
| 20 | `TrancheNotReady` | Release requires a ready tranche. |

