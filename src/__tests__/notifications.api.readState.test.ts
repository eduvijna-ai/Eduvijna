import { getNotifications } from '../core/api/notifications.api';
import { guardedNotificationFetch } from '../core/api/notificationFetchGuard';
import { loadReadNotificationIds } from '../core/api/notificationReadState';

jest.mock('../core/api/notificationFetchGuard', () => ({
  guardedNotificationFetch: jest.fn(),
  getNotificationHistoryLimit: () => 50,
  getCachedNotificationsForAccount: () => [],
}));

jest.mock('../core/api/notificationReadState', () => ({
  loadReadNotificationIds: jest.fn(),
  persistReadNotificationId: jest.fn(),
}));

const mockGuard = guardedNotificationFetch as jest.MockedFunction<typeof guardedNotificationFetch>;
const mockLoadRead = loadReadNotificationIds as jest.MockedFunction<typeof loadReadNotificationIds>;

describe('getNotifications read-state merge', () => {
  beforeEach(() => {
    mockGuard.mockReset();
    mockLoadRead.mockReset();
  });

  it('applies durable read ids after history fetch completes', async () => {
    mockGuard.mockResolvedValue({
      kind: 'fresh',
      notifications: [
        { id: 7, title: 't', body: 'b', status: 'sent', priority: 'normal', created_at: '' },
      ],
    });
    mockLoadRead.mockResolvedValue(new Set([7]));

    const rows = await getNotifications({ accountKey: 'acct-1' });
    expect(mockLoadRead).toHaveBeenCalledWith('acct-1');
    expect(rows[0]?.is_read).toBe(true);
  });
});
