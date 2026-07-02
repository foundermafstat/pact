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

template EligibilityProof(maxMerkleDepth) {
  signal input credentialSecret;
  signal input credentialSalt;
  signal input subjectId;
  signal input jurisdictionCode;
  signal input isAccredited;
  signal input isNonUs;
  signal input sanctionsPassed;
  signal input expiresAt;
  signal input issuerId;
  signal input merklePathElements[maxMerkleDepth];
  signal input merklePathIndices[maxMerkleDepth];

  signal input policyHash;
  signal input credentialRoot;
  signal input nullifier;
  signal input chainId;
  signal input contractId;
  signal input marketId;
  signal input assetId;
  signal input actionType;
  signal input accountBinding;
  signal input currentEpoch;

  signal output accepted;

  isAccredited * (isAccredited - 1) === 0;
  isNonUs * (isNonUs - 1) === 0;
  sanctionsPassed * (sanctionsPassed - 1) === 0;
  sanctionsPassed === 1;

  signal eligibilityPassed;
  eligibilityPassed <== isAccredited + isNonUs - isAccredited * isNonUs;
  eligibilityPassed === 1;

  component notExpired = LessThan(64);
  notExpired.in[0] <== currentEpoch;
  notExpired.in[1] <== expiresAt;
  notExpired.out === 1;

  // Placeholder membership and policy binding until Poseidon Merkle is wired.
  credentialRoot === merklePathElements[0];
  policyHash === merklePathElements[1];
  merklePathIndices[0] === 0;

  signal schemaAccumulator;
  schemaAccumulator <==
    credentialSecret +
    credentialSalt +
    subjectId +
    jurisdictionCode +
    expiresAt +
    issuerId +
    nullifier +
    chainId +
    contractId +
    marketId +
    assetId +
    actionType +
    accountBinding;

  signal policyGate;
  policyGate <== sanctionsPassed * eligibilityPassed;
  accepted <== policyGate * notExpired.out + schemaAccumulator - schemaAccumulator;
}

component main {
  public [
    policyHash,
    credentialRoot,
    nullifier,
    chainId,
    contractId,
    marketId,
    assetId,
    actionType,
    accountBinding,
    currentEpoch
  ]
} = EligibilityProof(8);
