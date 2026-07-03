import { RoleGate } from "@/components/auth/role-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { StartupProfilePanel } from "@/features/marketplace/startup-profile-panel";

export default function StartupDashboardPage() {
  return (
    <RoleGate roles={["Project"]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Startup dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Place your startup and request investment.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Startup placement</CardTitle>
            <CardDescription>Save startup characteristics and investment requirements.</CardDescription>
          </CardHeader>
          <CardContent>
            <StartupProfilePanel />
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
