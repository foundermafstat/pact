import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
