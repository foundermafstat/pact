import {
  createHash,
  randomBytes
} from "node:crypto";

import type { PaymentRevenueSnapshot } from "@prisma/client";
import {
  canonicalizeJson,
  type PaymentRevenuePrivateInput,
  type PaymentRevenuePublicInput,
  type StripeRevenueSnapshotDto
} from "@pact/shared";

import type { StripeIntegrationConfig } from "../config";
import { prisma } from "../db/client";
import {
  decryptJson,
  encryptJson,
  encryptionKeyFromConfig
} from "./encryption-service";
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

const sha256Hex = (value: string): `0x${string}` =>
  `0x${createHash("sha256").update(value).digest("hex")}`;

const assertCurrency = (actual: string, expected: string): void => {
  if (actual.toLowerCase() !== expected) {
    throw new Error("Stripe revenue snapshot contains mixed currencies");
  }
};

const amountToString = (value: { toFixed: (digits?: number) => string }): string =>
  value.toFixed(0);

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
  public async reset(): Promise<void> {
    await prisma.paymentRevenueSnapshot.deleteMany();
  }

  public async createSnapshot(input: CreateSnapshotInput): Promise<StripeRevenueSnapshotDto> {
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
    const thresholdPassed =
      BigInt(normalized.netRevenueCents) >= BigInt(input.thresholdCents);

    const privateEncrypted: EncryptedPrivateSnapshot = {
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
    };
    const record = await prisma.paymentRevenueSnapshot.create({
      data: {
        programId: input.programId,
        stripeConnectionId: input.connection.id,
        connectedAccountHash,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
        currency: input.currency,
        thresholdCents: input.thresholdCents,
        policyHash: input.policyHash,
        connectedAccountIdEncrypted: privateEncrypted.connectedAccountIdEncrypted,
        grossPaidCentsEncrypted: privateEncrypted.grossPaidCentsEncrypted,
        refundCentsEncrypted: privateEncrypted.refundCentsEncrypted,
        feeCentsEncrypted: privateEncrypted.feeCentsEncrypted,
        netRevenueCentsEncrypted: privateEncrypted.netRevenueCentsEncrypted,
        successfulChargeCountEncrypted: privateEncrypted.successfulChargeCountEncrypted,
        snapshotCommitment,
        sourceRefsCommitment,
        rawSourceRefsEncrypted: privateEncrypted.rawSourceRefsEncrypted,
        connectorSecretEncrypted: privateEncrypted.connectorSecretEncrypted,
        snapshotSaltEncrypted: privateEncrypted.snapshotSaltEncrypted,
        sourceRefSaltsEncrypted: privateEncrypted.sourceRefSaltsEncrypted,
        thresholdPassed,
        status: "Generated"
      }
    });

    return this.toDto(record);
  }

  public async getSnapshot(snapshotId: string): Promise<StripeRevenueSnapshotDto | undefined> {
    const record = await prisma.paymentRevenueSnapshot.findUnique({
      where: { id: snapshotId }
    });
    return record ? this.toDto(record) : undefined;
  }

  public async buildProofInput(
    config: StripeIntegrationConfig,
    snapshotId: string,
    milestoneId: string
  ): Promise<
    | {
        publicInput: PaymentRevenuePublicInput;
        privateInput: PaymentRevenuePrivateInput;
        thresholdPassed: boolean;
      }
    | undefined
  > {
    const record = await prisma.paymentRevenueSnapshot.findUnique({
      where: { id: snapshotId }
    });
    if (!record) {
      return undefined;
    }

    const key = encryptionKeyFromConfig(config);
    const periodStartEpoch = Math.floor(record.periodStart.getTime() / 1000);
    const periodEndEpoch = Math.floor(record.periodEnd.getTime() / 1000);
    const publicInput: PaymentRevenuePublicInput = {
      policyHash: record.policyHash as `0x${string}`,
      snapshotCommitment: record.snapshotCommitment as `0x${string}`,
      sourceRefsCommitment: record.sourceRefsCommitment as `0x${string}`,
      connectedAccountHash: record.connectedAccountHash as `0x${string}`,
      programId: record.programId,
      milestoneId,
      thresholdCents: amountToString(record.thresholdCents),
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
        record.connectorSecretEncrypted,
        key
      ) as `0x${string}`,
      snapshotSalt: decryptJson<string>(
        record.snapshotSaltEncrypted,
        key
      ) as `0x${string}`,
      netRevenueCents: decryptJson<string>(
        record.netRevenueCentsEncrypted,
        key
      ),
      grossPaidCents: decryptJson<string>(
        record.grossPaidCentsEncrypted,
        key
      ),
      refundCents: decryptJson<string>(
        record.refundCentsEncrypted,
        key
      ),
      feeCents: decryptJson<string>(record.feeCentsEncrypted, key),
      successfulChargeCount: decryptJson<number>(
        record.successfulChargeCountEncrypted,
        key
      ),
      sourceRefSalts: decryptJson<string[]>(
        record.sourceRefSaltsEncrypted,
        key
      ) as `0x${string}`[]
    };

    return {
      publicInput,
      privateInput,
      thresholdPassed: record.thresholdPassed
    };
  }

  private toDto(record: PaymentRevenueSnapshot): StripeRevenueSnapshotDto {
    return {
      id: record.id,
      programId: record.programId,
      status: "Generated",
      source: "stripe",
      mode: "test",
      connectedAccountHash: record.connectedAccountHash as `0x${string}`,
      periodStart: record.periodStart.toISOString(),
      periodEnd: record.periodEnd.toISOString(),
      currency: record.currency,
      thresholdCents: amountToString(record.thresholdCents),
      policyHash: record.policyHash as `0x${string}`,
      snapshotCommitment: record.snapshotCommitment as `0x${string}`,
      sourceRefsCommitment: record.sourceRefsCommitment as `0x${string}`,
      generatedAt: record.generatedAt.toISOString(),
      thresholdPassed: record.thresholdPassed
    };
  }
}

export const stripeRevenueSnapshotService = new StripeRevenueSnapshotService();
