import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID
} from "node:crypto";

import {
  canonicalizeJson,
  type PaymentRevenuePrivateInput,
  type PaymentRevenuePublicInput,
  type StripeRevenueSnapshotDto
} from "@pact/shared";

import type { StripeIntegrationConfig } from "../config";
import type {
  StripeBalanceTransactionRecord,
  StripeChargeRecord,
  StripeRefundRecord,
  StripeRevenueSourceData
} from "./stripe-connector-service";
import type { StripeConnectionRecord } from "./stripe-oauth-service";

type CreateSnapshotInput = {
  config: StripeIntegrationConfig;
  programId: string;
  connection: StripeConnectionRecord;
  sourceData: StripeRevenueSourceData;
  periodStart: string;
  periodEnd: string;
  currency: string;
  thresholdCents: string;
  policyHash: `0x${string}`;
};

type EncryptedPrivateSnapshot = {
  connectedAccountIdEncrypted: string;
  grossPaidCentsEncrypted: string;
  refundCentsEncrypted: string;
  feeCentsEncrypted: string;
  netRevenueCentsEncrypted: string;
  successfulChargeCountEncrypted: string;
  rawSourceRefsEncrypted: string;
  connectorSecretEncrypted: string;
  snapshotSaltEncrypted: string;
  sourceRefSaltsEncrypted: string;
};

type SnapshotRecord = StripeRevenueSnapshotDto & {
  privateEncrypted: EncryptedPrivateSnapshot;
};

export type NormalizedRevenueSnapshot = {
  grossPaidCents: string;
  refundCents: string;
  feeCents: string;
  netRevenueCents: string;
  successfulChargeCount: number;
  chargeRefs: Array<{
    id: string;
    amountCaptured: string;
    balanceTransactionId: string | null;
    created: number;
  }>;
  refundRefs: Array<{
    id: string;
    amount: string;
    chargeId: string | null;
    created: number;
  }>;
  balanceTransactionRefs: Array<{
    id: string;
    fee: string;
    net: string;
    source: string | null;
    created: number;
  }>;
};

const now = (): string => new Date().toISOString();

const sha256Hex = (value: string): `0x${string}` =>
  `0x${createHash("sha256").update(value).digest("hex")}`;

const assertCurrency = (actual: string, expected: string): void => {
  if (actual.toLowerCase() !== expected) {
    throw new Error("Stripe revenue snapshot contains mixed currencies");
  }
};

