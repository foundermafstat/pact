"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { ReactNode } from "react";
import type { AuthSessionDto, AuthUserDto, Role } from "@pact/shared";

import { webEnv } from "@/config/env";
import { PactApiClient } from "@/lib/api-client";

type WalletProvider = "freighter" | "stellar-wallets-kit";

const normalizeWalletAddress = (address: string): string => address.trim().toUpperCase();

type AuthContextValue = {
  user: AuthUserDto | null;
  session: AuthSessionDto | null;
  isLoading: boolean;
  error: string | null;
  connect: (provider: WalletProvider) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  selectRole: (role: Extract<Role, "Investor" | "Project">) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const readFreighterAddress = async (): Promise<string> => {
  const { isConnected, requestAccess } = await import("@stellar/freighter-api");
  const status = await isConnected();
  if (!status.isConnected) {
    throw new Error("Freighter extension is not available");
  }

  const result = await requestAccess();
  if (result.error || !result.address) {
    throw new Error(result.error?.message ?? "Freighter access was rejected");
  }

  return normalizeWalletAddress(result.address);
};

const signWithFreighter = async (message: string, address: string): Promise<string> => {
  const { signMessage } = await import("@stellar/freighter-api");
  const result = await signMessage(message, { address });
  if (result.error || !result.signedMessage) {
    throw new Error(result.error?.message ?? "Freighter signature was rejected");
  }

  if (typeof result.signedMessage === "string") {
    return result.signedMessage;
  }

  const bytes = new Uint8Array(result.signedMessage);
  return btoa(String.fromCharCode(...bytes));
};

const readWalletKitAddress = async (): Promise<{
  address: string;
  signMessage: (message: string) => Promise<string>;
}> => {
  const [{ StellarWalletsKit }, { defaultModules }] = await Promise.all([
    import("@creit.tech/stellar-wallets-kit/sdk"),
    import("@creit.tech/stellar-wallets-kit/modules/utils")
  ]);

  StellarWalletsKit.init({
    modules: defaultModules()
  });

  const { address } = await StellarWalletsKit.authModal();
  const wallet = normalizeWalletAddress(address);
  return {
    address: wallet,
    signMessage: async (message: string) => {
      const result = await StellarWalletsKit.signMessage(message, { address: wallet });
      if (!result.signedMessage) {
        throw new Error("Selected wallet cannot sign login messages");
      }
      return result.signedMessage;
    }
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [session, setSession] = useState<AuthSessionDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await client.getCurrentSession();
      setSession(response.data);
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = useCallback(
    async (provider: WalletProvider) => {
      setIsLoading(true);
      setError(null);
      try {
        let address: string;
        let signature: string;
        if (provider === "freighter") {
          address = normalizeWalletAddress(await readFreighterAddress());
          const challenge = await client.createAuthChallenge({
            wallet: address,
            walletProvider: provider
          });
          signature = await signWithFreighter(challenge.data.message, address);
          const verified = await client.verifyAuthChallenge({
            challengeId: challenge.data.challengeId,
            wallet: address,
            signature,
            walletProvider: provider
          });
          setSession(verified.data);
          return;
        }

        const walletKit = await readWalletKitAddress();
        address = normalizeWalletAddress(walletKit.address);
        const challenge = await client.createAuthChallenge({
          wallet: address,
          walletProvider: provider
        });
        signature = await walletKit.signMessage(challenge.data.message);
        const verified = await client.verifyAuthChallenge({
          challengeId: challenge.data.challengeId,
          wallet: address,
          signature,
          walletProvider: provider
        });
        setSession(verified.data);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Wallet login failed");
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await client.logout();
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const selectRole = useCallback(
    async (role: Extract<Role, "Investor" | "Project">) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await client.selectAccountRole({ role });
        setSession(response.data);
        return true;
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not select role");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      error,
      connect,
      logout,
      refresh,
      selectRole
    }),
    [connect, error, isLoading, logout, refresh, selectRole, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
