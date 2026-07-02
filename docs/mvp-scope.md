# Pact MVP Scope

## Product goal

Pact MVP proves that capital can be locked in a Stellar/Soroban escrow and released only after private eligibility and private milestone proofs pass, while the public audit trail shows accountability without exposing raw KYC/KYB data or hidden project metrics.

MVP product name: **Pact: Private Milestone Escrow**.

## Roles

### Sponsor

Funds a program, defines tranches, activates the escrow flow, watches milestone status, and sees public verification/release events.

### Project / Team

Receives assigned funding, passes mock KYB, generates eligibility and milestone proofs, submits proof payloads, and receives released tranche funds.

### Investor / Participant

Represents a wallet/account that may need eligibility verification for regulated participation flows. In the MVP this role is primarily demonstrated through private credential eligibility.

### KYC/KYB Issuer

Creates mock credentials, builds credential Merkle roots, publishes roots on-chain, revokes credentials by rotating roots, and demonstrates revoked-credential rejection.

### Milestone Attestor

Validates hidden milestone evidence, builds metric commitments and milestone Merkle roots, publishes roots on-chain, and prepares milestone proof inputs.

### Public Observer

Reads the public audit trail: program creation, escrow funding, policy/root activation, proof verification events, and tranche release. The observer does not see raw credential fields, private evidence, or exact hidden KPI values.

## In scope

- Stellar testnet MVP.
- Soroban contracts:
  - `PolicyRegistry`
  - `RootRegistry`
  - `NullifierRegistry`
  - `VerifierAdapter`
  - `MilestoneEscrow`
  - optional `GatedAssetController`
- Demo asset through testnet XLM or Stellar Asset Contract issued asset.
- Mock KYC/KYB issuer.
- Mock milestone attestor.
- Credential root and milestone metric root publishing.
- Eligibility proof for `accredited_or_non_us` policy.
- Milestone unlock proof for M1:
  - `active_users >= 500`
  - `pilot_partners >= 3`
  - `audit_passed == true`
- Nullifier-based replay protection.
- Backend API for programs, policies, issuer, attestor, proofs, and audit.
- Event indexer for public audit trail.
- Web dashboard for Sponsor, Project, Issuer, Attestor, and Public Audit views.
- Attack demos:
  - replay milestone proof
  - revoked credential
  - cross-market/cross-program replay
  - wrong recipient

## Out of scope

- Production KYC provider integration.
- Production dispute resolution.
- Production multi-attestor threshold governance.
- Mainnet deployment.
- Browser-side proving as the default path.
- Advanced revocation accumulator.
- Timelocked policy updates.
- Admin multisig production setup.
- zkTLS or external data source proofs.
- Independent formal audit of contracts and circuits.

## Main demo flow

1. Sponsor creates a funding program and adds tranches.
2. Sponsor funds escrow and activates the program.
3. Issuer creates a mock KYB credential for the project.
4. Issuer builds and publishes a credential root.
5. Project generates and submits an eligibility proof.
6. Contract verifies the proof and marks its nullifier used.
7. Attestor validates hidden milestone metrics.
8. Attestor builds and publishes a milestone root.
9. Project generates and submits a milestone proof.
10. Contract verifies the milestone proof, checks recipient/amount/program binding, marks the nullifier used, and releases the tranche.
11. Public Audit View shows only public events and statuses.

## Attack demo flow

### Replay milestone proof

Submit the same milestone proof/nullifier twice. Expected result: second submission is rejected by `NullifierRegistry`.

### Revoked credential

Create a credential, publish a root, revoke the credential, rotate the root, then try to use the old credential/root. Expected result: proof against inactive/old root is rejected.

### Cross-program replay

Use a proof generated for one program or context against another program. Expected result: proof is rejected because public inputs and nullifier context are bound to program/market/action.

### Wrong recipient

Submit a milestone proof with a recipient different from tranche `release_to`. Expected result: contract rejects the proof/release.

## Acceptance notes

- Hidden milestone values are never displayed in Public Audit View.
- Raw KYC/KYB fields and credential secrets are never displayed publicly.
- Public observers learn that a threshold passed, not the exact private values.
- MVP starts with mock verifier support and finishes with real Groth16 BN254 proof verification where supported by the implementation path.
