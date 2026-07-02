import { EligibilityPanel } from "../../features/project/eligibility-panel";

export default function ProjectPage() {
  return (
    <>
      <h1 className="page-title">Project Dashboard</h1>
      <p className="page-kicker">Run private eligibility and milestone proofs.</p>
      <section className="section">
        <h2 className="section-title">Eligibility</h2>
        <EligibilityPanel />
      </section>
    </>
  );
}
