"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

export function RoleRedirect() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      return;
    }
    if (user.roles.includes("Project")) {
      router.replace("/dashboard/startup");
      return;
    }
    if (user.roles.includes("Investor") || user.roles.includes("Sponsor")) {
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
    if (user.roles.includes("Admin")) {
      router.replace("/dashboard/admin/rbac");
      return;
    }
    router.replace("/dashboard/investor");
  }, [router, user]);

  return (
    <div className="text-sm text-muted-foreground">
      Select a dashboard from the sidebar.
    </div>
  );
}
