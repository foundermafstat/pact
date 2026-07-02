"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { webEnv } from "../config/env";
import { WalletConnect } from "./wallet-connect";

const navItems = [
  ["Landing", "/"],
  ["Sponsor", "/sponsor"],
  ["Project", "/project"],
  ["Issuer", "/issuer"],
  ["Attestor", "/attestor"],
  ["Audit", "/audit"]
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return children;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/pact-logo-gradient.svg" alt="" aria-hidden="true" />
          <strong>Pact</strong>
          <span>Milestone escrow MVP</span>
        </div>
        <nav className="nav" aria-label="Pact demo navigation">
          {navItems.map(([label, href]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">
        <div className="topbar">
          <small>Network: {webEnv.stellarNetwork}</small>
          <div className="topbar-actions">
            <small>API: {webEnv.apiUrl}</small>
            <WalletConnect targetNetwork={webEnv.stellarNetwork} />
          </div>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
