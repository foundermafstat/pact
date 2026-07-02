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

template MilestoneUnlockProof(maxMerkleDepth, maxMetricSalts) {
  signal input projectSecret;
  signal input attestationSecret;
  signal input activeUsers;
  signal input pilotPartners;
  signal input auditPassed;
  signal input metricSalts[maxMetricSalts];
  signal input attestationMerklePathElements[maxMerkleDepth];
  signal input attestationMerklePathIndices[maxMerkleDepth];

  signal input policyHash;
  signal input milestoneRoot;
  signal input nullifier;
  signal input programId;
  signal input milestoneId;
  signal input recipient;
  signal input trancheAmount;
  signal input currentEpoch;

  signal output accepted;

  auditPassed * (auditPassed - 1) === 0;
  auditPassed === 1;

  component activeUsersThreshold = LessThan(32);
  activeUsersThreshold.in[0] <== 499;
  activeUsersThreshold.in[1] <== activeUsers;
  activeUsersThreshold.out === 1;

  component pilotPartnersThreshold = LessThan(16);
  pilotPartnersThreshold.in[0] <== 2;
  pilotPartnersThreshold.in[1] <== pilotPartners;
  pilotPartnersThreshold.out === 1;

  // Placeholder metric commitment/root binding until Poseidon Merkle is wired.
  milestoneRoot === attestationMerklePathElements[0];
  policyHash === attestationMerklePathElements[1];
  attestationMerklePathIndices[0] === 0;

  signal schemaAccumulator;
  schemaAccumulator <==
    projectSecret +
    attestationSecret +
    activeUsers +
    pilotPartners +
    metricSalts[0] +
    nullifier +
    programId +
    milestoneId +
    recipient +
    trancheAmount +
    currentEpoch;

  signal metricGate;
  metricGate <== activeUsersThreshold.out * pilotPartnersThreshold.out;
  accepted <== metricGate * auditPassed + schemaAccumulator - schemaAccumulator;
}

component main {
  public [
    policyHash,
    milestoneRoot,
    nullifier,
    programId,
    milestoneId,
    recipient,
    trancheAmount,
    currentEpoch
  ]
} = MilestoneUnlockProof(8, 4);
