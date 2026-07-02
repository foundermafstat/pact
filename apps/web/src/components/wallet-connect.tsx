"use client";

import { useMemo, useState } from "react";

import {
  getWalletNetworkWarning,
  type WalletState
} from "./wallet-utils";

export function WalletConnect({ targetNetwork }: { targetNetwork: string }) {
  const [wallet, setWallet] = useState<WalletState>({
    publicKey: null,
    network: null
  });
  const warning = useMemo(
    () => getWalletNetworkWarning(wallet, targetNetwork),
    [wallet, targetNetwork]
  );

  if (!wallet.publicKey) {
    return (
      <button
        className="wallet-button"
        type="button"
        onClick={() =>
          setWallet({
            publicKey: "GDEMO7Y4XPACTPUBLICKEY",
            network: "testnet"
          })
        }
      >
        Connect wallet
      </button>
    );
  }

  return (
    <div className="wallet-panel">
      <span>{wallet.publicKey}</span>
      {warning ? <strong>{warning}</strong> : null}
      <button
        className="wallet-button"
        type="button"
        onClick={() => setWallet({ publicKey: null, network: null })}
      >
        Disconnect
      </button>
    </div>
  );
}
