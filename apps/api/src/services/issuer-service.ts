import { createHash, randomBytes, randomUUID } from "node:crypto";

import { Prisma, type Credential, type Root } from "@prisma/client";
import type { CreateMockCredentialRequest, CredentialDto, RootDto, RootType } from "@pact/shared";
import { buildMerkleTree } from "@pact/zk";

import { loadStripeIntegrationConfig } from "../config";
import { prisma } from "../db/client";
import {
  decryptJson,
  encryptJson,
  encryptionKeyFromConfig
} from "./encryption-service";

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

const hex = (bytes = 32): `0x${string}` => `0x${randomBytes(bytes).toString("hex")}`;
const sha256Hex = (value: string): `0x${string}` =>
  `0x${createHash("sha256").update(value).digest("hex")}`;

const toCredentialDto = (credential: Credential): CredentialDto => ({
  id: credential.id,
  credentialKey: credential.credentialKey,
  wallet: credential.wallet,
  subjectCommitment: credential.subjectCommitment,
  issuerId: credential.issuerId,
  credentialLeaf: credential.credentialLeaf,
  status: credential.status,
  expiresAt: credential.expiresAt.toISOString(),
  createdAt: credential.createdAt.toISOString()
});

const toRootDto = (root: Root): RootDto => ({
  id: root.id,
  policyId: root.policyId,
  root: root.root,
  rootType: root.rootType,
  epoch: root.epoch,
  status: root.status,
  txHash: root.txHash,
  validFrom: root.validFrom.toISOString(),
  validUntil: root.validUntil.toISOString(),
  createdAt: root.createdAt.toISOString()
});

const encryptPrivatePackage = (value: PrivateCredentialPackage): string =>
  encryptJson(value, encryptionKeyFromConfig(loadStripeIntegrationConfig()));

const decryptPrivatePackage = (value: string): PrivateCredentialPackage =>
  decryptJson<PrivateCredentialPackage>(
    value,
    encryptionKeyFromConfig(loadStripeIntegrationConfig())
  );

const ensureRootPolicy = async (policyId: string): Promise<void> => {
  await prisma.policy.upsert({
    where: { id: policyId },
    update: {},
    create: {
      id: policyId,
      policyKey: policyId,
      policyHash: sha256Hex(`policy:${policyId}`),
      policyType: "Eligibility",
      status: "Active",
      rawPolicyJson: {
        source: "issuer-root-build",
        policyId
      } as Prisma.InputJsonValue
    }
  });
};

export class IssuerService {
  public async reset(): Promise<void> {
    await prisma.credential.deleteMany();
    await prisma.root.deleteMany();
  }

  public async createMockCredential(input: CreateMockCredentialRequest): Promise<IssuedCredential> {
    const issuerId = process.env["KYC_ISSUER_ID"] ?? "PACT_KYB_SIGNED_ISSUER";
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

    const privateCredentialPackage: PrivateCredentialPackage = {
      credentialId: "",
      wallet: input.wallet,
      issuerId,
      isAccredited: input.isAccredited,
      isNonUs: input.isNonUs,
      jurisdictionCode: input.jurisdictionCode,
      sanctionsPassed: input.sanctionsPassed,
      expiresAt: input.expiresAt,
      credentialSalt,
      credentialSecret
    };
    const credential = await prisma.$transaction(async (tx) => {
      const created = await tx.credential.create({
        data: {
          credentialKey,
          wallet: input.wallet,
          subjectCommitment,
          issuerId,
          credentialLeaf,
          privatePackageEncrypted: "",
          status: "Active",
          expiresAt: new Date(input.expiresAt * 1000)
        }
      });
      const encrypted = encryptPrivatePackage({
        ...privateCredentialPackage,
        credentialId: created.id
      });
      return tx.credential.update({
        where: { id: created.id },
        data: { privatePackageEncrypted: encrypted }
      });
    });

    return {
      credential: toCredentialDto(credential),
      privateCredentialPackage: decryptPrivatePackage(credential.privatePackageEncrypted ?? "")
    };
  }

  public async getCredential(credentialId: string): Promise<IssuedCredential | undefined> {
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId }
    });
    if (!credential || !credential.privatePackageEncrypted) {
      return undefined;
    }
    return {
      credential: toCredentialDto(credential),
      privateCredentialPackage: decryptPrivatePackage(credential.privatePackageEncrypted)
    };
  }

  public async buildCredentialRoot(input: { policyId: string; rootType: RootType }): Promise<RootDto> {
    const activeCredentials = await prisma.credential.findMany({
      where: { status: "Active" },
      orderBy: { credentialLeaf: "asc" }
    });
    const activeLeaves = activeCredentials.map((item) => item.credentialLeaf);

    if (activeLeaves.length === 0) {
      throw new Error("Cannot build credential root without active credentials");
    }

    const tree = buildMerkleTree(activeLeaves);
    const createdAt = new Date();
    await ensureRootPolicy(input.policyId);
    const root = await prisma.root.create({
      data: {
        policyId: input.policyId,
        root: tree.root,
        rootType: input.rootType,
        epoch: Math.floor(Date.now() / 1000),
        status: "Pending",
        txHash: null,
        validFrom: createdAt,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    return toRootDto(root);
  }

  public async publishRoot(rootId: string): Promise<RootDto | undefined> {
    const root = await prisma.root.findUnique({ where: { id: rootId } });
    if (!root) {
      return undefined;
    }

    const publishedRoot = await prisma.root.update({
      where: { id: root.id },
      data: {
        status: "Active",
        txHash: sha256Hex(`publish:${root.id}:${root.root}`)
      }
    });

    return toRootDto(publishedRoot);
  }

  public async revokeCredential(credentialId: string): Promise<CredentialDto | undefined> {
    const credential = await prisma.credential.update({
      where: { id: credentialId },
      data: { status: "Revoked" }
    }).catch(() => undefined);

    return credential ? toCredentialDto(credential) : undefined;
  }
}

export const issuerService = new IssuerService();
