import { CreateProgramForm } from "../../features/sponsor/create-program-form";
import { FundProgramPanel } from "../../features/sponsor/fund-program-panel";
import { TrancheStatusTable } from "../../features/sponsor/tranche-status-table";

export default function SponsorPage() {
  return (
    <>
      <h1 className="page-title">Sponsor Dashboard</h1>
      <p className="page-kicker">Create, fund, and activate escrow programs.</p>
      <section className="section">
        <CreateProgramForm />
      </section>
      <section className="section stacked-section">
        <h2 className="section-title">Funding</h2>
        <FundProgramPanel />
      </section>
      <section className="section stacked-section">
        <h2 className="section-title">Milestone status</h2>
        <TrancheStatusTable />
      </section>
    </>
  );
}
