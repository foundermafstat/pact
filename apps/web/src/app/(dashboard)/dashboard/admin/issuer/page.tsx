import { RoleGate } from "@/components/auth/role-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { IssuerConsole } from "@/features/issuer/issuer-console";

export default function IssuerAdminPage() {
  return (
    <RoleGate roles={["Issuer"]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Issuer console</h1>
          <p className="text-sm text-muted-foreground">
            Issue signed KYB credentials and publish durable roots.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Credential root operations</CardTitle>
            <CardDescription>Issuer-only credential lifecycle actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <IssuerConsole />
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
