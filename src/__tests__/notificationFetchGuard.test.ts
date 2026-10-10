import {
  guardedNotificationFetch,
  resetNotificationFetchGuardForAccount,
} from '../core/api/notificationFetchGuard';

describe('notificationFetchGuard', () => {
  beforeEach(() => {
    resetNotificationFetchGuardForAccount(null);
    jest.useRealTimers();
  });

  it('dedupes concurrent in-flight fetches per account', async () => {
    let calls = 0;
    const slow = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return [{ id: 1, title: 't', body: 'b', status: 'sent', priority: 'normal', created_at: '' }];
    };

    const [a, b] = await Promise.all([
      guardedNotificationFetch('acct-1', slow),
      guardedNotificationFetch('acct-1', slow),
    ]);
    expect(a.notifications).toHaveLength(1);
    expect(b.notifications).toHaveLength(1);
    expect(calls).toBe(1);
  });

  it('retains last successful list when throttled', async () => {
    await guardedNotificationFetch('acct-2', async () => [
      { id: 9, title: 'cached', body: 'b', status: 'sent', priority: 'normal', created_at: '' },
    ]);
    const throttled = await guardedNotificationFetch('acct-2', async () => []);
    expect(throttled.kind).toBe('suppressed');
    expect(throttled.notifications[0]?.title).toBe('cached');
  });

  it('isolates accounts during throttle', async () => {
    await guardedNotificationFetch('a', async () => [
      { id: 1, title: 'A', body: '', status: 'sent', priority: 'normal', created_at: '' },
    ]);
    const other = await guardedNotificationFetch('b', async () => [
      { id: 2, title: 'B', body: '', status: 'sent', priority: 'normal', created_at: '' },
    ]);
    expect(other.kind).toBe('fresh');
    expect(other.notifications[0]?.title).toBe('B');
  });
});
