# PaymentRevenueThresholdProof Circuit

This circuit checks the private Stripe revenue arithmetic used by the Pact
connector snapshot:

- `grossPaidCents = netRevenueCents + refundCents + feeCents`
- `accepted = 1` only when `netRevenueCents >= thresholdCents` and the period
  boundary is valid
- amount, count, and epoch fields are range checked

The commitment and hash bindings intentionally match the current placeholder
style used by the existing demo circuits. They are not portable SHA/Poseidon
bindings yet; the trust anchor for this MVP remains the Pact server-side
Stripe connector and its stored snapshot commitment.

Public signal order:
`policyHash`, `snapshotCommitment`, `sourceRefsCommitment`,
`connectedAccountHash`, `programId`, `milestoneId`, `thresholdCents`,
`currencyCode`, `periodStartEpoch`, `periodEndEpoch`, `currentEpoch`,
`nullifier`.
