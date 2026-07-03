import { createHash } from "node:crypto";

import { Keypair } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";

import { verifySignature } from "../src/services/auth-service";

const seed = "SAKICEVQLYWGSOJS4WW7HZJWAHZVEEBS527LHK5V4MLJALYKICQCJXMW";
const wallet = "GBXFXNDLV4LSWA4VB7YIL5GBD7BVNR22SGBTDKMO2SBZZHDXSKZYCP7L";

const buildSep53MessageHash = (message: string): Buffer =>
  createHash("sha256")
    .update("Stellar Signed Message:\n", "utf8")
    .update(Buffer.from(message, "utf8"))
    .digest();

describe("auth signature verification", () => {
  it("accepts Freighter SEP-53 message signatures", () => {
    const message = "Pact wallet login";
    const keypair = Keypair.fromSecret(seed);
    const signature = keypair.sign(buildSep53MessageHash(message)).toString("base64");

    expect(verifySignature(message, wallet, signature)).toBe(true);
  });

  it("keeps compatibility with raw message signatures", () => {
    const message = "Pact wallet login";
    const keypair = Keypair.fromSecret(seed);
    const signature = keypair.sign(Buffer.from(message, "utf8")).toString("base64");

    expect(verifySignature(message, wallet, signature)).toBe(true);
  });

  it("rejects signatures for a different message", () => {
    const keypair = Keypair.fromSecret(seed);
    const signature = keypair
      .sign(buildSep53MessageHash("Pact wallet login"))
      .toString("base64");

    expect(verifySignature("Different message", wallet, signature)).toBe(false);
  });
});
