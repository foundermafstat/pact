"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Loader2Icon, WalletCardsIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AuthProvider, useAuth } from "./auth-provider";

function LandingConnectButtonContent() {
  const { connect, error, isLoading, session } = useAuth();

  useEffect(() => {
    if (error) {
      toast.error("Login failed", { description: error });
    }
  }, [error]);

  if (session) {
    const wallet = session.user.wallet;
    const label = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;

    return (
      <Button asChild className="template-connect-button" variant="ghost">
        <Link href="/dashboard">{label}</Link>
      </Button>
    );
  }

  return (
    <Button
      className="template-connect-button"
      disabled={isLoading}
      onClick={() => void connect("freighter")}
      type="button"
      variant="ghost"
    >
      {isLoading ? (
        <Loader2Icon className="animate-spin" data-icon="inline-start" />
      ) : (
        <WalletCardsIcon data-icon="inline-start" />
      )}
      Connect
    </Button>
  );
}

export function LandingConnectButton() {
  return (
    <AuthProvider>
      <LandingConnectButtonContent />
    </AuthProvider>
  );
}
