import { normalizeNotificationHistoryPayload } from '../core/api/notificationHistoryNormalize';

describe('normalizeNotificationHistoryPayload', () => {
  it('accepts array-root history responses', () => {
    const result = normalizeNotificationHistoryPayload([
      {
        id: 1,
        title: 't',
        body: 'b',
        status: 'sent',
        priority: 'normal',
        created_at: '2026-01-01',
      },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.responseShape).toBe('array_root');
      expect(result.total).toBe(1);
    }
  });

  it('accepts wrapped notifications with empty array', () => {
    const result = normalizeNotificationHistoryPayload({ notifications: [], total: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.responseShape).toBe('wrapped_notifications');
      expect(result.notifications).toHaveLength(0);
    }
  });

  it('rejects unrecognized shapes', () => {
    const result = normalizeNotificationHistoryPayload({ items: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.responseShape).toBe('unknown');
    }
  });
});
