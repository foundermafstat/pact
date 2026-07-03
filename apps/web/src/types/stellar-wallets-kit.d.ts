declare module "@creit.tech/stellar-wallets-kit/sdk" {
  export const StellarWalletsKit: {
    init(params: { modules: unknown[]; selectedWalletId?: string; network?: string }): void;
    authModal(): Promise<{ address: string }>;
    signMessage(
      message: string,
      opts?: { address?: string; networkPassphrase?: string }
    ): Promise<{ signedMessage?: string; signerAddress?: string }>;
    disconnect(): Promise<void>;
  };
}

declare module "@creit.tech/stellar-wallets-kit/modules/utils" {
  export function defaultModules(): unknown[];
}
