import { resolveNotificationHistoryTotal } from '../core/api/notificationPaginationTotal';

describe('resolveNotificationHistoryTotal', () => {
  it('accepts totals larger than the returned page', () => {
    const result = resolveNotificationHistoryTotal(37, 20);
    expect(result).toEqual({ ok: true, total: 37 });
  });

  it('accepts empty page with positive total', () => {
    const result = resolveNotificationHistoryTotal(12, 0);
    expect(result).toEqual({ ok: true, total: 12 });
  });

  it('rejects total smaller than page length', () => {
    const result = resolveNotificationHistoryTotal(3, 5);
    expect(result.ok).toBe(false);
  });

  it('rejects fractional totals', () => {
    const result = resolveNotificationHistoryTotal(3.5, 1);
    expect(result.ok).toBe(false);
  });
});
