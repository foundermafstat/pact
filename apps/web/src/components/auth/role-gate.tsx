"use client";

import type { Role } from "@pact/shared";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "./auth-provider";

export function RoleGate({
  roles,
  children
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  const allowed =
    user?.roles.includes("Admin") || roles.some((role) => user?.roles.includes(role));

  if (!allowed) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Access denied</AlertTitle>
        <AlertDescription>
          Your wallet does not have the required dashboard role.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}
