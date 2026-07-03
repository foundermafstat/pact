"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { PanelLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  state: "expanded" | "collapsed";
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  className,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;

  const setOpen = React.useCallback(
    (value: boolean) => {
      onOpenChange?.(value);
      if (openProp === undefined) {
        setUncontrolledOpen(value);
      }
    },
    [onOpenChange, openProp]
  );

  const toggleSidebar = React.useCallback(() => setOpen(!open), [open, setOpen]);
  const state = open ? "expanded" : "collapsed";

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      open,
      setOpen,
      state,
      toggleSidebar
    }),
    [open, setOpen, state, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-provider"
        data-state={state}
        data-collapsible={state === "collapsed" ? "icon" : ""}
        className={cn(
          "group/sidebar-wrapper flex min-h-svh w-full bg-background text-foreground [--sidebar-width:16rem] [--sidebar-width-icon:4rem]",
          className
        )}
        {...props}
      />
    </SidebarContext.Provider>
  );
}

function Sidebar({
  className,
  collapsible = "icon",
  ...props
}: React.ComponentProps<"aside"> & {
  collapsible?: "icon" | "none";
}) {
  const { state } = useSidebar();
  const isCollapsed = collapsible === "icon" && state === "collapsed";

  return (
    <aside
      data-slot="sidebar"
      data-state={state}
      data-collapsible={isCollapsed ? "icon" : ""}
      className={cn(
        "group/sidebar hidden shrink-0 border-r bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out will-change-[width] md:flex md:flex-col",
        isCollapsed ? "w-[var(--sidebar-width-icon)]" : "w-[var(--sidebar-width)]",
        className
      )}
      {...props}
    />
  );
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("size-8", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon data-icon="inline-start" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      data-slot="sidebar-rail"
      aria-label="Toggle sidebar"
      tabIndex={-1}
      type="button"
      onClick={toggleSidebar}
      className={cn(
        "absolute inset-y-0 right-0 hidden w-4 translate-x-1/2 transition-colors duration-200 after:absolute after:inset-y-0 after:left-1/2 after:w-px hover:after:bg-sidebar-border md:block",
        className
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex min-h-14 flex-col gap-2 border-b p-2", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-2", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-footer" className={cn("border-t p-2", className)} {...props} />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn("flex min-w-0 flex-1 flex-col bg-background", className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-group" className={cn("flex flex-col gap-1", className)} {...props} />
  );
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "h-7 px-2 py-1 text-xs font-semibold text-muted-foreground transition-[height,opacity,padding] duration-200 group-data-[collapsible=icon]/sidebar-wrapper:h-0 group-data-[collapsible=icon]/sidebar-wrapper:overflow-hidden group-data-[collapsible=icon]/sidebar-wrapper:p-0 group-data-[collapsible=icon]/sidebar-wrapper:opacity-0",
        className
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-group-content" className={cn("flex flex-col gap-1", className)} {...props} />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul data-slot="sidebar-menu" className={cn("flex flex-col gap-1", className)} {...props} />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("relative", className)} {...props} />;
}

function SidebarMenuButton({
  asChild = false,
  className,
  isActive,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
}) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive ? "true" : undefined}
      className={cn(
        "flex h-10 w-full items-center gap-2 overflow-hidden rounded-xl border border-transparent px-2 text-left text-sm font-medium outline-none transition-[background-color,border-color,color,gap,padding] duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:border-sidebar-ring/40 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-5 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]/sidebar-wrapper:size-10 group-data-[collapsible=icon]/sidebar-wrapper:justify-center group-data-[collapsible=icon]/sidebar-wrapper:gap-0 group-data-[collapsible=icon]/sidebar-wrapper:px-0 group-data-[collapsible=icon]/sidebar-wrapper:[&>[data-sidebar-label]]:w-0 group-data-[collapsible=icon]/sidebar-wrapper:[&>[data-sidebar-label]]:-translate-x-2 group-data-[collapsible=icon]/sidebar-wrapper:[&>[data-sidebar-label]]:overflow-hidden group-data-[collapsible=icon]/sidebar-wrapper:[&>[data-sidebar-label]]:opacity-0 group-data-[collapsible=icon]/sidebar-wrapper:[&>[data-sidebar-label]]:transition-all group-data-[collapsible=icon]/sidebar-wrapper:[&>[data-sidebar-label]]:duration-200 group-data-[collapsible=icon]/sidebar-wrapper:[&>svg:last-child]:hidden",
        className
      )}
      {...props}
    />
  );
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-separator" className={cn("mx-2 h-px bg-sidebar-border", className)} {...props} />
  );
}

export {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar
};
