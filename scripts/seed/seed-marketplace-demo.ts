import { prisma } from "../../apps/api/src/db/client";

type SeedRole = "Investor" | "Project" | "Sponsor";

const founders = {
  aima: "GFOUNDERAIMA0000000000000000000000000000000001",
  medvault: "GFOUNDERMED0000000000000000000000000000000002",
  carbongrid: "GFOUNDERCLIMATE00000000000000000000000000003",
  proofpay: "GFOUNDERPROOFPAY000000000000000000000000000004"
} as const;

const investors = {
  seed: "GINVESTORSEED0000000000000000000000000000001",
  angel: "GINVESTORANGEL00000000000000000000000000002",
  grant: "GINVESTORGRANT00000000000000000000000000003"
} as const;

const ensureAccount = async (wallet: string, roles: SeedRole[]) => {
  const account = await prisma.walletAccount.upsert({
    where: { wallet },
    update: {},
    create: { wallet }
  });

  await Promise.all(
    roles.map((role) =>
      prisma.walletRole.upsert({
        where: {
          walletAccountId_role: {
            walletAccountId: account.id,
            role
          }
        },
        update: {},
        create: {
          walletAccountId: account.id,
          role,
          grantedByWallet: "seed:marketplace"
        }
      })
    )
  );
};

const upsertStartup = async (data: {
  founderWallet: string;
  name: string;
  summary: string;
  industry: string;
  stage: string;
  website: string;
  requestedAmount: string;
  currency: string;
  fundingUse: string;
  requirements: string;
  traction: string;
}) => {
  const existing = await prisma.startupProfile.findFirst({
    where: {
      founderWallet: data.founderWallet,
      name: data.name
    }
  });
  const payload = {
    ...data,
    status: "Listed" as const
  };

  return existing
    ? prisma.startupProfile.update({
        where: { id: existing.id },
        data: payload
      })
    : prisma.startupProfile.create({
        data: payload
      });
};

const upsertPool = async (data: {
  ownerWallet: string;
  name: string;
  poolType: "Investment" | "Grant";
  thesis: string;
  targetIndustry: string;
  stages: string;
  totalAmount: string;
  currency: string;
  requirements: string;
}) => {
  const existing = await prisma.investmentPool.findFirst({
    where: {
      ownerWallet: data.ownerWallet,
      name: data.name
    }
  });
  const payload = {
    ...data,
    status: "Open" as const
  };

  return existing
    ? prisma.investmentPool.update({
        where: { id: existing.id },
        data: payload
      })
    : prisma.investmentPool.create({
        data: payload
      });
};

const upsertCommitment = async (data: {
  investorWallet: string;
  startupProfileId: string;
  amount: string;
  currency: string;
  note: string;
  status?: "Pending" | "Accepted";
}) => {
  const existing = await prisma.investmentCommitment.findFirst({
    where: {
      investorWallet: data.investorWallet,
      startupProfileId: data.startupProfileId,
      note: data.note
    }
  });
  const payload = {
    investorWallet: data.investorWallet,
    startupProfileId: data.startupProfileId,
    amount: data.amount,
    currency: data.currency,
    note: data.note,
    status: data.status ?? ("Pending" as const)
  };

  return existing
    ? prisma.investmentCommitment.update({
        where: { id: existing.id },
        data: payload
      })
    : prisma.investmentCommitment.create({
        data: payload
      });
};

const upsertApprovedProgram = async (data: {
  applicationId: string;
  sponsorWallet: string;
  projectWallet: string;
  assetContract: string;
  totalAmount: string;
  releaseToWallet: string;
}) => {
  const program = await prisma.program.upsert({
    where: { programKey: `marketplace-${data.applicationId}` },
    update: {
      sponsorWallet: data.sponsorWallet,
      projectWallet: data.projectWallet,
      assetContract: data.assetContract,
      totalAmount: data.totalAmount,
      fundedAmount: data.totalAmount,
      status: "Active",
      eligibilityPolicyId: "marketplace-eligibility"
    },
    create: {
      programKey: `marketplace-${data.applicationId}`,
      sponsorWallet: data.sponsorWallet,
      projectWallet: data.projectWallet,
      assetContract: data.assetContract,
      totalAmount: data.totalAmount,
      fundedAmount: data.totalAmount,
      status: "Active",
      eligibilityPolicyId: "marketplace-eligibility"
    }
  });

  await prisma.tranche.upsert({
    where: {
      programId_milestoneKey: {
        programId: program.id,
        milestoneKey: "M1"
      }
    },
    update: {
      milestonePolicyId: "stripe-mrr-policy",
      amount: data.totalAmount,
      releaseToWallet: data.releaseToWallet,
      mrrThresholdCents: "2500000",
      mrrCurrency: "usd",
      mrrPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
      mrrPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
      status: "Locked"
    },
    create: {
      programId: program.id,
      milestoneKey: "M1",
      milestonePolicyId: "stripe-mrr-policy",
      amount: data.totalAmount,
      releaseToWallet: data.releaseToWallet,
      mrrThresholdCents: "2500000",
      mrrCurrency: "usd",
      mrrPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
      mrrPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
      status: "Locked"
    }
  });

  await prisma.startupPoolApplication.update({
    where: { id: data.applicationId },
    data: {
      programId: program.id,
      status: "Accepted"
    }
  });
};

