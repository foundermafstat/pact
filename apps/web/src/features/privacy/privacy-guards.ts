export const PRIVATE_FIELD_DENYLIST = [
  "activeUsers",
  "pilotPartners",
  "credential_secret",
  "credentialSecret",
  "project_secret",
  "projectSecret",
  "privateMetrics",
  "privateMetricsEncrypted",
  "metricSalt",
  "attestationSecret"
] as const;

const privatePattern = new RegExp(PRIVATE_FIELD_DENYLIST.join("|"), "i");

export type PublicAuditDto = {
  timeline: Array<{
    type: string;
    message: string;
    publicFields: Record<string, string>;
  }>;
};

export const stripPrivateFields = (
  payload: Record<string, unknown>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(payload)
      .filter(([key, value]) => !privatePattern.test(key) && !privatePattern.test(String(value)))
      .map(([key, value]) => [key, String(value)])
  );

export const assertPublicText = (value: string): void => {
  if (privatePattern.test(value)) {
    throw new Error("Private field leaked into public UI");
  }
};
