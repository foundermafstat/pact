"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@pact/shared";
import { useEffect, type ReactNode } from "react";
import {
  BadgeCheckIcon,
  Building2Icon,
  ChevronDownIcon,
  ClipboardListIcon,
  HomeIcon,
  LogOutIcon,
  SearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  WalletCardsIcon
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AuthProvider, useAuth } from "@/components/auth/auth-provider";
import { WalletLogin } from "@/components/auth/wallet-login";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { webEnv } from "@/config/env";

type NavItem = {
  href: string;
  label: string;
  roles: Role[];
  icon: LucideIcon;
};

const navSections: Array<{
  label: string;
  items: NavItem[];
}> = [
  {
    label: "Workspace",
    items: [
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
      }
    ]
  },
  {
    label: "Trust Operations",
    items: [
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
      }
    ]
  },
  {
    label: "Administration",
    items: [
      {
        href: "/dashboard/admin/rbac",
        label: "RBAC",
        roles: ["Admin"],
        icon: Settings2Icon
      }
    ]
  }
];

function roleAllows(userRoles: Role[], allowedRoles: Role[]) {
  return userRoles.includes("Admin") || allowedRoles.some((role) => userRoles.includes(role));
}

function formatRole(role: Role) {
  return role === "Project" ? "Startup" : role;
}

function formatWallet(wallet: string) {
  return `${wallet.slice(0, 5)}...${wallet.slice(-5)}`;
}

function useDashboardTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const hadDashboardTheme = root.classList.contains("dashboard-theme");

    root.classList.add("dark", "dashboard-theme");

    return () => {
      if (!hadDashboardTheme) {
        root.classList.remove("dashboard-theme");
      }
      if (!hadDark) {
        root.classList.remove("dark");
      }
    };
  }, []);
}

function DashboardContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading session
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <WalletLogin />
      </div>
    );
  }

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => roleAllows(user.roles, item.roles))
    }))
    .filter((section) => section.items.length > 0);
  const activeItem = visibleSections
    .flatMap((section) => section.items)
    .find((item) => pathname === item.href);
  const primaryRole = formatRole(user.primaryRole);

  return (
    <SidebarProvider>
      <Sidebar className="relative">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="h-11">
                <Link href="/dashboard">
                  <span className="flex aspect-square size-9 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent">
                    <img className="size-7" src="/pact-logo-gradient.svg" alt="" />
                  </span>
                  <span data-sidebar-label className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold leading-none">Pact</span>
                    <span className="truncate text-xs text-muted-foreground">Admin console</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {visibleSections.map((section) => (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu aria-label={`${section.label} navigation`}>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link aria-current={isActive ? "page" : undefined} href={item.href}>
                            <Icon data-icon="inline-start" />
                            <span data-sidebar-label>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="h-12">
                    <Avatar className="size-8 border border-sidebar-border">
                      <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                        {user.wallet.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span data-sidebar-label className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{formatWallet(user.wallet)}</span>
                      <span className="truncate text-xs text-muted-foreground">{primaryRole}</span>
                    </span>
                    <ChevronDownIcon data-icon="inline-end" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-72 rounded-xl"
                  side="right"
                  sideOffset={8}
                >
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-2">
                      <div className="truncate text-sm font-medium">{user.wallet}</div>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={role} variant="secondary">
                            {formatRole(role)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">
                        <HomeIcon data-icon="inline-start" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    {user.roles.includes("Admin") ? (
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/admin/rbac">
                          <Settings2Icon data-icon="inline-start" />
                          Role access
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void logout()}>
                    <LogOutIcon data-icon="inline-start" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SidebarTrigger />
            <Separator className="h-4" orientation="vertical" />
            <div className="dashboard-search hidden h-9 w-full max-w-sm items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground md:flex">
              <SearchIcon data-icon="inline-start" />
              <span className="truncate">Search workspace</span>
            </div>
            <div className="min-w-0 md:hidden">
              <div className="truncate text-sm font-medium">{activeItem?.label ?? "Dashboard"}</div>
              <div className="text-xs text-muted-foreground">Role-based Pact workspace</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Network: {webEnv.stellarNetwork}</Badge>
            <Button asChild size="sm" variant="ghost">
              <Link href="/">Landing</Link>
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 xl:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  useDashboardTheme();

  return (
    <div className="dashboard-shell bg-background text-foreground">
      <div className="dashboard-frame">
        <AuthProvider>
          <DashboardContent>{children}</DashboardContent>
        </AuthProvider>
      </div>
    </div>
  );
}
