import { RoleGate } from "@/components/auth/role-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { AttackPanel } from "@/features/attacks/attack-panel";
import { AuditView } from "@/features/audit/audit-view";

export default function DashboardAuditPage() {
  return (
    <RoleGate roles={["Observer", "Investor", "Sponsor", "Project"]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Audit view</h1>
          <p className="text-sm text-muted-foreground">
            Inspect public program status without private metrics.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Public audit</CardTitle>
            <CardDescription>Program, tranche, and public event status.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuditView />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attack simulation</CardTitle>
            <CardDescription>Validate privacy guardrails.</CardDescription>
          </CardHeader>
          <CardContent>
            <AttackPanel />
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
