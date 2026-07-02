import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { CreateMockCredentialRequest, CredentialDto } from "@pact/shared";

export type PrivateCredentialPackage = {
  credentialId: string;
  wallet: string;
  issuerId: string;
  isAccredited: boolean;
  isNonUs: boolean;
  jurisdictionCode: string;
  sanctionsPassed: boolean;
  expiresAt: number;
  credentialSalt: string;
  credentialSecret: string;
};

export type IssuedCredential = {
  credential: CredentialDto;
  privateCredentialPackage: PrivateCredentialPackage;
};

const now = (): string => new Date().toISOString();
const hex = (bytes = 32): `0x${string}` => `0x${randomBytes(bytes).toString("hex")}`;
const sha256Hex = (value: string): `0x${string}` =>
  `0x${createHash("sha256").update(value).digest("hex")}`;

export class IssuerService {
  private readonly credentials = new Map<string, IssuedCredential>();

  public createMockCredential(input: CreateMockCredentialRequest): IssuedCredential {
    const issuerId = process.env["KYC_ISSUER_ID"] ?? "PACT_KYB_MOCK_ISSUER";
    const credentialSecret = hex();
    const credentialSalt = hex();
    const credentialKey = `cred_${randomUUID()}`;
    const subjectCommitment = sha256Hex(
      `${input.wallet}:${credentialSalt}:${credentialSecret}`
    );
    const credentialLeaf = sha256Hex(
      JSON.stringify({
        subjectCommitment,
        issuerId,
        isAccredited: input.isAccredited,
        isNonUs: input.isNonUs,
        jurisdictionCode: input.jurisdictionCode,
        sanctionsPassed: input.sanctionsPassed,
        expiresAt: input.expiresAt
      })
    );

    const credential: CredentialDto = {
      id: randomUUID(),
      credentialKey,
      wallet: input.wallet,
      subjectCommitment,
      issuerId,
      credentialLeaf,
      status: "Active",
      expiresAt: new Date(input.expiresAt * 1000).toISOString(),
      createdAt: now()
    };

    const issuedCredential = {
      credential,
      privateCredentialPackage: {
        credentialId: credential.id,
        wallet: input.wallet,
        issuerId,
        isAccredited: input.isAccredited,
        isNonUs: input.isNonUs,
        jurisdictionCode: input.jurisdictionCode,
        sanctionsPassed: input.sanctionsPassed,
        expiresAt: input.expiresAt,
        credentialSalt,
        credentialSecret
      }
    };

    this.credentials.set(credential.id, issuedCredential);
    return issuedCredential;
  }
}

export const issuerService = new IssuerService();
