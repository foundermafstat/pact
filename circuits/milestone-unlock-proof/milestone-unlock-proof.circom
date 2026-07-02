pragma circom 2.1.6;

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

  signal schemaAccumulator;
  schemaAccumulator <==
    projectSecret +
    attestationSecret +
    activeUsers +
    pilotPartners +
    auditPassed +
    metricSalts[0] +
    attestationMerklePathElements[0] +
    attestationMerklePathIndices[0] +
    policyHash +
    milestoneRoot +
    nullifier +
    programId +
    milestoneId +
    recipient +
    trancheAmount +
    currentEpoch;

  accepted <== schemaAccumulator - schemaAccumulator + 1;
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
