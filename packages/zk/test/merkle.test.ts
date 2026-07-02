import { describe, expect, it } from "vitest";

import { buildMerkleTree } from "../src/merkle";

describe("Merkle builder", () => {
  it("builds a deterministic tree and proof", () => {
    const tree = buildMerkleTree(["0x01", "0x02", "0x03"]);
    const sameTree = buildMerkleTree(["0x01", "0x02", "0x03"]);
    const proof = tree.getProof(1);

    expect(tree.root).toBe(sameTree.root);
    expect(tree.levels).toHaveLength(3);
    expect(proof.leaf).toBe("0x02");
    expect(proof.root).toBe(tree.root);
    expect(proof.pathElements).toHaveLength(2);
    expect(proof.pathIndices).toEqual([1, 0]);
  });

  it("rejects empty trees", () => {
    expect(() => buildMerkleTree([])).toThrow("without leaves");
  });
});
