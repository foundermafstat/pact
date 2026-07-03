import { RoleGate } from "@/components/auth/role-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EligibilityPanel } from "@/features/project/eligibility-panel";
import { MilestonePanel } from "@/features/project/milestone-panel";

export default function StartupDashboardPage() {
  return (
    <RoleGate roles={["Project"]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Startup dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Run private eligibility and milestone proof flows.
          </p>
        </div>
        <Tabs defaultValue="eligibility">
          <TabsList>
            <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
            <TabsTrigger value="milestone">Milestone payout</TabsTrigger>
          </TabsList>
          <TabsContent value="eligibility">
            <Card>
              <CardHeader>
                <CardTitle>Eligibility proof</CardTitle>
                <CardDescription>Generate a private KYB eligibility proof.</CardDescription>
              </CardHeader>
              <CardContent>
                <EligibilityPanel />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="milestone">
            <Card>
              <CardHeader>
                <CardTitle>Milestone unlock</CardTitle>
                <CardDescription>Generate proof input and submit payout proof.</CardDescription>
              </CardHeader>
              <CardContent>
                <MilestonePanel />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
