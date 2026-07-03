pragma circom 2.1.6;

template Num2Bits(n) {
  signal input in;
  signal output out[n];

  var lc = 0;
  for (var i = 0; i < n; i++) {
    out[i] <-- (in >> i) & 1;
    out[i] * (out[i] - 1) === 0;
    lc += out[i] * 2 ** i;
  }

  lc === in;
}

template LessThan(n) {
  signal input in[2];
  signal output out;

  component bits = Num2Bits(n + 1);
  bits.in <== in[0] + 2 ** n - in[1];
  out <== 1 - bits.out[n];
}

template PaymentRevenueThresholdProof(maxSourceRefSalts) {
  signal input connectorSecret;
  signal input snapshotSalt;
  signal input netRevenueCents;
  signal input grossPaidCents;
  signal input refundCents;
  signal input feeCents;
  signal input successfulChargeCount;
  signal input sourceRefSalts[maxSourceRefSalts];

  signal input policyHash;
  signal input snapshotCommitment;
  signal input sourceRefsCommitment;
  signal input connectedAccountHash;
  signal input programId;
  signal input milestoneId;
  signal input thresholdCents;
  signal input currencyCode;
  signal input periodStartEpoch;
  signal input periodEndEpoch;
  signal input currentEpoch;
  signal input nullifier;

  signal output accepted;

  component grossBits = Num2Bits(64);
  grossBits.in <== grossPaidCents;

  component refundBits = Num2Bits(64);
  refundBits.in <== refundCents;

  component feeBits = Num2Bits(64);
  feeBits.in <== feeCents;

  component netBits = Num2Bits(64);
  netBits.in <== netRevenueCents;

  component thresholdBits = Num2Bits(64);
  thresholdBits.in <== thresholdCents;

  component countBits = Num2Bits(32);
  countBits.in <== successfulChargeCount;

  component periodStartBits = Num2Bits(64);
  periodStartBits.in <== periodStartEpoch;

  component periodEndBits = Num2Bits(64);
  periodEndBits.in <== periodEndEpoch;

  component currentEpochBits = Num2Bits(64);
  currentEpochBits.in <== currentEpoch;

  grossPaidCents === netRevenueCents + refundCents + feeCents;

  component periodOrder = LessThan(64);
  periodOrder.in[0] <== periodStartEpoch;
  periodOrder.in[1] <== periodEndEpoch;

  component netBelowThreshold = LessThan(64);
  netBelowThreshold.in[0] <== netRevenueCents;
  netBelowThreshold.in[1] <== thresholdCents;

  // Placeholder commitment binding until Poseidon/field-safe SHA binding is wired.
  snapshotCommitment ===
    connectorSecret + snapshotSalt + netRevenueCents + sourceRefsCommitment;
  sourceRefsCommitment === sourceRefSalts[0] + successfulChargeCount;
  connectedAccountHash === connectorSecret + sourceRefSalts[1];
  policyHash === programId + milestoneId + thresholdCents + currencyCode;
  nullifier === snapshotSalt + programId * 17 + milestoneId * 19;

  accepted <== (1 - netBelowThreshold.out) * periodOrder.out;
}

component main {
  public [
    policyHash,
    snapshotCommitment,
    sourceRefsCommitment,
    connectedAccountHash,
    programId,
    milestoneId,
    thresholdCents,
    currencyCode,
    periodStartEpoch,
    periodEndEpoch,
    currentEpoch,
    nullifier
  ]
} = PaymentRevenueThresholdProof(4);
