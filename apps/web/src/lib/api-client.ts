import {
  ApplyToInvestmentPoolRequestSchema,
  ApiErrorResponseSchema,
  ApiSuccessResponseSchema,
  AssignWalletRoleRequestSchema,
  AuthChallengeDtoSchema,
  AuthChallengeRequestSchema,
  AuthSessionDtoSchema,
  AuthVerifyRequestSchema,
  CreateInvestmentCommitmentRequestSchema,
  CreateInvestmentPoolRequestSchema,
  CreateMilestoneEvidenceRequestSchema,
  CreateMockCredentialRequestSchema,
  CreateProgramRequestSchema,
  CreateStripeRevenueSnapshotRequestSchema,
  CreateStartupProfileRequestSchema,
  CredentialDtoSchema,
  FundProgramRequestSchema,
  GenerateStripeRevenueProofRequestSchema,
  GenerateProofRequestSchema,
  InvestmentCommitmentDtoSchema,
  InvestmentPoolDtoSchema,
  MilestoneAttestationDtoSchema,
  ProgramDtoSchema,
  ProofJobDtoSchema,
  RootBuildRequestSchema,
  RootDtoSchema,
  RootPublishRequestSchema,
  SelectAccountRoleRequestSchema,
  StartupProfileDtoSchema,
  StartupPoolApplicationDtoSchema,
  StripeConnectionStatusDtoSchema,
  StripeOAuthStartDtoSchema,
  StripeRevenueSnapshotDtoSchema,
  SubmitMilestoneProofRequestSchema,
  TrancheDtoSchema,
  WalletRoleDtoSchema,
  type AssignWalletRoleRequest,
  type ApplyToInvestmentPoolRequest,
  type AuthChallengeRequest,
  type AuthVerifyRequest,
  type CreateInvestmentCommitmentRequest,
  type CreateInvestmentPoolRequest,
  type CreateMilestoneEvidenceRequest,
  type CreateMockCredentialRequest,
  type CreateProgramRequest,
  type CreateStripeRevenueSnapshotRequest,
  type CreateStartupProfileRequest,
  type FundProgramRequest,
  type GenerateStripeRevenueProofRequest,
  type GenerateProofRequest,
  type SelectAccountRoleRequest,
  type SubmitMilestoneProofRequest
} from "@pact/shared";

type Parser<T> = {
  parse: (value: unknown) => T;
};

type FetchLike = typeof fetch;

