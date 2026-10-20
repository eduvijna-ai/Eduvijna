const mockHttpGet = jest.fn();

jest.mock('../core/api/config', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockHttpGet(...args),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_BASE_URL: 'https://eduapi.eduvijna.com',
  get: async (url: string) => {
    const response = await mockHttpGet(url);
    return response.data;
  },
}));

jest.mock('../core/api/notificationReadState', () => ({
  loadReadNotificationIds: jest.fn(),
  persistReadNotificationId: jest.fn(),
}));

import { getNotifications } from '../core/api/notifications.api';
import { resetNotificationFetchGuardForAccount } from '../core/api/notificationFetchGuard';
import { loadReadNotificationIds } from '../core/api/notificationReadState';

const mockLoadRead = loadReadNotificationIds as jest.MockedFunction<typeof loadReadNotificationIds>;

describe('getNotifications history response shapes', () => {
  beforeEach(() => {
    resetNotificationFetchGuardForAccount(null);
    mockHttpGet.mockReset();
    mockLoadRead.mockReset();
    mockLoadRead.mockResolvedValue(new Set());
  });

  it('parses array-root history from live-style payload', async () => {
    mockHttpGet.mockResolvedValue({
      data: [
        {
          id: 42,
          title: 'Graded',
          body: 'Quiz graded',
          status: 'sent',
          priority: 'normal',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });

    const rows = await getNotifications({ accountKey: 'acct-live' });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(42);
  });

  it('parses wrapped notifications history', async () => {
    mockHttpGet.mockResolvedValue({
      data: {
        notifications: [
          {
            id: 9,
            title: 'Assigned',
            body: 'New quiz',
            status: 'delivered',
            priority: 'high',
            created_at: '2026-01-02T00:00:00Z',
          },
        ],
        total: 1,
      },
    });

    const rows = await getNotifications({ accountKey: 'acct-wrap' });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(9);
  });

  it('falls back to cache when history shape is unrecognized', async () => {
    mockHttpGet.mockResolvedValueOnce({
      data: [
        {
          id: 3,
          title: 'cached',
          body: 'b',
          status: 'sent',
          priority: 'normal',
          created_at: '',
        },
      ],
    });
    await getNotifications({ accountKey: 'acct-bad' });

    mockHttpGet.mockResolvedValueOnce({ data: { items: [] } });
    const rows = await getNotifications({ accountKey: 'acct-bad' });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(3);
  });
});
