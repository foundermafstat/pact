"use client";

import { Loader2Icon, WalletCardsIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "./auth-provider";

export function WalletLogin() {
  const { connect, error, isLoading } = useAuth();

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Wallet authorization</CardTitle>
        <CardDescription>
          Connect a Stellar wallet to open the role-based dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button disabled={isLoading} onClick={() => void connect("freighter")} type="button">
          {isLoading ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <WalletCardsIcon data-icon="inline-start" />}
          Freighter
        </Button>
        <Button
          disabled={isLoading}
          onClick={() => void connect("stellar-wallets-kit")}
          type="button"
          variant="outline"
        >
          <WalletCardsIcon data-icon="inline-start" />
          Stellar Wallets Kit
        </Button>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Login failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
