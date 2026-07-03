import { RoleGate } from "@/components/auth/role-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { InvestorMarketplacePanel } from "@/features/marketplace/investor-marketplace-panel";

export default function InvestorDashboardPage() {
  return (
    <RoleGate roles={["Investor", "Sponsor"]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Investor dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Review startups and create investment or grant pools.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Investment pool</CardTitle>
            <CardDescription>Store pool terms and startup demand from the database.</CardDescription>
          </CardHeader>
          <CardContent>
            <InvestorMarketplacePanel />
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
