import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { NextConfig } from "next";

try {
  const rootEnv = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
  for (const line of rootEnv.split(/\r?\n/)) {
    const match = /^(NEXT_PUBLIC_[A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2];
    }
  }
} catch {
  // Root env is optional for CI and package-local builds.
}

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default nextConfig;
