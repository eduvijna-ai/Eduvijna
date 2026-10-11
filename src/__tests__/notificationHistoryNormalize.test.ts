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

  it('accepts explicit total larger than the first page (pagination)', () => {
    const result = normalizeNotificationHistoryPayload({
      notifications: [{ id: 1, title: 't', body: 'b' }],
      total: 5,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.total).toBe(5);
      expect(result.notifications).toHaveLength(1);
    }
  });

  it('rejects explicit total smaller than the returned page', () => {
    const result = normalizeNotificationHistoryPayload({
      notifications: [
        { id: 1, title: 't', body: 'b' },
        { id: 2, title: 't2', body: 'b2' },
      ],
      total: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('total_smaller_than_page');
    }
  });

  it('rejects invalid notification row ids', () => {
    const result = normalizeNotificationHistoryPayload({
      notifications: [{ id: '', title: 't', body: 'b' }],
      total: 1,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unrecognized shapes', () => {
    const result = normalizeNotificationHistoryPayload({ items: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.responseShape).toBe('unknown');
    }
  });
});
