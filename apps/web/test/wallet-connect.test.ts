import { describe, expect, it } from "vitest";

import {
  getWalletNetworkWarning,
  type WalletState
} from "../src/components/wallet-utils";

describe("wallet connection helpers", () => {
  it("reports network mismatch without secret material", () => {
    const wallet: WalletState = {
      publicKey: "GDEMO7Y4XPACTPUBLICKEY",
      network: "mainnet"
    };

    expect(getWalletNetworkWarning(wallet, "testnet")).toBe(
      "Wallet network mainnet does not match testnet"
    );
    expect(JSON.stringify(wallet)).not.toContain("secret");
  });

  it("does not warn for disconnected or matching wallets", () => {
    expect(
      getWalletNetworkWarning({ publicKey: null, network: null }, "testnet")
    ).toBeNull();
    expect(
      getWalletNetworkWarning(
        { publicKey: "GDEMO7Y4XPACTPUBLICKEY", network: "testnet" },
        "testnet"
      )
    ).toBeNull();
  });
});
