import type { StripeIntegrationConfig } from "../config";
import type { StripeConnectionRecord } from "./stripe-oauth-service";

type StripeOAuthTokenResponse = {
  token_type?: string;
  scope?: string;
  livemode?: boolean;
  stripe_user_id?: string;
  access_token?: string;
  refresh_token?: string;
};

type StripeListResponse<T> = {
  data?: T[];
  has_more?: boolean;
};

export type StripeChargeRecord = {
  id: string;
  amount_captured?: number;
  balance_transaction?: string | null;
  captured?: boolean;
  created: number;
  currency: string;
  disputed?: boolean;
  paid?: boolean;
  status?: string;
};

export type StripeRefundRecord = {
  id: string;
  amount: number;
  charge?: string | null;
  created: number;
  currency: string;
  status?: string | null;
};

export type StripeBalanceTransactionRecord = {
  id: string;
  created: number;
  currency: string;
  fee: number;
  net: number;
  source?: string | null;
};

export type StripeRevenueSourceData = {
  charges: StripeChargeRecord[];
  refunds: StripeRefundRecord[];
  balanceTransactions: StripeBalanceTransactionRecord[];
};

type PeriodInput = {
  periodStartEpoch: number;
  periodEndEpoch: number;
  currency: string;
};

const requireStripeApiConfig = (config: StripeIntegrationConfig): void => {
  if (!config.secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for Stripe API calls");
  }
};

const stripeHeaders = (
  config: StripeIntegrationConfig,
  stripeAccountId?: string
): HeadersInit => {
  requireStripeApiConfig(config);
  const headers: Record<string, string> = {
    authorization: `Basic ${Buffer.from(`${config.secretKey ?? ""}:`).toString(
      "base64"
    )}`,
    "stripe-version": config.apiVersion
  };
  if (stripeAccountId) {
    headers["stripe-account"] = stripeAccountId;
  }
  return headers;
};

const assertStripeResponse = async (response: Response): Promise<void> => {
  if (response.ok) {
    return;
  }

  let message = "Stripe API request failed";
  try {
    const body = (await response.json()) as {
      error?: { message?: string; code?: string };
    };
    message = body.error?.message ?? body.error?.code ?? message;
  } catch {
    message = response.statusText || message;
  }

  throw new Error(message);
};

export class StripeConnectorService {
  public async exchangeOAuthCode(
    config: StripeIntegrationConfig,
    code: string
  ): Promise<{
    stripeAccountId: string;
    livemode: boolean;
    scope: string;
  }> {
    requireStripeApiConfig(config);

    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", code);

    const response = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        ...stripeHeaders(config),
        "content-type": "application/x-www-form-urlencoded"
      },
      body
    });
    await assertStripeResponse(response);

    const tokenResponse = (await response.json()) as StripeOAuthTokenResponse;
    if (!tokenResponse.stripe_user_id) {
      throw new Error("Stripe OAuth response did not include stripe_user_id");
    }

    return {
      stripeAccountId: tokenResponse.stripe_user_id,
      livemode: tokenResponse.livemode ?? false,
      scope: tokenResponse.scope ?? "unknown"
    };
  }

  public async deauthorize(
    config: StripeIntegrationConfig,
    connection: StripeConnectionRecord
  ): Promise<void> {
    if (!config.connectClientId) {
      throw new Error("STRIPE_CONNECT_CLIENT_ID is required for Stripe deauthorize");
    }

    const body = new URLSearchParams();
    body.set("client_id", config.connectClientId);
    body.set("stripe_user_id", connection.stripeAccountId);

    const response = await fetch("https://connect.stripe.com/oauth/deauthorize", {
      method: "POST",
      headers: {
        ...stripeHeaders(config),
        "content-type": "application/x-www-form-urlencoded"
      },
      body
    });
    await assertStripeResponse(response);
  }

  public async fetchRevenueSourceData(
    config: StripeIntegrationConfig,
    connection: StripeConnectionRecord,
    input: PeriodInput
  ): Promise<StripeRevenueSourceData> {
    requireStripeApiConfig(config);

    const charges = await this.listStripeRecords<StripeChargeRecord>(
      config,
      connection.stripeAccountId,
      "/v1/charges",
      {
        "created[gte]": input.periodStartEpoch.toString(),
        "created[lt]": input.periodEndEpoch.toString()
      }
    );
    const refunds = await this.listStripeRecords<StripeRefundRecord>(
      config,
      connection.stripeAccountId,
      "/v1/refunds",
      {
        "created[gte]": input.periodStartEpoch.toString(),
        "created[lt]": input.periodEndEpoch.toString()
      }
    );
    const balanceTransactions =
      await this.listStripeRecords<StripeBalanceTransactionRecord>(
        config,
        connection.stripeAccountId,
        "/v1/balance_transactions",
        {
          "created[gte]": input.periodStartEpoch.toString(),
          "created[lt]": input.periodEndEpoch.toString(),
          currency: input.currency
        }
      );

    return {
      charges,
      refunds,
      balanceTransactions
    };
  }

  private async listStripeRecords<T>(
    config: StripeIntegrationConfig,
    stripeAccountId: string,
    path: string,
    params: Record<string, string>
  ): Promise<T[]> {
    const records: T[] = [];
    let startingAfter: string | undefined;

    do {
      const url = new URL(`https://api.stripe.com${path}`);
      url.searchParams.set("limit", "100");
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
      if (startingAfter) {
        url.searchParams.set("starting_after", startingAfter);
      }

      const response = await fetch(url, {
        method: "GET",
        headers: stripeHeaders(config, stripeAccountId)
      });
      await assertStripeResponse(response);

      const list = (await response.json()) as StripeListResponse<T>;
      const page = list.data ?? [];
      records.push(...page);
      const last = page.at(-1) as { id?: string } | undefined;
      startingAfter = list.has_more && last?.id ? last.id : undefined;
    } while (startingAfter);

    return records;
  }
}

export const stripeConnectorService = new StripeConnectorService();