const normalizeLocalApiUrl = (baseUrl: string): string => {
  if (typeof window === "undefined") {
    return baseUrl.replace(/\/$/, "");
  }

  try {
    const url = new URL(baseUrl);
    const localHosts = new Set(["localhost", "127.0.0.1"]);
    if (localHosts.has(url.hostname) && localHosts.has(window.location.hostname)) {
      url.hostname = window.location.hostname;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return baseUrl.replace(/\/$/, "");
  }
};

const ProgramRecordResponseSchema = {
  parse: (value: unknown) => {
    const data = (value as { data?: { program?: unknown; tranches?: unknown[] } }).data;
    return {
      data: {
        program: ProgramDtoSchema.parse(data?.program),
        tranches: (data?.tranches ?? []).map((tranche) => TrancheDtoSchema.parse(tranche))
      }
    };
  }
};

const MockCredentialResponseSchema = {
  parse: (value: unknown) => {
    const data = (value as { data?: { credential?: unknown; privateCredentialPackage?: unknown } })
      .data;
    return {
      data: {
        credential: CredentialDtoSchema.parse(data?.credential),
        privateCredentialPackage: data?.privateCredentialPackage
      }
    };
  }
};

const UnknownSuccessSchema = {
  parse: (value: unknown) => value
};

export class PactApiClientError extends Error {
  public constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export class PactApiClient {
  private readonly baseUrl: string;

  public constructor(
    baseUrl: string,
    private readonly fetcher: FetchLike = globalThis.fetch.bind(globalThis)
  ) {
    this.baseUrl = normalizeLocalApiUrl(baseUrl);
  }

  public createAuthChallenge(input: AuthChallengeRequest) {
    return this.request("/api/auth/challenge", {
      method: "POST",
      body: AuthChallengeRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(AuthChallengeDtoSchema)
    });
  }

  public verifyAuthChallenge(input: AuthVerifyRequest) {
    return this.request("/api/auth/verify", {
      method: "POST",
      body: AuthVerifyRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(AuthSessionDtoSchema)
    });
  }

  public getCurrentSession() {
    return this.request("/api/auth/me", {
      method: "GET",
      schema: ApiSuccessResponseSchema(AuthSessionDtoSchema)
    });
  }

  public logout() {
    return this.request("/api/auth/logout", {
      method: "POST",
      schema: UnknownSuccessSchema
    });
  }

  public selectAccountRole(input: SelectAccountRoleRequest) {
    return this.request("/api/auth/select-role", {
      method: "POST",
      body: SelectAccountRoleRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(AuthSessionDtoSchema)
    });
  }

  public listWalletRoles() {
    return this.request("/api/admin/wallet-roles", {
      method: "GET",
      schema: ApiSuccessResponseSchema(WalletRoleDtoSchema.array())
    });
  }

  public assignWalletRole(input: AssignWalletRoleRequest) {
    return this.request("/api/admin/wallet-roles", {
      method: "POST",
      body: AssignWalletRoleRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(WalletRoleDtoSchema)
    });
  }

  public createStartupProfile(input: CreateStartupProfileRequest) {
    return this.request("/api/startups", {
      method: "POST",
      body: CreateStartupProfileRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(StartupProfileDtoSchema)
    });
  }

  public listMyStartupProfiles() {
    return this.request("/api/startups/mine", {
      method: "GET",
      schema: ApiSuccessResponseSchema(StartupProfileDtoSchema.array())
    });
  }

  public listStartupProfiles() {
    return this.request("/api/startups", {
      method: "GET",
      schema: ApiSuccessResponseSchema(StartupProfileDtoSchema.array())
    });
  }

  public createInvestmentPool(input: CreateInvestmentPoolRequest) {
    return this.request("/api/investment-pools", {
      method: "POST",
      body: CreateInvestmentPoolRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(InvestmentPoolDtoSchema)
    });
  }

  public listInvestmentPools(scope?: "mine" | "open") {
    const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";
    return this.request(`/api/investment-pools${query}`, {
      method: "GET",
      schema: ApiSuccessResponseSchema(InvestmentPoolDtoSchema.array())
    });
  }

  public applyToInvestmentPool(poolId: string, input: ApplyToInvestmentPoolRequest) {
    return this.request(`/api/investment-pools/${poolId}/applications`, {
      method: "POST",
      body: ApplyToInvestmentPoolRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(StartupPoolApplicationDtoSchema)
    });
  }

  public listMyPoolApplications() {
    return this.request("/api/investment-pool-applications/mine", {
      method: "GET",
      schema: ApiSuccessResponseSchema(StartupPoolApplicationDtoSchema.array())
    });
  }

  public createInvestmentCommitment(
    startupId: string,
    input: CreateInvestmentCommitmentRequest
  ) {
    return this.request(`/api/startups/${startupId}/commitments`, {
      method: "POST",
      body: CreateInvestmentCommitmentRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(InvestmentCommitmentDtoSchema)
    });
  }

  public listMyInvestmentCommitments() {
    return this.request("/api/investment-commitments/mine", {
      method: "GET",
      schema: ApiSuccessResponseSchema(InvestmentCommitmentDtoSchema.array())
    });
  }

  public createProgram(input: CreateProgramRequest) {
    return this.request("/api/programs", {
      method: "POST",
      body: CreateProgramRequestSchema.parse(input),
      schema: ProgramRecordResponseSchema
    });
  }

  public fundProgram(programId: string, input: FundProgramRequest) {
    return this.request(`/api/programs/${programId}/fund`, {
      method: "POST",
      body: FundProgramRequestSchema.parse(input),
      schema: ProgramRecordResponseSchema
    });
  }

  public activateProgram(programId: string) {
    return this.request(`/api/programs/${programId}/activate`, {
      method: "POST",
      schema: ProgramRecordResponseSchema
    });
  }

  public getProgramAudit(programId: string) {
    return this.request(`/api/programs/${programId}/audit`, {
      method: "GET",
      schema: UnknownSuccessSchema
    });
  }

  public createMockCredential(input: CreateMockCredentialRequest) {
    return this.request("/api/issuer/credentials/mock", {
      method: "POST",
      body: CreateMockCredentialRequestSchema.parse(input),
      schema: MockCredentialResponseSchema
    });
  }

  public buildIssuerRoot(input: unknown) {
    return this.request("/api/issuer/roots/build", {
      method: "POST",
      body: RootBuildRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(RootDtoSchema)
    });
  }

  public publishIssuerRoot(input: unknown) {
    return this.request("/api/issuer/roots/publish", {
      method: "POST",
      body: RootPublishRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(RootDtoSchema)
    });
  }

  public revokeCredential(credentialId: string) {
    return this.request(`/api/issuer/credentials/${credentialId}/revoke`, {
      method: "POST",
      schema: ApiSuccessResponseSchema(CredentialDtoSchema)
    });
  }

  public createMilestoneEvidence(input: CreateMilestoneEvidenceRequest) {
    return this.request("/api/attestor/milestone-evidence/mock", {
      method: "POST",
      body: CreateMilestoneEvidenceRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(MilestoneAttestationDtoSchema)
    });
  }

  public buildMilestoneRoot(input: unknown) {
    return this.request("/api/attestor/milestone-root/build", {
      method: "POST",
      body: RootBuildRequestSchema.parse(input),
      schema: UnknownSuccessSchema
    });
  }

  public publishMilestoneRoot(input: unknown) {
    return this.request("/api/attestor/milestone-root/publish", {
      method: "POST",
      body: RootPublishRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(RootDtoSchema)
    });
  }

  public generateEligibilityProof(input: GenerateProofRequest) {
    return this.request("/api/proofs/eligibility/generate", {
      method: "POST",
      body: GenerateProofRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(ProofJobDtoSchema)
    });
  }

  public generateMilestoneProof(input: GenerateProofRequest) {
    return this.request("/api/proofs/milestone/generate", {
      method: "POST",
      body: GenerateProofRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(ProofJobDtoSchema)
    });
  }

  public getMilestoneProofInput(programId: string, milestoneKey: string) {
    return this.request(`/api/attestor/programs/${programId}/milestones/${milestoneKey}`, {
      method: "GET",
      schema: UnknownSuccessSchema
    });
  }

  public getProof(proofId: string) {
    return this.request(`/api/proofs/${proofId}`, {
      method: "GET",
      schema: ApiSuccessResponseSchema(ProofJobDtoSchema)
    });
  }

  public getStripeConnectionStatus(programId: string) {
    return this.request(`/api/integrations/stripe/status?programId=${encodeURIComponent(programId)}`, {
      method: "GET",
      schema: ApiSuccessResponseSchema(StripeConnectionStatusDtoSchema)
    });
  }

  public startStripeOAuth(programId: string) {
    return this.request(`/api/integrations/stripe/oauth/start?programId=${encodeURIComponent(programId)}`, {
      method: "GET",
      schema: ApiSuccessResponseSchema(StripeOAuthStartDtoSchema)
    });
  }

  public disconnectStripe(programId: string) {
    return this.request("/api/integrations/stripe/disconnect", {
      method: "POST",
      body: { programId },
      schema: ApiSuccessResponseSchema(StripeConnectionStatusDtoSchema)
    });
  }

  public createStripeRevenueSnapshot(input: CreateStripeRevenueSnapshotRequest) {
    return this.request("/api/payment-proofs/stripe/revenue-threshold/snapshot", {
      method: "POST",
      body: CreateStripeRevenueSnapshotRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(StripeRevenueSnapshotDtoSchema)
    });
  }

  public generateStripeRevenueProof(input: GenerateStripeRevenueProofRequest) {
    return this.request("/api/payment-proofs/stripe/revenue-threshold/generate", {
      method: "POST",
      body: GenerateStripeRevenueProofRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(ProofJobDtoSchema)
    });
  }

  public getStripeRevenueProof(proofJobId: string) {
    return this.request(`/api/payment-proofs/stripe/revenue-threshold/${proofJobId}`, {
      method: "GET",
      schema: ApiSuccessResponseSchema(ProofJobDtoSchema)
    });
  }

  public submitMilestoneProof(input: SubmitMilestoneProofRequest) {
    return this.request("/api/proofs/milestone/submit", {
      method: "POST",
      body: SubmitMilestoneProofRequestSchema.parse(input),
      schema: UnknownSuccessSchema
    });
  }

  private async request<T>(
    path: string,
    options: {
      method: "GET" | "POST";
      body?: unknown;
      headers?: Record<string, string>;
      schema: Parser<T>;
    }
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...options.headers
    };
    const init: RequestInit = {
      method: options.method,
      credentials: "include",
      headers
    };
    if (options.body !== undefined) {
      headers["content-type"] = headers["content-type"] ?? "application/json";
      init.body = JSON.stringify(options.body);
    }

    const response = await this.fetcher(`${this.baseUrl}${path}`, init);
    const json = await response.json();

    if (!response.ok) {
      const parsedError = ApiErrorResponseSchema.safeParse(json);
      throw new PactApiClientError(
        parsedError.success ? parsedError.data.error.message : "API request failed",
        parsedError.success ? parsedError.data.error.code : "api_error",
        response.status
      );
    }

    return options.schema.parse(json);
  }
}
