export function resolveNotificationHistoryTotal(
  explicitTotal: unknown,
  pageLength: number,
): { ok: true; total: number } | { ok: false; error: string } {
  if (pageLength < 0) {
    return { ok: false, error: 'page_length_invalid' };
  }
  if (explicitTotal == null || explicitTotal === '') {
    return { ok: true, total: pageLength };
  }
  const numeric = Number(explicitTotal);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric) || numeric < 0) {
    return { ok: false, error: 'total_invalid' };
  }
  if (numeric < pageLength) {
    return { ok: false, error: 'total_smaller_than_page' };
  }
  return { ok: true, total: numeric };
}
