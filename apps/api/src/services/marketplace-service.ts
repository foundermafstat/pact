import type {
  InvestmentCommitment,
  InvestmentPool,
  Program,
  StartupPoolApplication,
  StartupProfile,
  Tranche
} from "@prisma/client";
import type {
  ApplyToInvestmentPoolRequest,
  ApproveStartupPoolApplicationRequest,
  CreateInvestmentCommitmentRequest,
  CreateInvestmentPoolRequest,
  CreateStartupProfileRequest,
  InvestmentCommitmentDto,
  InvestmentPoolDto,
  ProgramDto,
  StartupPoolApplicationDto,
  StartupProfileDto,
  TrancheDto
} from "@pact/shared";

import { prisma } from "../db/client";
import { ApiError } from "../errors";
import {
  escrowContractService,
  SmartContractNotConfiguredError
} from "./escrow-contract-service";

const normalizeWallet = (wallet: string): string => wallet.trim().toUpperCase();

const amountToString = (value: { toFixed: (digits?: number) => string }): string =>
  value.toFixed(0);

const normalizeNullableUrl = (value?: string): string | null => {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
};

type ApplicationWithRelations = StartupPoolApplication & {
  startupProfile?: StartupProfile;
  investmentPool?: InvestmentPool;
  program?: (Program & { tranches: Tranche[] }) | null;
};

const parseDate = (value: string, field: string): Date => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "invalid_milestone_period", `${field} is not a valid date`);
  }
  return date;
};

