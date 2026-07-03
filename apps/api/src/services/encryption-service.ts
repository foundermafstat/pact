import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { StripeIntegrationConfig } from "../config";

export const encryptionKeyFromConfig = (config: StripeIntegrationConfig): Buffer => {
  const value = config.paymentProofEncryptionKey;
  if (!value) {
    throw new Error("PAYMENT_PROOF_ENCRYPTION_KEY is required for private data");
  }

  const base64 = Buffer.from(value, "base64");
  if (base64.length === 32) {
    return base64;
  }

  if (/^[0-9a-f]{64}$/i.test(value)) {
    return Buffer.from(value, "hex");
  }

  const utf8 = Buffer.from(value, "utf8");
  if (utf8.length === 32) {
    return utf8;
  }

  throw new Error("PAYMENT_PROOF_ENCRYPTION_KEY must decode to 32 bytes");
};

export const encryptJson = (value: unknown, key: Buffer): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(":");
};

export const decryptJson = <T>(value: string, key: Buffer): T => {
  const [version, iv, tag, encrypted] = value.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Unsupported encrypted value");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final()
  ]);
  return JSON.parse(decrypted.toString("utf8")) as T;
};
