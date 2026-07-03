import * as React from "react";

import { cn } from "@/lib/utils";

function SidebarProvider({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-provider"
      className={cn("bg-background flex min-h-svh w-full", className)}
      {...props}
    />
  );
}

function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      data-slot="sidebar"
      className={cn("bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 border-r md:flex md:flex-col", className)}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-header" className={cn("flex flex-col gap-2 p-4", className)} {...props} />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-content" className={cn("flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-3", className)} {...props} />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-footer" className={cn("border-t p-3", className)} {...props} />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main data-slot="sidebar-inset" className={cn("flex min-w-0 flex-1 flex-col", className)} {...props} />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav data-slot="sidebar-menu" className={cn("flex flex-col gap-1", className)} {...props} />
  );
}

function SidebarMenuButton({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      data-slot="sidebar-menu-button"
      className={cn("hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors", className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton
};
