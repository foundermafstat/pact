import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import { canonicalizeJson, type JsonValue } from "./canonical-json";
import { PolicySchema, type Policy } from "./policy";

const textEncoder = new TextEncoder();

export const canonicalizePolicy = (policy: Policy): string => {
  const parsedPolicy = PolicySchema.parse(policy);
  return canonicalizeJson(parsedPolicy as unknown as JsonValue);
};

export const hashPolicy = (policy: Policy): `0x${string}` => {
  const canonicalPolicy = canonicalizePolicy(policy);
  return `0x${bytesToHex(sha256(textEncoder.encode(canonicalPolicy)))}`;
};