const encryptionKeyFromConfig = (config: StripeIntegrationConfig): Buffer => {
  const value = config.paymentProofEncryptionKey;
  if (!value) {
    throw new Error("PAYMENT_PROOF_ENCRYPTION_KEY is required for snapshots");
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

const encryptJson = (value: unknown, key: Buffer): string => {
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

const decryptJson = <T>(value: string, key: Buffer): T => {
  const [version, iv, tag, encrypted] = value.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Unsupported encrypted snapshot value");
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

export const normalizeStripeRevenue = (
  sourceData: StripeRevenueSourceData,
  currency: string
): NormalizedRevenueSnapshot => {
  const includedCharges = sourceData.charges.filter(
    (charge) =>
      charge.paid === true &&
      charge.status === "succeeded" &&
      charge.captured === true &&
      charge.disputed !== true &&
      (charge.amount_captured ?? 0) > 0
  );

  for (const charge of includedCharges) {
    assertCurrency(charge.currency, currency);
  }
  if (includedCharges.length === 0) {
    throw new Error("Stripe connected account has no successful paid charges");
  }

  const includedChargeIds = new Set(includedCharges.map((charge) => charge.id));
  const chargeBalanceTransactionIds = new Set(
    includedCharges
      .map((charge) => charge.balance_transaction)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  );
  const includedRefunds = sourceData.refunds.filter(
    (refund) =>
      refund.status === "succeeded" &&
      typeof refund.charge === "string" &&
      includedChargeIds.has(refund.charge)
  );
  for (const refund of includedRefunds) {
    assertCurrency(refund.currency, currency);
  }

  const includedBalanceTransactions = sourceData.balanceTransactions.filter(
    (transaction) =>
      transaction.source &&
      (includedChargeIds.has(transaction.source) ||
        chargeBalanceTransactionIds.has(transaction.id))
  );
  for (const transaction of includedBalanceTransactions) {
    assertCurrency(transaction.currency, currency);
  }

  const grossPaidCents = includedCharges.reduce(
    (sum, charge) => sum + BigInt(charge.amount_captured ?? 0),
    0n
  );
  const refundCents = includedRefunds.reduce(
    (sum, refund) => sum + BigInt(refund.amount),
    0n
  );
  const feeCents = includedBalanceTransactions.reduce(
    (sum, transaction) => sum + BigInt(Math.abs(transaction.fee)),
    0n
  );
  const netRevenueCents = grossPaidCents - refundCents - feeCents;
  if (netRevenueCents < 0n) {
    throw new Error("Stripe net revenue is negative for the selected period");
  }

  return {
    grossPaidCents: grossPaidCents.toString(),
    refundCents: refundCents.toString(),
    feeCents: feeCents.toString(),
    netRevenueCents: netRevenueCents.toString(),
    successfulChargeCount: includedCharges.length,
    chargeRefs: includedCharges.map((charge) => ({
      id: charge.id,
      amountCaptured: String(charge.amount_captured ?? 0),
      balanceTransactionId: charge.balance_transaction ?? null,
      created: charge.created
    })),
    refundRefs: includedRefunds.map((refund) => ({
      id: refund.id,
      amount: String(refund.amount),
      chargeId: refund.charge ?? null,
      created: refund.created
    })),
    balanceTransactionRefs: includedBalanceTransactions.map((transaction) => ({
      id: transaction.id,
      fee: String(transaction.fee),
      net: String(transaction.net),
      source: transaction.source ?? null,
      created: transaction.created
    }))
  };
};

export class StripeRevenueSnapshotService {
  private readonly snapshots = new Map<string, SnapshotRecord>();

  public reset(): void {
    this.snapshots.clear();
  }

  public createSnapshot(input: CreateSnapshotInput): StripeRevenueSnapshotDto {
    const key = encryptionKeyFromConfig(input.config);
    const normalized = normalizeStripeRevenue(input.sourceData, input.currency);
    const snapshotSalt = randomBytes(16).toString("hex");
    const connectorSecret = randomBytes(16).toString("hex");
    const sourceRefs = {
      charges: normalized.chargeRefs,
      refunds: normalized.refundRefs,
      balanceTransactions: normalized.balanceTransactionRefs
    };
    const sourceRefsCommitment = sha256Hex(
      `${canonicalizeJson(sourceRefs)}:${snapshotSalt}`
    );
    const connectedAccountHash = sha256Hex(
      `stripe-account:${input.connection.stripeAccountId}:${input.connection.accountSalt}`
    );
    const snapshotCommitment = sha256Hex(
      `${canonicalizeJson({
        source: "stripe",
        mode: "test",
        connectedAccountHash,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        currency: input.currency,
        grossPaidCents: normalized.grossPaidCents,
        refundCents: normalized.refundCents,
        feeCents: normalized.feeCents,
        netRevenueCents: normalized.netRevenueCents,
        successfulChargeCount: normalized.successfulChargeCount,
        sourceRefsCommitment
      })}:${snapshotSalt}`
    );
    const generatedAt = now();
    const id = randomUUID();
    const thresholdPassed =
      BigInt(normalized.netRevenueCents) >= BigInt(input.thresholdCents);

    const record: SnapshotRecord = {
      id,
      programId: input.programId,
      status: "Generated",
      source: "stripe",
      mode: "test",
      connectedAccountHash,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      currency: input.currency,
      thresholdCents: input.thresholdCents,
      policyHash: input.policyHash,
      snapshotCommitment,
      sourceRefsCommitment,
      generatedAt,
      thresholdPassed,
      privateEncrypted: {
        connectedAccountIdEncrypted: encryptJson(input.connection.stripeAccountId, key),
        grossPaidCentsEncrypted: encryptJson(normalized.grossPaidCents, key),
        refundCentsEncrypted: encryptJson(normalized.refundCents, key),
        feeCentsEncrypted: encryptJson(normalized.feeCents, key),
        netRevenueCentsEncrypted: encryptJson(normalized.netRevenueCents, key),
        successfulChargeCountEncrypted: encryptJson(
          normalized.successfulChargeCount,
          key
        ),
        rawSourceRefsEncrypted: encryptJson(sourceRefs, key),
        connectorSecretEncrypted: encryptJson(`0x${connectorSecret}`, key),
        snapshotSaltEncrypted: encryptJson(`0x${snapshotSalt}`, key),
        sourceRefSaltsEncrypted: encryptJson([`0x${snapshotSalt}`], key)
      }
    };
    this.snapshots.set(id, record);

    return this.toDto(record);
  }

  public getSnapshot(snapshotId: string): StripeRevenueSnapshotDto | undefined {
    const record = this.snapshots.get(snapshotId);
    return record ? this.toDto(record) : undefined;
  }

  public buildProofInput(
    config: StripeIntegrationConfig,
    snapshotId: string,
    milestoneId: string
  ):
    | {
        publicInput: PaymentRevenuePublicInput;
        privateInput: PaymentRevenuePrivateInput;
        thresholdPassed: boolean;
      }
    | undefined {
    const record = this.snapshots.get(snapshotId);
    if (!record) {
      return undefined;
    }

    const key = encryptionKeyFromConfig(config);
    const periodStartEpoch = Math.floor(new Date(record.periodStart).getTime() / 1000);
    const periodEndEpoch = Math.floor(new Date(record.periodEnd).getTime() / 1000);
    const publicInput: PaymentRevenuePublicInput = {
      policyHash: record.policyHash,
      snapshotCommitment: record.snapshotCommitment,
      sourceRefsCommitment: record.sourceRefsCommitment,
      connectedAccountHash: record.connectedAccountHash,
      programId: record.programId,
      milestoneId,
      thresholdCents: record.thresholdCents,
      currencyCode: record.currency,
      periodStartEpoch,
      periodEndEpoch,
      currentEpoch: Math.floor(Date.now() / 1000),
      nullifier: sha256Hex(
        `payment-revenue:${record.id}:${record.programId}:${milestoneId}`
      )
    };
    const privateInput: PaymentRevenuePrivateInput = {
      connectorSecret: decryptJson<string>(
        record.privateEncrypted.connectorSecretEncrypted,
        key
      ) as `0x${string}`,
      snapshotSalt: decryptJson<string>(
        record.privateEncrypted.snapshotSaltEncrypted,
        key
      ) as `0x${string}`,
      netRevenueCents: decryptJson<string>(
        record.privateEncrypted.netRevenueCentsEncrypted,
        key
      ),
      grossPaidCents: decryptJson<string>(
        record.privateEncrypted.grossPaidCentsEncrypted,
        key
      ),
      refundCents: decryptJson<string>(
        record.privateEncrypted.refundCentsEncrypted,
        key
      ),
      feeCents: decryptJson<string>(record.privateEncrypted.feeCentsEncrypted, key),
      successfulChargeCount: decryptJson<number>(
        record.privateEncrypted.successfulChargeCountEncrypted,
        key
      ),
      sourceRefSalts: decryptJson<string[]>(
        record.privateEncrypted.sourceRefSaltsEncrypted,
        key
      ) as `0x${string}`[]
    };

    return {
      publicInput,
      privateInput,
      thresholdPassed: record.thresholdPassed
    };
  }

  private toDto(record: SnapshotRecord): StripeRevenueSnapshotDto {
    const { privateEncrypted: _privateEncrypted, ...dto } = record;
    return dto;
  }
}

export const stripeRevenueSnapshotService = new StripeRevenueSnapshotService();
