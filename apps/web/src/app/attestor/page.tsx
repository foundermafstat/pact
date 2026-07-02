import { AttestorConsole } from "../../features/attestor/attestor-console";

export default function AttestorPage() {
  return (
    <>
      <h1 className="page-title">Attestor Console</h1>
      <p className="page-kicker">Validate private milestone evidence and publish roots.</p>
      <section className="section">
        <AttestorConsole />
      </section>
    </>
  );
}
