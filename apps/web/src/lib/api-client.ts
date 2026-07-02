import {
  ApiErrorResponseSchema,
  ApiSuccessResponseSchema,
  CreateMilestoneEvidenceRequestSchema,
  CreateMockCredentialRequestSchema,
  CreateProgramRequestSchema,
  CredentialDtoSchema,
  FundProgramRequestSchema,
  GenerateProofRequestSchema,
  MilestoneAttestationDtoSchema,
  ProgramDtoSchema,
  ProofJobDtoSchema,
  RootBuildRequestSchema,
  RootDtoSchema,
  RootPublishRequestSchema,
  SubmitMilestoneProofRequestSchema,
  TrancheDtoSchema,
  type CreateMilestoneEvidenceRequest,
  type CreateMockCredentialRequest,
  type CreateProgramRequest,
  type FundProgramRequest,
  type GenerateProofRequest,
  type SubmitMilestoneProofRequest
} from "@pact/shared";

type Parser<T> = {
  parse: (value: unknown) => T;
};

type FetchLike = typeof fetch;

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
  public constructor(
    private readonly baseUrl: string,
    private readonly fetcher: FetchLike = fetch
  ) {}

  public createProgram(input: CreateProgramRequest) {
    return this.request("/api/programs", {
      method: "POST",
      body: CreateProgramRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(
        ProgramDtoSchema.pick({ id: true }).passthrough()
      )
    });
  }

  public fundProgram(programId: string, input: FundProgramRequest) {
    return this.request(`/api/programs/${programId}/fund`, {
      method: "POST",
      body: FundProgramRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(ProgramDtoSchema.passthrough())
    });
  }

  public activateProgram(programId: string) {
    return this.request(`/api/programs/${programId}/activate`, {
      method: "POST",
      schema: ApiSuccessResponseSchema(ProgramDtoSchema.passthrough())
    });
  }

  public getProgramAudit(programId: string) {
    return this.request(`/api/programs/${programId}/audit`, {
      method: "GET",
      schema: { parse: (value: unknown) => value }
    });
  }

  public createMockCredential(input: CreateMockCredentialRequest) {
    return this.request("/api/issuer/credentials/mock", {
      method: "POST",
      body: CreateMockCredentialRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(
        CredentialDtoSchema.pick({ id: true }).passthrough()
      )
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
      schema: { parse: (value: unknown) => value }
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

  public getProof(proofId: string) {
    return this.request(`/api/proofs/${proofId}`, {
      method: "GET",
      schema: ApiSuccessResponseSchema(ProofJobDtoSchema)
    });
  }

  public submitMilestoneProof(input: SubmitMilestoneProofRequest) {
    return this.request("/api/proofs/milestone/submit", {
      method: "POST",
      body: SubmitMilestoneProofRequestSchema.parse(input),
      schema: ApiSuccessResponseSchema(
        TrancheDtoSchema.pick({ id: true }).passthrough()
      )
    });
  }

  private async request<T>(
    path: string,
    options: {
      method: "GET" | "POST";
      body?: unknown;
      schema: Parser<T>;
    }
  ): Promise<T> {
    const init: RequestInit = {
      method: options.method,
      headers: {
        "content-type": "application/json"
      }
    };
    if (options.body !== undefined) {
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
