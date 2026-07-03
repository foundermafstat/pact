"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  DatabaseIcon,
  LandmarkIcon,
  LockKeyholeIcon,
  NetworkIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WalletCardsIcon
} from "lucide-react";
import { useState } from "react";

import { LandingConnectButton } from "@/components/auth/landing-connect-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WebglParticles } from "./webgl-particles";

const proofStages = [
  "Investment pool",
  "Startup application",
  "Investor approval",
  "Stripe MRR snapshot",
  "Groth16 proof",
  "Contract tranche"
];

const investorFlow = [
  "Create investment or grant pool",
  "Review incoming startup applications",
  "Approve startup and define MRR milestones",
  "Track contract funding and release status"
];

const founderFlow = [
  "Register startup profile",
  "Apply to open pools and grants",
  "Connect Stripe test account",
  "Prove MRR and receive tranche"
];

const strengths = [
  {
    icon: DatabaseIcon,
    title: "Durable workflow",
    text: "Startups, pools, applications, proof jobs, Stripe state and contract events are stored in PostgreSQL."
  },
  {
    icon: LockKeyholeIcon,
    title: "Private KPI proof",
    text: "Stripe MRR is committed into a local Groth16 proof flow without exposing raw Stripe rows in the UI."
  },
  {
    icon: WalletCardsIcon,
    title: "Real testnet payout",
    text: "Approved milestones release a demo SAC asset through the deployed Stellar testnet escrow contract."
  },
  {
    icon: ShieldCheckIcon,
    title: "Role-specific cockpit",
    text: "Founder, investor and admin workspaces show only the screens relevant to that role."
  }
];

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
            <Link href="/dashboard/investor">Investor</Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/dashboard/startup">Startup</Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/dashboard/admin/demo">Demo</Link>
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

      <section className="template-story" id="how-it-works">
        <div className="template-section-heading">
          <h2>One flow from investor intent to founder payout.</h2>
          <p>
            Pact turns a funding promise into a structured program: investors define the
            milestone, founders prove revenue privately, and the escrow contract releases the
            tranche only after the proof gate passes.
          </p>
        </div>
        <div className="template-flow-rail" aria-label="Pact funding flow">
          {proofStages.map((stage, index) => (
            <div className="template-flow-step" key={stage}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{stage}</strong>
              {index < proofStages.length - 1 ? <ArrowRightIcon aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="template-roles">
        <div className="template-role-panel">
          <div className="template-role-icon">
            <LandmarkIcon aria-hidden="true" />
          </div>
          <h2>For investors and grant organizers</h2>
          <p>
            Create the capital pool, set the milestone policy, approve founders and track
            program funding without mixing founder-only screens into the investor workspace.
          </p>
          <ul>
            {investorFlow.map((item) => (
              <li key={item}>
                <BadgeCheckIcon aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Button asChild className="template-section-button" variant="outline">
            <Link href="/dashboard/investor">Open investor workspace</Link>
          </Button>
        </div>

        <div className="template-role-panel">
          <div className="template-role-icon">
            <SparklesIcon aria-hidden="true" />
          </div>
          <h2>For startup founders</h2>
          <p>
            Publish the startup profile, apply to matching pools, connect Stripe in test mode
            and produce a judge-visible proof receipt for each approved milestone.
          </p>
          <ul>
            {founderFlow.map((item) => (
              <li key={item}>
                <BadgeCheckIcon aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Button asChild className="template-section-button" variant="outline">
            <Link href="/dashboard/startup">Open founder workspace</Link>
          </Button>
        </div>
      </section>

      <section className="template-proof-section">
        <div className="template-proof-copy">
          <NetworkIcon aria-hidden="true" />
          <h2>What makes the demo verifiable</h2>
          <p>
            The judge demo can show a database-backed application, a generated proof job,
            a redacted proof receipt, and a Stellar testnet transaction link in one narrative.
          </p>
          <Button asChild className="template-button template-button-compact">
            <Link href="/dashboard/admin/demo">Open judge demo control center</Link>
          </Button>
        </div>
        <div className="template-strength-grid">
          {strengths.map((item) => {
            const Icon = item.icon;
            return (
              <article className="template-strength" key={item.title}>
                <Icon aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
