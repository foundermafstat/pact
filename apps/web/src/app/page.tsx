export default function LandingPage() {
  return (
    <>
      <h1 className="page-title">Private proof. Public accountability.</h1>
      <p className="page-kicker">
        Pact demonstrates milestone-based escrow where private eligibility and
        milestone facts are proven without exposing raw credentials or hidden KPI
        values.
      </p>
      <section className="section">
        <div className="grid">
          <div className="metric">
            <span>Funding</span>
            <strong>Sponsor creates and funds a program</strong>
          </div>
          <div className="metric">
            <span>Proof</span>
            <strong>Project proves eligibility and milestone status</strong>
          </div>
          <div className="metric">
            <span>Audit</span>
            <strong>Observers inspect only public events</strong>
          </div>
        </div>
      </section>
    </>
  );
}
