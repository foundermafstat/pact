"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Role, WalletRoleDto } from "@pact/shared";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { webEnv } from "@/config/env";
import { PactApiClient, PactApiClientError } from "@/lib/api-client";

const roles: Role[] = [
  "Investor",
  "Project",
  "Issuer",
  "Attestor",
  "Observer",
  "Admin",
  "Sponsor"
];

export function RbacPanel() {
  const client = useMemo(() => new PactApiClient(webEnv.apiUrl), []);
  const [rows, setRows] = useState<WalletRoleDto[]>([]);
  const [wallet, setWallet] = useState("");
  const [role, setRole] = useState<Role>("Investor");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      try {
        const response = await client.listWalletRoles();
        setRows(response.data);
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Could not load wallet roles"
        );
      }
    });
  };

  useEffect(() => {
    load();
  }, []);

  const assign = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await client.assignWalletRole({ wallet, role });
        setRows((current) => {
          const next = current.filter((item) => item.wallet !== response.data.wallet);
          return [response.data, ...next];
        });
        setWallet("");
      } catch (caughtError) {
        setError(
          caughtError instanceof PactApiClientError
            ? caughtError.message
            : "Could not assign wallet role"
        );
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">RBAC</h1>
        <p className="text-sm text-muted-foreground">
          Assign dashboard roles to Stellar wallet addresses.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Assign role</CardTitle>
          <CardDescription>Admin-only wallet role management.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wallet">Wallet</Label>
              <Input
                id="wallet"
                onChange={(event) => setWallet(event.target.value)}
                placeholder="G..."
                value={wallet}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Select onValueChange={(value) => setRole(value as Role)} value={role}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {roles.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "Project" ? "Startup" : item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <Button disabled={isPending || !wallet} onClick={assign} type="button">
              Assign
            </Button>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>RBAC error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Wallet roles</CardTitle>
          <CardDescription>Current role assignments stored in PostgreSQL.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wallet</TableHead>
                <TableHead>Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.wallet}>
                  <TableCell className="font-mono text-xs">{row.wallet}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.roles.map((item) => (
                        <Badge key={item} variant="secondary">
                          {item === "Project" ? "Startup" : item}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
