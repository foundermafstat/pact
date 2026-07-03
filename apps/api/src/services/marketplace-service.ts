import type {
  InvestmentCommitment,
  InvestmentPool,
  StartupPoolApplication,
  StartupProfile
} from "@prisma/client";
import type {
  ApplyToInvestmentPoolRequest,
  CreateInvestmentCommitmentRequest,
  CreateInvestmentPoolRequest,
  CreateStartupProfileRequest,
  InvestmentCommitmentDto,
  InvestmentPoolDto,
  StartupPoolApplicationDto,
  StartupProfileDto
} from "@pact/shared";

import { prisma } from "../db/client";
import { ApiError } from "../errors";

const normalizeWallet = (wallet: string): string => wallet.trim().toUpperCase();

const amountToString = (value: { toFixed: (digits?: number) => string }): string =>
  value.toFixed(0);

const normalizeNullableUrl = (value?: string): string | null => {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
};

const toStartupProfileDto = (profile: StartupProfile): StartupProfileDto => ({
  id: profile.id,
  founderWallet: profile.founderWallet,
  name: profile.name,
  summary: profile.summary,
  industry: profile.industry,
  stage: profile.stage,
  website: profile.website,
  requestedAmount: amountToString(profile.requestedAmount),
  currency: profile.currency,
  fundingUse: profile.fundingUse,
  requirements: profile.requirements,
  traction: profile.traction,
  status: profile.status,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString()
});

const toInvestmentPoolDto = (pool: InvestmentPool): InvestmentPoolDto => ({
  id: pool.id,
  ownerWallet: pool.ownerWallet,
  name: pool.name,
  poolType: pool.poolType,
  thesis: pool.thesis,
  targetIndustry: pool.targetIndustry,
  stages: pool.stages,
  totalAmount: amountToString(pool.totalAmount),
  currency: pool.currency,
  requirements: pool.requirements,
  status: pool.status,
  createdAt: pool.createdAt.toISOString(),
  updatedAt: pool.updatedAt.toISOString()
});

const toStartupPoolApplicationDto = (
  application: StartupPoolApplication
): StartupPoolApplicationDto => ({
  id: application.id,
  founderWallet: application.founderWallet,
  startupProfileId: application.startupProfileId,
  investmentPoolId: application.investmentPoolId,
  note: application.note,
  status: application.status,
  createdAt: application.createdAt.toISOString(),
  updatedAt: application.updatedAt.toISOString()
});

const toInvestmentCommitmentDto = (
  commitment: InvestmentCommitment
): InvestmentCommitmentDto => ({
  id: commitment.id,
  investorWallet: commitment.investorWallet,
  startupProfileId: commitment.startupProfileId,
  amount: amountToString(commitment.amount),
  currency: commitment.currency,
  note: commitment.note,
  status: commitment.status,
  createdAt: commitment.createdAt.toISOString(),
  updatedAt: commitment.updatedAt.toISOString()
});

export class MarketplaceService {
  public async createStartupProfile(
    founderWallet: string,
    input: CreateStartupProfileRequest
  ): Promise<StartupProfileDto> {
    const wallet = normalizeWallet(founderWallet);
    await prisma.walletAccount.upsert({
      where: { wallet },
      update: {},
      create: { wallet }
    });

    const profile = await prisma.startupProfile.create({
      data: {
        founderWallet: wallet,
        name: input.name.trim(),
        summary: input.summary.trim(),
        industry: input.industry.trim(),
        stage: input.stage.trim(),
        website: normalizeNullableUrl(input.website),
        requestedAmount: input.requestedAmount,
        currency: input.currency.trim().toUpperCase(),
        fundingUse: input.fundingUse.trim(),
        requirements: input.requirements.trim(),
        traction: input.traction.trim(),
        status: "Submitted"
      }
    });

    return toStartupProfileDto(profile);
  }

  public async listFounderStartupProfiles(founderWallet: string): Promise<StartupProfileDto[]> {
    const profiles = await prisma.startupProfile.findMany({
      where: { founderWallet: normalizeWallet(founderWallet) },
      orderBy: { createdAt: "desc" }
    });

    return profiles.map(toStartupProfileDto);
  }

