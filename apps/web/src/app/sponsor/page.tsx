import { CreateProgramForm } from "../../features/sponsor/create-program-form";

export default function SponsorPage() {
  return (
    <>
      <h1 className="page-title">Sponsor Dashboard</h1>
      <p className="page-kicker">Create, fund, and activate escrow programs.</p>
      <section className="section">
        <CreateProgramForm />
      </section>
    </>
  );
}
