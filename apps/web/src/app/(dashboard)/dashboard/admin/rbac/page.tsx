import { RoleGate } from "@/components/auth/role-gate";
import { RbacPanel } from "@/components/dashboard/rbac-panel";

export default function RbacAdminPage() {
  return (
    <RoleGate roles={["Admin"]}>
      <RbacPanel />
    </RoleGate>
  );
}
