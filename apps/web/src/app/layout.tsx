import type { Metadata } from "next";

import { AppShell } from "../components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pact MVP",
  description: "Private proof and public accountability demo",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/pact-logo-gradient.svg", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.ico"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
