import { describe, expect, it } from "vitest";

import { PactApiClient, PactApiClientError } from "../src/lib/api-client";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });

describe("PactApiClient", () => {
  it("builds typed create program requests", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const client = new PactApiClient("http://api.test", async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse({
        data: {
          id: "11111111-1111-4111-8111-111111111111",
          programKey: "PACT-DEMO",
          sponsorWallet: "GSPONSOR",
          projectWallet: "GPROJECT",
          assetContract: "USDC",
          totalAmount: "1000",
          fundedAmount: "0",
          status: "Draft",
          eligibilityPolicyId: "eligibility-policy-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      });
    });

    await client.createProgram({
      programKey: "PACT-DEMO",
      sponsorWallet: "GSPONSOR",
      projectWallet: "GPROJECT",
      assetContract: "USDC",
      totalAmount: "1000",
      eligibilityPolicyId: "eligibility-policy-1",
      tranches: [
        {
          milestoneKey: "M1",
          milestonePolicyId: "milestone-policy-1",
          amount: "1000",
          releaseToWallet: "GPROJECT"
        }
      ]
    });

    expect(calls[0]?.url).toBe("http://api.test/api/programs");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init?.body))).toMatchObject({
      programKey: "PACT-DEMO"
    });
  });

  it("throws typed API errors", async () => {
    const client = new PactApiClient("http://api.test", async () =>
      jsonResponse(
        {
          error: {
            code: "program_not_found",
            message: "Program was not found"
          }
        },
        404
      )
    );

    await expect(client.getProof("missing")).rejects.toMatchObject({
      code: "program_not_found",
      status: 404
    });
  });
});
