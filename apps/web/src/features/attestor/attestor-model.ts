export type MilestoneMetricsForm = {
  activeUsers: string;
  pilotPartners: string;
  auditPassed: boolean;
};

export const validateMilestoneThresholds = (metrics: MilestoneMetricsForm): string[] => {
  const errors: string[] = [];
  if (Number(metrics.activeUsers) < 500) {
    errors.push("active_users below threshold");
  }
  if (Number(metrics.pilotPartners) < 3) {
    errors.push("pilot_partners below threshold");
  }
  if (!metrics.auditPassed) {
    errors.push("audit_passed must be true");
  }
  return errors;
};
