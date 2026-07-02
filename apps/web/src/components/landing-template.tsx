"use client";

import Link from "next/link";
import { useState } from "react";

import { WebglParticles } from "./webgl-particles";

export function LandingTemplate() {
  const [hovering, setHovering] = useState(false);

  return (
    <main className="template-landing">
      <WebglParticles hovering={hovering} />

      <header className="template-header">
        <Link className="template-logo" href="/" aria-label="Pact home">
          <img src="/pact-logo-gradient.svg" alt="" aria-hidden="true" />
          <span>Pact</span>
        </Link>

        <nav className="template-nav" aria-label="Landing navigation">
          <Link href="/sponsor">Sponsor</Link>
          <Link href="/project">Project</Link>
          <Link href="/issuer">Issuer</Link>
          <Link href="/audit">Audit</Link>
        </nav>

        <Link className="template-sign-in" href="/attestor">
          Attestor
        </Link>
      </header>

      <section className="template-hero">
        <div className="template-pill">
          <span />
          TESTNET RELEASE
        </div>
        <h1>
          Private proof. <br />
          <i>Public accountability.</i>
        </h1>
        <p>
          Milestone escrow for teams that need public funding accountability
          without exposing raw KYB data, private evidence, or exact KPI values.
        </p>
        <div className="template-actions">
          <Link
            className="template-button"
            href="/sponsor"
            aria-label="Start demo"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onFocus={() => setHovering(true)}
            onBlur={() => setHovering(false)}
          >
            [Start Demo]
          </Link>
          <Link className="template-text-link" href="/audit">
            View public audit
          </Link>
        </div>
      </section>
    </main>
  );
}
