import type { Metadata } from "next";
import Link from "next/link";

import { WalletConnect } from "../components/wallet-connect";
import { webEnv } from "../config/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pact MVP",
  description: "Private proof and public accountability demo"
};

const navItems = [
  ["Landing", "/"],
  ["Sponsor", "/sponsor"],
  ["Project", "/project"],
  ["Issuer", "/issuer"],
  ["Attestor", "/attestor"],
  ["Audit", "/audit"]
] as const;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand">
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
      </body>
    </html>
  );
}
