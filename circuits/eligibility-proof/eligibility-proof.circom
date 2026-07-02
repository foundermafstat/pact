pragma circom 2.1.6;

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

  signal schemaAccumulator;
  schemaAccumulator <==
    credentialSecret +
    credentialSalt +
    subjectId +
    jurisdictionCode +
    isAccredited +
    isNonUs +
    sanctionsPassed +
    expiresAt +
    issuerId +
    merklePathElements[0] +
    merklePathIndices[0] +
    policyHash +
    credentialRoot +
    nullifier +
    chainId +
    contractId +
    marketId +
    assetId +
    actionType +
    accountBinding +
    currentEpoch;

  accepted <== schemaAccumulator - schemaAccumulator + 1;
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
