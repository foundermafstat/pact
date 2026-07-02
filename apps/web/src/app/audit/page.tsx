import { AuditView } from "../../features/audit/audit-view";
import { AttackPanel } from "../../features/attacks/attack-panel";

export default function AuditPage() {
  return (
    <>
      <h1 className="page-title">Public Audit View</h1>
      <p className="page-kicker">Inspect public program status without private metrics.</p>
      <section className="section">
        <AuditView />
      </section>
      <section className="section stacked-section">
        <h2 className="section-title">Attack simulation</h2>
        <AttackPanel />
      </section>
    </>
  );
}
