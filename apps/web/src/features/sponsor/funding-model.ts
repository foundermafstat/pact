export const getFundingProgress = (fundedAmount: string, totalAmount: string): number => {
  const funded = Number(fundedAmount);
  const total = Number(totalAmount);
  if (!Number.isFinite(funded) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((funded / total) * 100));
};