  public async listAvailableStartupProfiles(): Promise<StartupProfileDto[]> {
    const profiles = await prisma.startupProfile.findMany({
      where: {
        status: {
          in: ["Submitted", "Listed"]
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return profiles.map(toStartupProfileDto);
  }

  public async createInvestmentPool(
    ownerWallet: string,
    input: CreateInvestmentPoolRequest
  ): Promise<InvestmentPoolDto> {
    const wallet = normalizeWallet(ownerWallet);
    await prisma.walletAccount.upsert({
      where: { wallet },
      update: {},
      create: { wallet }
    });

    const pool = await prisma.investmentPool.create({
      data: {
        ownerWallet: wallet,
        name: input.name.trim(),
        poolType: input.poolType,
        thesis: input.thesis.trim(),
        targetIndustry: input.targetIndustry.trim(),
        stages: input.stages.trim(),
        totalAmount: input.totalAmount,
        currency: input.currency.trim().toUpperCase(),
        requirements: input.requirements.trim(),
        status: "Open"
      }
    });

    return toInvestmentPoolDto(pool);
  }

  public async listInvestmentPools(input?: {
    ownerWallet?: string | undefined;
    onlyOpen?: boolean | undefined;
  }): Promise<InvestmentPoolDto[]> {
    const pools = await prisma.investmentPool.findMany({
      where: {
        ...(input?.ownerWallet ? { ownerWallet: normalizeWallet(input.ownerWallet) } : {}),
        ...(input?.onlyOpen ? { status: "Open" } : {})
      },
      orderBy: { createdAt: "desc" }
    });

    return pools.map(toInvestmentPoolDto);
  }

  public async applyToInvestmentPool(
    founderWallet: string,
    investmentPoolId: string,
    input: ApplyToInvestmentPoolRequest
  ): Promise<StartupPoolApplicationDto> {
    const wallet = normalizeWallet(founderWallet);
    const [profile, pool] = await Promise.all([
      prisma.startupProfile.findUnique({
        where: { id: input.startupProfileId }
      }),
      prisma.investmentPool.findUnique({
        where: { id: investmentPoolId }
      })
    ]);
    if (!profile || profile.founderWallet !== wallet) {
      throw new ApiError(404, "startup_not_found", "Startup profile was not found");
    }
    if (!pool || pool.status !== "Open") {
      throw new ApiError(404, "investment_pool_not_found", "Investment pool was not found");
    }

    const application = await prisma.startupPoolApplication.upsert({
      where: {
        startupProfileId_investmentPoolId: {
          startupProfileId: input.startupProfileId,
          investmentPoolId
        }
      },
      update: {
        note: input.note.trim(),
        status: "Submitted"
      },
      create: {
        founderWallet: wallet,
        startupProfileId: input.startupProfileId,
        investmentPoolId,
        note: input.note.trim(),
        status: "Submitted"
      }
    });

    return toStartupPoolApplicationDto(application);
  }

  public async listFounderPoolApplications(
    founderWallet: string
  ): Promise<StartupPoolApplicationDto[]> {
    const applications = await prisma.startupPoolApplication.findMany({
      where: { founderWallet: normalizeWallet(founderWallet) },
      orderBy: { createdAt: "desc" }
    });

    return applications.map(toStartupPoolApplicationDto);
  }

  public async createInvestmentCommitment(
    investorWallet: string,
    startupProfileId: string,
    input: CreateInvestmentCommitmentRequest
  ): Promise<InvestmentCommitmentDto> {
    const wallet = normalizeWallet(investorWallet);
    await prisma.walletAccount.upsert({
      where: { wallet },
      update: {},
      create: { wallet }
    });

    const profile = await prisma.startupProfile.findUnique({
      where: { id: startupProfileId }
    });
    if (!profile || !["Submitted", "Listed"].includes(profile.status)) {
      throw new ApiError(404, "startup_not_found", "Startup profile was not found");
    }

    const commitment = await prisma.investmentCommitment.create({
      data: {
        investorWallet: wallet,
        startupProfileId,
        amount: input.amount,
        currency: input.currency.trim().toUpperCase(),
        note: input.note.trim(),
        status: "Pending"
      }
    });

    return toInvestmentCommitmentDto(commitment);
  }

  public async listInvestorCommitments(
    investorWallet: string
  ): Promise<InvestmentCommitmentDto[]> {
    const commitments = await prisma.investmentCommitment.findMany({
      where: { investorWallet: normalizeWallet(investorWallet) },
      orderBy: { createdAt: "desc" }
    });

    return commitments.map(toInvestmentCommitmentDto);
  }
}

export const marketplaceService = new MarketplaceService();
