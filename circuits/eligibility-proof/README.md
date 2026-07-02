# EligibilityProof Circuit

This skeleton maps the shared eligibility input schema to Circom signals and
compiles without the final cryptographic membership constraints.

The public signals are ordered to match the MVP verifier contract surface:
`policyHash`, `credentialRoot`, `nullifier`, `chainId`, `contractId`,
`marketId`, `assetId`, `actionType`, `accountBinding`, `currentEpoch`.
