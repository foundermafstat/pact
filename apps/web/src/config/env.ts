export type WebEnv = {
  appUrl: string;
  apiUrl: string;
  stellarNetwork: string;
  rootRegistryContractId: string;
  milestoneEscrowContractId: string;
};

export const webEnv: WebEnv = {
  appUrl: process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000",
  apiUrl: process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000",
  stellarNetwork: process.env["NEXT_PUBLIC_STELLAR_NETWORK"] ?? "testnet",
  rootRegistryContractId: process.env["NEXT_PUBLIC_ROOT_REGISTRY_CONTRACT_ID"] ?? "",
  milestoneEscrowContractId:
    process.env["NEXT_PUBLIC_MILESTONE_ESCROW_CONTRACT_ID"] ?? ""
};
