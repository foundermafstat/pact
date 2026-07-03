"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@pact/shared";
import type { ReactNode } from "react";
import {
  BadgeCheckIcon,
  Building2Icon,
  ClipboardListIcon,
  LogOutIcon,
  ShieldCheckIcon,
  WalletCardsIcon
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AuthProvider, useAuth } from "@/components/auth/auth-provider";
import { WalletLogin } from "@/components/auth/wallet-login";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarProvider
} from "@/components/ui/sidebar";
import { webEnv } from "@/config/env";
import { cn } from "@/lib/utils";

const navItems: Array<{
  href: string;
  label: string;
  roles: Role[];
  icon: LucideIcon;
}> = [
  {
    href: "/dashboard/investor",
    label: "Investor",
    roles: ["Investor", "Sponsor"],
    icon: WalletCardsIcon
  },
  {
    href: "/dashboard/startup",
    label: "Startup",
    roles: ["Project"],
    icon: Building2Icon
  },
  {
    href: "/dashboard/audit",
    label: "Audit",
    roles: ["Observer", "Investor", "Sponsor", "Project"],
    icon: ClipboardListIcon
  },
  {
    href: "/dashboard/admin/issuer",
    label: "Issuer",
    roles: ["Issuer"],
    icon: BadgeCheckIcon
  },
  {
    href: "/dashboard/admin/attestor",
    label: "Attestor",
    roles: ["Attestor"],
    icon: ShieldCheckIcon
  },
  {
    href: "/dashboard/admin/rbac",
    label: "RBAC",
    roles: ["Admin"],
    icon: ShieldCheckIcon
  }
];

function roleAllows(userRoles: Role[], allowedRoles: Role[]) {
  return userRoles.includes("Admin") || allowedRoles.some((role) => userRoles.includes(role));
}

function DashboardContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading session
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <WalletLogin />
      </div>
    );
  }

  const visibleNav = navItems.filter((item) => roleAllows(user.roles, item.roles));

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link className="flex items-center gap-3" href="/dashboard">
            <img className="size-9" src="/pact-logo-gradient.svg" alt="" />
            <div className="min-w-0">
              <div className="font-semibold leading-none">Pact</div>
              <div className="text-xs text-muted-foreground">Dashboard</div>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu aria-label="Dashboard navigation">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuButton
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={cn(pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground")}
                  href={item.href}
                  key={item.href}
                >
                  <Icon data-icon="inline-start" />
                  {item.label}
                </SidebarMenuButton>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{user.wallet.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user.wallet}</div>
              <div className="text-xs text-muted-foreground">{webEnv.stellarNetwork}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {user.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role === "Project" ? "Startup" : role}
              </Badge>
            ))}
          </div>
          <Button className="mt-3 w-full" onClick={() => void logout()} type="button" variant="outline">
            <LogOutIcon data-icon="inline-start" />
            Disconnect
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 md:px-6">
          <div className="text-sm text-muted-foreground">Network: {webEnv.stellarNetwork}</div>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/">
            Landing
          </Link>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Separator />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
}
