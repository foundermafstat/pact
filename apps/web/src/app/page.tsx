import Link from "next/link";

import { landingFlowSteps } from "../features/landing/landing-content";

export default function LandingPage() {
  return (
    <>
      <section className="landing-hero">
        <div>
          <h1 className="page-title">Private proof. Public accountability.</h1>
          <p className="page-kicker">
            Pact demonstrates milestone escrow where eligibility and KPI facts
            are proven privately while funding status, roots, events, and
            releases stay publicly auditable.
          </p>
          <div className="hero-actions">
            <Link className="primary-link" href="/sponsor">
              Start demo
            </Link>
            <Link className="secondary-link" href="/audit">
              View audit
            </Link>
          </div>
        </div>
        <div className="proof-visual" aria-label="Pact private proof flow">
          <span>Credential root</span>
          <strong>ZK proof</strong>
          <span>Milestone release</span>
        </div>
      </section>

      <section className="section flow-section">
        {landingFlowSteps.map((step, index) => (
          <div className="flow-step" key={step.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{step.label}</h2>
            <strong>{step.title}</strong>
            <p>{step.detail}</p>
          </div>
        ))}
      </section>
    </>
  );
}
