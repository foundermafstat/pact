import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

export type HashFunction = (left: `0x${string}`, right: `0x${string}`) => `0x${string}`;

export type MerkleProof = {
  leaf: `0x${string}`;
  root: `0x${string}`;
  pathElements: `0x${string}`[];
  pathIndices: number[];
};

export type MerkleTree = {
  root: `0x${string}`;
  levels: `0x${string}`[][];
  getProof: (leafIndex: number) => MerkleProof;
};

const normalizeHex = (value: string): `0x${string}` => {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new Error(`Invalid hex value: ${value}`);
  }

  return `0x${value.slice(2).toLowerCase()}`;
};

export const sha256PairHash: HashFunction = (left, right) => {
  const leftBytes = hexToBytes(left.slice(2));
  const rightBytes = hexToBytes(right.slice(2));
  const combined = new Uint8Array(leftBytes.length + rightBytes.length);
  combined.set(leftBytes, 0);
  combined.set(rightBytes, leftBytes.length);
  return `0x${bytesToHex(sha256(combined))}`;
};

export const buildMerkleTree = (
  inputLeaves: string[],
  hash: HashFunction = sha256PairHash
): MerkleTree => {
  if (inputLeaves.length === 0) {
    throw new Error("Cannot build a Merkle tree without leaves");
  }

  const leaves = inputLeaves.map(normalizeHex);
  const levels: `0x${string}`[][] = [leaves];
  let currentLevel = leaves;

  while (currentLevel.length > 1) {
    const nextLevel: `0x${string}`[] = [];

    for (let index = 0; index < currentLevel.length; index += 2) {
      const left = currentLevel[index];
      if (!left) {
        throw new Error("Invalid Merkle level state");
      }

      const right = currentLevel[index + 1] ?? left;
      nextLevel.push(hash(left, right));
    }

    levels.push(nextLevel);
    currentLevel = nextLevel;
  }

  const root = currentLevel[0];
  if (!root) {
    throw new Error("Invalid Merkle root state");
  }

  return {
    root,
    levels,
    getProof: (leafIndex: number): MerkleProof => {
      if (leafIndex < 0 || leafIndex >= leaves.length) {
        throw new Error(`Leaf index out of range: ${leafIndex}`);
      }

      const pathElements: `0x${string}`[] = [];
      const pathIndices: number[] = [];
      let index = leafIndex;
      const leaf = leaves[leafIndex];
      if (!leaf) {
        throw new Error(`Leaf index out of range: ${leafIndex}`);
      }

      for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex += 1) {
        const level = levels[levelIndex];
        if (!level) {
          throw new Error("Invalid Merkle proof level");
        }

        const isRightNode = index % 2 === 1;
        const siblingIndex = isRightNode ? index - 1 : index + 1;
        pathElements.push(level[siblingIndex] ?? level[index] ?? leaf);
        pathIndices.push(isRightNode ? 1 : 0);
        index = Math.floor(index / 2);
      }

      return {
        leaf,
        root,
        pathElements,
        pathIndices
      };
    }
  };
};
