import { RoleGate } from "@/components/auth/role-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateProgramForm } from "@/features/sponsor/create-program-form";
import { FundProgramPanel } from "@/features/sponsor/fund-program-panel";
import { TrancheStatusTable } from "@/features/sponsor/tranche-status-table";

export default function InvestorDashboardPage() {
  return (
    <RoleGate roles={["Investor", "Sponsor"]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Investor dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Create, fund, and activate escrow programs.
          </p>
        </div>
        <Tabs defaultValue="create">
          <TabsList>
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="fund">Funding</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create program</CardTitle>
                <CardDescription>Program terms become public anchors.</CardDescription>
              </CardHeader>
              <CardContent>
                <CreateProgramForm />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="fund">
            <Card>
              <CardHeader>
                <CardTitle>Funding</CardTitle>
                <CardDescription>Fund and activate an escrow program.</CardDescription>
              </CardHeader>
              <CardContent>
                <FundProgramPanel />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>Milestone status</CardTitle>
                <CardDescription>Review tranche release state.</CardDescription>
              </CardHeader>
              <CardContent>
                <TrancheStatusTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
