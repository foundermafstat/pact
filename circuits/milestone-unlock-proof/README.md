# MilestoneUnlockProof Circuit

This skeleton maps the shared milestone proof input schema to Circom signals
and compiles before final threshold, Merkle, and nullifier constraints are
added.

Public signal order: `policyHash`, `milestoneRoot`, `nullifier`, `programId`,
`milestoneId`, `recipient`, `trancheAmount`, `currentEpoch`.
