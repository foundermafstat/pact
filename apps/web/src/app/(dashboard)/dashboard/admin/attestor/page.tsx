import { RoleGate } from "@/components/auth/role-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { AttestorConsole } from "@/features/attestor/attestor-console";

export default function AttestorAdminPage() {
  return (
    <RoleGate roles={["Attestor"]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Attestor console</h1>
          <p className="text-sm text-muted-foreground">
            Validate private milestone evidence and publish roots.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Milestone attestation operations</CardTitle>
            <CardDescription>Attestor-only milestone evidence lifecycle.</CardDescription>
          </CardHeader>
          <CardContent>
            <AttestorConsole />
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
