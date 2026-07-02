import { describe, expect, it } from "vitest";

import { loadStellarConfig } from "../src/stellar/config";

describe("Stellar config", () => {
  it("loads local testnet defaults", () => {
    expect(loadStellarConfig({ APP_ENV: "local" })).toMatchObject({
      network: "testnet",
      networkPassphrase: "Test SDF Network ; September 2015",
      rpcUrl: "https://soroban-testnet.stellar.org",
      horizonUrl: "https://horizon-testnet.stellar.org"
    });
  });

  it("requires secret keys outside local/test environments", () => {
    expect(() =>
      loadStellarConfig({
        APP_ENV: "staging",
        STELLAR_NETWORK: "testnet",
        STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
        STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
        STELLAR_HORIZON_URL: "https://horizon-testnet.stellar.org"
      })
    ).toThrow("STELLAR_DEPLOYER_SECRET_KEY");
  });

  it("rejects unsupported network names", () => {
    expect(() =>
      loadStellarConfig({
        APP_ENV: "local",
        STELLAR_NETWORK: "devnet"
      })
    ).toThrow("Unsupported Stellar network");
  });
});
