import {
  sponsorStatusFixture,
  type TrancheStatusRow
} from "./status-model";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export function TrancheStatusTable({
  rows = sponsorStatusFixture
}: {
  rows?: TrancheStatusRow[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Milestone</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Proof event</TableHead>
          <TableHead>Tx hash</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
          {rows.map((row) => (
            <TableRow key={row.milestoneKey}>
              <TableCell>{row.milestoneKey}</TableCell>
              <TableCell>{row.amount}</TableCell>
              <TableCell>
                <Badge variant={row.status === "Released" ? "default" : "secondary"}>
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell>{row.proofEvent}</TableCell>
              <TableCell className="font-mono text-xs">{row.txHash ?? "Pending"}</TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
