import {
  sponsorStatusFixture,
  type TrancheStatusRow
} from "./status-model";

export function TrancheStatusTable({
  rows = sponsorStatusFixture
}: {
  rows?: TrancheStatusRow[];
}) {
  return (
    <div className="table-wrap">
      <table className="status-table">
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Proof event</th>
            <th>Tx hash</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.milestoneKey}>
              <td>{row.milestoneKey}</td>
              <td>{row.amount}</td>
              <td>
                <span className={`status-pill status-${row.status.toLowerCase()}`}>
                  {row.status}
                </span>
              </td>
              <td>{row.proofEvent}</td>
              <td>{row.txHash ?? "Pending"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
