import { sharedPackageName } from "@pact/shared";

export const zkPackageName = "@pact/zk";
export const zkSharedDependency = sharedPackageName;
export { buildMerkleTree, sha256PairHash } from "./merkle";
export type { HashFunction, MerkleProof, MerkleTree } from "./merkle";
