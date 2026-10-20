export function formatAnalyticsDateStateAccessibility(startDate: string, endDate: string): string {
  if (!startDate && !endDate) {
    return 'Analytics date state all-time';
  }
  return `Analytics date state from-${startDate} to-${endDate}`;
}

/** Empty applied dates = All Time (omit created_from/created_to on the API). */
export function isAnalyticsAllTime(startDate: string, endDate: string): boolean {
  return !String(startDate || '').trim() && !String(endDate || '').trim();
}
