import { sharedPackageName } from "@pact/shared";

export const zkPackageName = "@pact/zk";
export const zkSharedDependency = sharedPackageName;
export {
  belowThresholdMilestoneFixture,
  expiredEligibilityFixture,
  sanctionsFalseEligibilityFixture,
  validEligibilityFixture,
  validMilestoneFixture,
  wrongRecipientMilestoneFixture
} from "./fixtures";
export type { EligibilityFixture, MilestoneFixture } from "./fixtures";
export { buildMerkleTree, sha256PairHash } from "./merkle";
export type { HashFunction, MerkleProof, MerkleTree } from "./merkle";
export {
  formatEligibilityPublicInputs,
  formatMilestonePublicInputs
} from "./public-inputs";