const main = async (): Promise<void> => {
  await Promise.all([
    ensureAccount(founders.aima, ["Project"]),
    ensureAccount(founders.medvault, ["Project"]),
    ensureAccount(founders.carbongrid, ["Project"]),
    ensureAccount(founders.proofpay, ["Project"]),
    ensureAccount(investors.seed, ["Investor"]),
    ensureAccount(investors.angel, ["Investor", "Sponsor"]),
    ensureAccount(investors.grant, ["Sponsor"])
  ]);

  const [aima, medvault, carbongrid, proofpay] = await Promise.all([
    upsertStartup({
      founderWallet: founders.aima,
      name: "Aima Agents",
      summary: "Revenue operations agents for regulated B2B teams.",
      industry: "AI automation",
      stage: "Seed",
      website: "https://aima.space",
      requestedAmount: "350000",
      currency: "USDC",
      fundingUse: "Hiring two engineers, customer pilots, and SOC2 preparation.",
      requirements: "Lead investor with B2B SaaS and compliance experience.",
      traction: "12 design partners, 42k MRR pipeline, three paid pilots."
    }),
    upsertStartup({
      founderWallet: founders.medvault,
      name: "MedVault",
      summary: "Private medical data vault with patient-owned access proofs.",
      industry: "Healthcare privacy",
      stage: "Pre-seed",
      website: "https://medvault.example",
      requestedAmount: "500000",
      currency: "USDC",
      fundingUse: "Clinical security audit, HIPAA counsel, and hospital pilot integration.",
      requirements: "Strategic investor or grant with privacy infrastructure mandate.",
      traction: "Two hospital LOIs and completed prototype for consent logging."
    }),
    upsertStartup({
      founderWallet: founders.carbongrid,
      name: "CarbonGrid",
      summary: "Sensor-backed carbon accounting for industrial facilities.",
      industry: "Climate infrastructure",
      stage: "Series A",
      website: "https://carbongrid.example",
      requestedAmount: "650000",
      currency: "USDC",
      fundingUse: "Manufacturing batch, field deployment, and data pipeline hardening.",
      requirements: "Climate hardware fund with follow-on capacity.",
      traction: "Seven deployed pilots, 1.8m verified sensor events, positive unit margin."
    }),
    upsertStartup({
      founderWallet: founders.proofpay,
      name: "ProofPay",
      summary: "ZK revenue attestations for milestone-based startup financing.",
      industry: "Fintech / ZK",
      stage: "Seed",
      website: "https://proofpay.example",
      requestedAmount: "420000",
      currency: "USDC",
      fundingUse: "Stripe Connect expansion, proof circuits, and issuer integrations.",
      requirements: "Investor familiar with payment data and zero-knowledge proofs.",
      traction: "Live testnet demo, Stripe OAuth prototype, and two funder pilots."
    })
  ]);

  const [aiSeedFund, climateSyndicate, zkGrant, impactGrant] = await Promise.all([
    upsertPool({
      ownerWallet: investors.seed,
      name: "AI Safety Seed Fund",
      poolType: "Investment",
      thesis: "Seed checks for AI infrastructure with auditable revenue and compliance workflows.",
      targetIndustry: "AI infrastructure",
      stages: "Initial SAFE 250000 USDC; seed close 500000 USDC after revenue proof.",
      totalAmount: "750000",
      currency: "USDC",
      requirements: "B2B pilots, founder KYB, and quarterly proof-based reporting."
    }),
    upsertPool({
      ownerWallet: investors.angel,
      name: "Climate Hardware Syndicate",
      poolType: "Investment",
      thesis: "Milestone-backed capital for climate hardware teams with measurable deployments.",
      targetIndustry: "Climate infrastructure",
      stages: "Prototype review 200000 USDC; pilot deployment 400000 USDC; scale 600000 USDC.",
      totalAmount: "1200000",
      currency: "USDC",
      requirements: "Field data, supply chain plan, and signed pilot customer."
    }),
    upsertPool({
      ownerWallet: investors.grant,
      name: "Open Source ZK Grant",
      poolType: "Grant",
      thesis: "Non-dilutive support for open source privacy and proof infrastructure.",
      targetIndustry: "ZK / privacy",
      stages: "Application review; milestone award; final open source audit.",
      totalAmount: "150000",
      currency: "USDC",
      requirements: "Public repo, permissive license, and published technical roadmap."
    }),
    upsertPool({
      ownerWallet: investors.grant,
      name: "Impact Pilot Grant",
      poolType: "Grant",
      thesis: "Small grants for healthcare and climate pilots with measurable public benefit.",
      targetIndustry: "Healthcare / climate",
      stages: "Pilot plan 25000 USDC; impact report 65000 USDC.",
      totalAmount: "90000",
      currency: "USDC",
      requirements: "Pilot partner, ethics review where applicable, and impact metrics."
    })
  ]);

  await Promise.all([
    upsertCommitment({
      investorWallet: investors.seed,
      startupProfileId: aima.id,
      amount: "150000",
      currency: "USDC",
      note: "Anchor check reserved after two paid pilots convert.",
      status: "Accepted"
    }),
    upsertCommitment({
      investorWallet: investors.angel,
      startupProfileId: carbongrid.id,
      amount: "300000",
      currency: "USDC",
      note: "Hardware tranche for verified deployment milestone.",
      status: "Accepted"
    }),
    upsertCommitment({
      investorWallet: investors.seed,
      startupProfileId: proofpay.id,
      amount: "125000",
      currency: "USDC",
      note: "Proof circuit completion and Stripe revenue snapshot review.",
      status: "Pending"
    }),
    upsertCommitment({
      investorWallet: investors.grant,
      startupProfileId: medvault.id,
      amount: "50000",
      currency: "USDC",
      note: "Privacy pilot support if open audit artifacts are published.",
      status: "Pending"
    })
  ]);

  await Promise.all([
    prisma.startupPoolApplication.upsert({
      where: {
        startupProfileId_investmentPoolId: {
          startupProfileId: aima.id,
          investmentPoolId: aiSeedFund.id
        }
      },
      update: {
        note: "Applying with current pilots and monthly revenue proof plan.",
        status: "Submitted"
      },
      create: {
        founderWallet: founders.aima,
        startupProfileId: aima.id,
        investmentPoolId: aiSeedFund.id,
        note: "Applying with current pilots and monthly revenue proof plan.",
        status: "Submitted"
      }
    }),
    prisma.startupPoolApplication.upsert({
      where: {
        startupProfileId_investmentPoolId: {
          startupProfileId: proofpay.id,
          investmentPoolId: zkGrant.id
        }
      },
      update: {
        note: "Grant request for open source Stripe revenue proof templates.",
        status: "Reviewed"
      },
      create: {
        founderWallet: founders.proofpay,
        startupProfileId: proofpay.id,
        investmentPoolId: zkGrant.id,
        note: "Grant request for open source Stripe revenue proof templates.",
        status: "Reviewed"
      }
    }),
    prisma.startupPoolApplication.upsert({
      where: {
        startupProfileId_investmentPoolId: {
          startupProfileId: carbongrid.id,
          investmentPoolId: climateSyndicate.id
        }
      },
      update: {
        note: "Syndicate application for scale tranche after pilot sensor audit.",
        status: "Accepted"
      },
      create: {
        founderWallet: founders.carbongrid,
        startupProfileId: carbongrid.id,
        investmentPoolId: climateSyndicate.id,
        note: "Syndicate application for scale tranche after pilot sensor audit.",
        status: "Accepted"
      }
    }),
    prisma.startupPoolApplication.upsert({
      where: {
        startupProfileId_investmentPoolId: {
          startupProfileId: medvault.id,
          investmentPoolId: impactGrant.id
        }
      },
      update: {
        note: "Pilot grant request for hospital consent proof deployment.",
        status: "Submitted"
      },
      create: {
        founderWallet: founders.medvault,
        startupProfileId: medvault.id,
        investmentPoolId: impactGrant.id,
        note: "Pilot grant request for hospital consent proof deployment.",
        status: "Submitted"
      }
    })
  ]);

  const acceptedClimateApplication = await prisma.startupPoolApplication.findUnique({
    where: {
      startupProfileId_investmentPoolId: {
        startupProfileId: carbongrid.id,
        investmentPoolId: climateSyndicate.id
      }
    }
  });
  if (acceptedClimateApplication) {
    await upsertApprovedProgram({
      applicationId: acceptedClimateApplication.id,
      sponsorWallet: investors.angel,
      projectWallet: founders.carbongrid,
      assetContract: "USDC",
      totalAmount: "400000",
      releaseToWallet: founders.carbongrid
    });
  }

  const [startupCount, poolCount, applicationCount, commitmentCount] = await Promise.all([
    prisma.startupProfile.count(),
    prisma.investmentPool.count(),
    prisma.startupPoolApplication.count(),
    prisma.investmentCommitment.count()
  ]);

  console.log(
    `Seeded marketplace demo data: ${startupCount} startups, ${poolCount} pools, ${applicationCount} applications, ${commitmentCount} commitments.`
  );
};

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
