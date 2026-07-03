"use client";

import Link from "next/link";
import { useState } from "react";

import { LandingConnectButton } from "@/components/auth/landing-connect-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WebglParticles } from "./webgl-particles";

export function LandingTemplate() {
  const [hovering, setHovering] = useState(false);

  return (
    <main className="template-landing">
      <WebglParticles hovering={hovering} />

      <header className="template-header">
        <Button asChild className="template-logo" variant="link">
          <Link href="/" aria-label="Pact home">
            <img src="/pact-logo-gradient.svg" alt="" aria-hidden="true" />
            <span>Pact</span>
          </Link>
        </Button>

        <nav className="template-nav" aria-label="Landing navigation">
          <Button asChild variant="link">
            <Link href="/dashboard/investor">Sponsor</Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/dashboard/startup">Project</Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/dashboard/admin/issuer">Issuer</Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/dashboard/audit">Audit</Link>
          </Button>
        </nav>

        <LandingConnectButton />
      </header>

      <section className="template-hero">
        <Badge className="template-pill" variant="outline">
          <span />
          TESTNET RELEASE
        </Badge>
        <h1>
          Private proof. <br />
          <i>Public accountability.</i>
        </h1>
        <p>
          Milestone escrow for teams that need public funding accountability
          without exposing raw KYB data, private evidence, or exact KPI values.
        </p>
        <div className="template-actions">
          <Button
            asChild
            className="template-button"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onFocus={() => setHovering(true)}
            onBlur={() => setHovering(false)}
          >
            <Link href="/dashboard" aria-label="Start demo">
              [Start Demo]
            </Link>
          </Button>
          <Button asChild className="template-text-link" variant="link">
            <Link href="/dashboard/audit">View public audit</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
