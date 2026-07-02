export type PublicAuditTimelineItem = {
  type: string;
  message: string;
  publicFields: Record<string, string>;
};

export const auditTimelineFixture: PublicAuditTimelineItem[] = [
  { type: "Program created", message: "Program created", publicFields: { status: "Draft" } },
  { type: "Escrow funded", message: "Escrow funded", publicFields: { fundedAmount: "100000000" } },
  { type: "Policy activated", message: "Policy activated", publicFields: { policyType: "Eligibility" } },
  { type: "Root activated", message: "Credential root activated", publicFields: { rootType: "Credential" } },
  { type: "Eligibility verified", message: "Project eligibility verified", publicFields: { result: "Accepted" } },
  { type: "Milestone verified", message: "Milestone proof verified", publicFields: { milestone: "M1" } },
  { type: "Tranche released", message: "Tranche released", publicFields: { amount: "50000000" } }
];

export const toPublicAuditText = (items: PublicAuditTimelineItem[]): string =>
  items
    .map((item) => {
      const text = [
        item.type,
        item.message,
        ...Object.values(stripPrivateFields(item.publicFields))
      ].join(" ");
      assertPublicText(text);
      return text;
    })
    .join("\n");
import { assertPublicText, stripPrivateFields } from "../privacy/privacy-guards";
