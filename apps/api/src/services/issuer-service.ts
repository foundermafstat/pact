import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { CreateMockCredentialRequest, CredentialDto, RootDto, RootType } from "@pact/shared";
import { buildMerkleTree } from "@pact/zk";

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
  private readonly roots = new Map<string, RootDto>();

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

  public buildCredentialRoot(input: { policyId: string; rootType: RootType }): RootDto {
    const activeLeaves = [...this.credentials.values()]
      .filter((item) => item.credential.status === "Active")
      .map((item) => item.credential.credentialLeaf);

    if (activeLeaves.length === 0) {
      throw new Error("Cannot build credential root without active credentials");
    }

    const tree = buildMerkleTree(activeLeaves);
    const createdAt = now();
    const root: RootDto = {
      id: randomUUID(),
      policyId: input.policyId,
      root: tree.root,
      rootType: input.rootType,
      epoch: Date.now(),
      status: "Pending",
      txHash: null,
      validFrom: createdAt,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt
    };

    this.roots.set(root.id, root);
    return root;
  }
}

export const issuerService = new IssuerService();
