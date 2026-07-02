import { IssuerConsole } from "../../features/issuer/issuer-console";

export default function IssuerPage() {
  return (
    <>
      <h1 className="page-title">Issuer Console</h1>
      <p className="page-kicker">Issue mock KYB credentials and publish roots.</p>
      <section className="section">
        <IssuerConsole />
      </section>
    </>
  );
}
