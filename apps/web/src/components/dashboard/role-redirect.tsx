"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { useAdminPanelStore } from "@/stores/admin-panel-store";

export function RoleRedirect() {
  const router = useRouter();
  const { user } = useAuth();
  const setMode = useAdminPanelStore((state) => state.setMode);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (user.roles.includes("Admin")) {
      setMode("admin");
      router.replace("/dashboard/admin/rbac");
      return;
    }
    if (user.roles.includes("Project")) {
      setMode("startup");
      router.replace("/dashboard/startup");
      return;
    }
    if (user.roles.includes("Investor") || user.roles.includes("Sponsor")) {
      setMode("investor");
      router.replace("/dashboard/investor");
      return;
    }
    if (user.roles.includes("Issuer")) {
      router.replace("/dashboard/admin/issuer");
      return;
    }
    if (user.roles.includes("Attestor")) {
      router.replace("/dashboard/admin/attestor");
      return;
    }
    if (user.roles.includes("Observer")) {
      router.replace("/dashboard/audit");
      return;
    }
    router.replace("/dashboard/investor");
  }, [router, setMode, user]);

  return (
    <div className="text-sm text-muted-foreground">
      Select a dashboard from the sidebar.
    </div>
  );
}
