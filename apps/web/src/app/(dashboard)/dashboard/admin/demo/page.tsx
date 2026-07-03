import { RoleGate } from "@/components/auth/role-gate";
import { DemoReadinessPanel } from "@/features/demo/demo-readiness-panel";

export default function AdminDemoPage() {
  return (
    <RoleGate roles={["Admin"]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Judge demo control center</h1>
          <p className="text-sm text-muted-foreground">
            Guided happy path, readiness checks and explorer-linked tranche releases.
          </p>
        </div>
        <DemoReadinessPanel />
      </div>
    </RoleGate>
  );
}
