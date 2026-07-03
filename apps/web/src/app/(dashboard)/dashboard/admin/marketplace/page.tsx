import { RoleGate } from "@/components/auth/role-gate";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { InvestorMarketplacePanel } from "@/features/marketplace/investor-marketplace-panel";
import { StartupProfilePanel } from "@/features/marketplace/startup-profile-panel";

export default function AdminMarketplacePage() {
  return (
    <RoleGate roles={["Admin"]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Admin marketplace</h1>
          <p className="text-sm text-muted-foreground">
            Startup and investor workspaces in one administration view.
          </p>
        </div>
        <Tabs className="min-w-0" defaultValue="startup">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="startup">Startup workspace</TabsTrigger>
            <TabsTrigger value="investor">Investor workspace</TabsTrigger>
          </TabsList>
          <TabsContent className="min-w-0 pt-4" value="startup">
            <StartupProfilePanel />
          </TabsContent>
          <TabsContent className="min-w-0 pt-4" value="investor">
            <InvestorMarketplacePanel />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
