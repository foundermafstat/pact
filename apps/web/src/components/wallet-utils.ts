export type WalletState = {
  publicKey: string | null;
  network: string | null;
};

export const getWalletNetworkWarning = (
  wallet: WalletState,
  targetNetwork: string
): string | null => {
  if (!wallet.publicKey || !wallet.network || wallet.network === targetNetwork) {
    return null;
  }

  return `Wallet network ${wallet.network} does not match ${targetNetwork}`;
};