const ensureTrancheTotal = (
  approvedAmount: string,
  tranches: ApproveStartupPoolApplicationRequest["tranches"]
): void => {
  const total = tranches.reduce((sum, tranche) => sum + BigInt(tranche.amount), 0n);
  if (total !== BigInt(approvedAmount)) {
    throw new ApiError(
      400,
      "tranche_total_mismatch",
      "Milestone tranche amounts must equal the approved amount"
    );
  }
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

const toProgramDto = (program: Program): ProgramDto => ({
  id: program.id,
  programKey: program.programKey,
  sponsorWallet: program.sponsorWallet,
  projectWallet: program.projectWallet,
  assetContract: program.assetContract,
  totalAmount: amountToString(program.totalAmount),
  fundedAmount: amountToString(program.fundedAmount),
  status: program.status,
  eligibilityPolicyId: program.eligibilityPolicyId,
  createdAt: program.createdAt.toISOString(),
  updatedAt: program.updatedAt.toISOString()
});

const toTrancheDto = (tranche: Tranche): TrancheDto => ({
  id: tranche.id,
  programId: tranche.programId,
  milestoneKey: tranche.milestoneKey,
  milestonePolicyId: tranche.milestonePolicyId,
  amount: amountToString(tranche.amount),
  releaseToWallet: tranche.releaseToWallet,
  mrrThresholdCents: tranche.mrrThresholdCents
    ? amountToString(tranche.mrrThresholdCents)
    : null,
  mrrCurrency: tranche.mrrCurrency,
  mrrPeriodStart: tranche.mrrPeriodStart?.toISOString() ?? null,
  mrrPeriodEnd: tranche.mrrPeriodEnd?.toISOString() ?? null,
  status: tranche.status,
  releasedAt: tranche.releasedAt?.toISOString() ?? null,
  txHash: tranche.txHash
});

const toStartupPoolApplicationDto = (
  application: ApplicationWithRelations
): StartupPoolApplicationDto => ({
  id: application.id,
  founderWallet: application.founderWallet,
  startupProfileId: application.startupProfileId,
  investmentPoolId: application.investmentPoolId,
  programId: application.programId,
  note: application.note,
  status: application.status,
  startupProfile: application.startupProfile
    ? toStartupProfileDto(application.startupProfile)
    : undefined,
  investmentPool: application.investmentPool
    ? toInvestmentPoolDto(application.investmentPool)
    : undefined,
  program: application.program ? toProgramDto(application.program) : undefined,
  tranches: application.program?.tranches.map(toTrancheDto),
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
    const [profile, pool, existingApplication] = await Promise.all([
      prisma.startupProfile.findUnique({
        where: { id: input.startupProfileId }
      }),
      prisma.investmentPool.findUnique({
        where: { id: investmentPoolId }
      }),
      prisma.startupPoolApplication.findUnique({
        where: {
          startupProfileId_investmentPoolId: {
            startupProfileId: input.startupProfileId,
            investmentPoolId
          }
        }
      })
    ]);
    if (!profile || profile.founderWallet !== wallet) {
      throw new ApiError(404, "startup_not_found", "Startup profile was not found");
    }
    if (!pool || pool.status !== "Open") {
      throw new ApiError(404, "investment_pool_not_found", "Investment pool was not found");
    }
    if (existingApplication?.status === "Accepted" || existingApplication?.programId) {
      throw new ApiError(
        400,
        "application_already_accepted",
        "Accepted application cannot be resubmitted"
      );
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
      include: {
        investmentPool: true,
        startupProfile: true,
        program: {
          include: {
            tranches: {
              orderBy: { milestoneKey: "asc" }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return applications.map(toStartupPoolApplicationDto);
  }

  public async listInvestorPoolApplications(
    investorWallet: string,
    isAdmin = false
  ): Promise<StartupPoolApplicationDto[]> {
    const applications = await prisma.startupPoolApplication.findMany({
      where: isAdmin
        ? {}
        : {
            investmentPool: {
              ownerWallet: normalizeWallet(investorWallet)
            }
          },
      include: {
        investmentPool: true,
        startupProfile: true,
        program: {
          include: {
            tranches: {
              orderBy: { milestoneKey: "asc" }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return applications.map(toStartupPoolApplicationDto);
  }

  public async approvePoolApplication(
    approverWallet: string,
    applicationId: string,
    input: ApproveStartupPoolApplicationRequest,
    isAdmin = false
  ): Promise<StartupPoolApplicationDto> {
    const wallet = normalizeWallet(approverWallet);
    ensureTrancheTotal(input.approvedAmount, input.tranches);

    const application = await prisma.$transaction(async (tx) => {
      const existing = await tx.startupPoolApplication.findUnique({
        where: { id: applicationId },
        include: {
          investmentPool: true,
          startupProfile: true,
          program: {
            include: {
              tranches: {
                orderBy: { milestoneKey: "asc" }
              }
            }
          }
        }
      });
      if (!existing) {
        throw new ApiError(404, "application_not_found", "Application was not found");
      }
      if (!isAdmin && normalizeWallet(existing.investmentPool.ownerWallet) !== wallet) {
        throw new ApiError(403, "application_forbidden", "Wallet cannot approve this application");
      }
      if (existing.programId || existing.status === "Accepted") {
        throw new ApiError(400, "application_already_accepted", "Application is already accepted");
      }
      if (existing.status === "Rejected") {
        throw new ApiError(400, "application_rejected", "Rejected application cannot be approved");
      }

      const program = await tx.program.create({
        data: {
          programKey: `marketplace-${existing.id}`,
          sponsorWallet: normalizeWallet(existing.investmentPool.ownerWallet),
          projectWallet: normalizeWallet(existing.startupProfile.founderWallet),
          assetContract: input.assetContract.trim(),
          totalAmount: input.approvedAmount,
          fundedAmount: input.approvedAmount,
          status: "Active",
          eligibilityPolicyId: input.eligibilityPolicyId.trim(),
          tranches: {
            create: input.tranches.map((tranche) => {
              const periodStart = parseDate(tranche.mrrPeriodStart, "mrrPeriodStart");
              const periodEnd = parseDate(tranche.mrrPeriodEnd, "mrrPeriodEnd");
              if (periodEnd.getTime() <= periodStart.getTime()) {
                throw new ApiError(
                  400,
                  "invalid_milestone_period",
                  "mrrPeriodEnd must be after mrrPeriodStart"
                );
              }

              return {
                milestoneKey: tranche.milestoneKey.trim(),
                milestonePolicyId: tranche.milestonePolicyId.trim(),
                amount: tranche.amount,
                releaseToWallet: normalizeWallet(tranche.releaseToWallet),
                mrrThresholdCents: tranche.mrrThresholdCents,
                mrrCurrency: tranche.mrrCurrency.trim().toLowerCase(),
                mrrPeriodStart: periodStart,
                mrrPeriodEnd: periodEnd,
                status: "Locked" as const
              };
            })
          }
        },
        include: {
          tranches: {
            orderBy: { milestoneKey: "asc" }
          }
        }
      });

      return tx.startupPoolApplication.update({
        where: { id: existing.id },
        data: {
          status: "Accepted",
          programId: program.id
        },
        include: {
          investmentPool: true,
          startupProfile: true,
          program: {
            include: {
              tranches: {
                orderBy: { milestoneKey: "asc" }
              }
            }
          }
        }
      });
    });

    try {
      if (!application.program) {
        throw new ApiError(500, "program_create_failed", "Program was not created");
      }
      await escrowContractService.createAndActivateProgram({
        program: toProgramDto(application.program),
        tranches: application.program.tranches.map(toTrancheDto)
      });
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        await tx.startupPoolApplication.update({
          where: { id: application.id },
          data: {
            status: "Reviewed",
            programId: null
          }
        });
        if (application.programId) {
          await tx.tranche.deleteMany({
            where: { programId: application.programId }
          });
          await tx.program.delete({
            where: { id: application.programId }
          });
        }
      });

      if (error instanceof SmartContractNotConfiguredError) {
        throw new ApiError(
          400,
          "smart_contract_not_configured",
          "Smart contract release is not configured"
        );
      }
      throw new ApiError(
        502,
        "smart_contract_program_setup_failed",
        error instanceof Error ? error.message : "Smart contract program setup failed"
      );
    }

    return toStartupPoolApplicationDto(application);
  }

  public async rejectPoolApplication(
    approverWallet: string,
    applicationId: string,
    isAdmin = false
  ): Promise<StartupPoolApplicationDto> {
    const wallet = normalizeWallet(approverWallet);
    const existing = await prisma.startupPoolApplication.findUnique({
      where: { id: applicationId },
      include: {
        investmentPool: true,
        startupProfile: true,
        program: {
          include: {
            tranches: {
              orderBy: { milestoneKey: "asc" }
            }
          }
        }
      }
    });
    if (!existing) {
      throw new ApiError(404, "application_not_found", "Application was not found");
    }
    if (!isAdmin && normalizeWallet(existing.investmentPool.ownerWallet) !== wallet) {
      throw new ApiError(403, "application_forbidden", "Wallet cannot reject this application");
    }
    if (existing.status === "Accepted") {
      throw new ApiError(400, "application_already_accepted", "Accepted application cannot be rejected");
    }

    const application = await prisma.startupPoolApplication.update({
      where: { id: existing.id },
      data: { status: "Rejected" },
      include: {
        investmentPool: true,
        startupProfile: true,
        program: {
          include: {
            tranches: {
              orderBy: { milestoneKey: "asc" }
            }
          }
        }
      }
    });

    return toStartupPoolApplicationDto(application);
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
