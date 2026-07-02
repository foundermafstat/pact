import { AuditView } from "../../features/audit/audit-view";

export default function AuditPage() {
  return (
    <>
      <h1 className="page-title">Public Audit View</h1>
      <p className="page-kicker">Inspect public program status without private metrics.</p>
      <section className="section">
        <AuditView />
      </section>
    </>
  );
}
