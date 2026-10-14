import { fetchAllNotificationHistory, getNotifications } from '../core/api/notifications.api';
import { guardedNotificationFetch } from '../core/api/notificationFetchGuard';
import { loadReadNotificationIds } from '../core/api/notificationReadState';

jest.mock('../core/api/config', () => ({
  get: jest.fn(),
}));

jest.mock('../core/api/notificationFetchGuard', () => ({
  guardedNotificationFetch: jest.fn(),
  getNotificationHistoryLimit: () => 2,
  getCachedNotificationsForAccount: () => [],
}));

jest.mock('../core/api/notificationReadState', () => ({
  loadReadNotificationIds: jest.fn(),
  persistReadNotificationId: jest.fn(),
}));

const { get } = jest.requireMock('../core/api/config');
const mockGuard = guardedNotificationFetch as jest.MockedFunction<typeof guardedNotificationFetch>;
const mockLoadRead = loadReadNotificationIds as jest.MockedFunction<typeof loadReadNotificationIds>;

describe('notification history pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadRead.mockResolvedValue(new Set());
  });

  it('fetches additional pages until total is satisfied', async () => {
    (get as jest.Mock)
      .mockResolvedValueOnce({
        notifications: [
          { id: 1, title: 'a', body: 'b', status: 'sent', priority: 'normal', created_at: '' },
          { id: 2, title: 'c', body: 'd', status: 'sent', priority: 'normal', created_at: '' },
        ],
        total: 3,
      })
      .mockResolvedValueOnce({
        notifications: [
          { id: 3, title: 'e', body: 'f', status: 'sent', priority: 'normal', created_at: '' },
        ],
        total: 3,
      });

    const rows = await fetchAllNotificationHistory({ accountKey: 'acct', limit: 2 });
    expect(rows).toHaveLength(3);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('preserves nonnumeric string notification ids end-to-end', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    mockGuard.mockImplementation(async (_key, run) => ({
      kind: 'fresh',
      notifications: await run(),
    }));
    (get as jest.Mock).mockResolvedValue({
      notifications: [{ id: uuid, title: 't', body: 'b', status: 'sent', priority: 'normal', created_at: '' }],
      total: 1,
    });

    const rows = await getNotifications({ accountKey: 'acct-1' });
    expect(rows[0]?.id).toBe(uuid);
  });

  it('paginates array-root history until a short page', async () => {
    (get as jest.Mock)
      .mockResolvedValueOnce([
        { id: 1, title: 'a', body: 'b', status: 'sent', priority: 'normal', created_at: '' },
        { id: 2, title: 'c', body: 'd', status: 'sent', priority: 'normal', created_at: '' },
      ])
      .mockResolvedValueOnce([
        { id: 3, title: 'e', body: 'f', status: 'sent', priority: 'normal', created_at: '' },
      ]);

    const rows = await fetchAllNotificationHistory({ accountKey: 'acct', limit: 2 });
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('dedupes duplicate ids across pages', async () => {
    (get as jest.Mock)
      .mockResolvedValueOnce({
        notifications: [
          { id: 1, title: 'a', body: 'b', status: 'sent', priority: 'normal', created_at: '' },
          { id: 2, title: 'c', body: 'd', status: 'sent', priority: 'normal', created_at: '' },
        ],
        total: 3,
      })
      .mockResolvedValueOnce({
        notifications: [
          { id: 2, title: 'dup', body: 'd', status: 'sent', priority: 'normal', created_at: '' },
          { id: 3, title: 'e', body: 'f', status: 'sent', priority: 'normal', created_at: '' },
        ],
        total: 3,
      });

    const rows = await fetchAllNotificationHistory({ accountKey: 'acct', limit: 2 });
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});
