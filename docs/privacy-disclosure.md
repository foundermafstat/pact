# Pact Privacy Disclosure

## Hidden by design

- Raw KYB documents and provider responses are not published.
- Credential secrets, salts, and subject commitments are private to issuer/project flows.
- Exact milestone KPI values such as active users and pilot partner count are not shown in public audit views.
- Project and attestation secrets are never rendered by frontend public components.

## Public by design

- Threshold satisfaction is public through proof acceptance.
- Program, tranche, policy, root status, transaction hash, and indexed contract event metadata are public.
- Public roots and nullifiers are visible because they are required for replay resistance and auditability.
- Rejection codes for attack demonstrations are public so reviewers can verify expected failure modes.

## MVP notes

The current MVP uses deterministic mock/digest proof modes in parts of the stack while local Circom/snarkjs proof generation exists for fixtures. Public UI privacy guards and API audit projection strip denylisted private fields, but production hardening must replace placeholder Poseidon/Merkle bindings with final cryptographic circuits.
