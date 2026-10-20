import {
  needsAccountTokenReconcile,
  promptDismissedStorageKey,
  wasPromptDismissedRecently,
} from '../core/services/pushNotificationAccountScope';

describe('pushNotificationAccountScope', () => {
  it('scopes prompt dismissal keys per account', () => {
    expect(promptDismissedStorageKey(12)).toBe('pushPromptDismissedAt:12');
    expect(promptDismissedStorageKey('ab')).toBe('pushPromptDismissedAt:ab');
  });

  it('detects recent dismissal within 24h', () => {
    const now = Date.parse('2026-10-19T12:00:00.000Z');
    expect(wasPromptDismissedRecently('2026-10-19T01:00:00.000Z', now)).toBe(true);
    expect(wasPromptDismissedRecently('2026-10-17T01:00:00.000Z', now)).toBe(false);
    expect(wasPromptDismissedRecently(null, now)).toBe(false);
  });

  it('requires reconcile when token exists for a different account', () => {
    expect(
      needsAccountTokenReconcile({
        isSupported: true,
        hasPermission: true,
        pushEnabledLocally: true,
        hasToken: true,
        registeredUserId: '1',
        currentUserId: 2,
        lastRegisteredToken: 'tok',
        currentToken: 'tok',
      }),
    ).toBe(true);
  });

  it('skips reconcile when already bound to current account with same token', () => {
    expect(
      needsAccountTokenReconcile({
        isSupported: true,
        hasPermission: true,
        pushEnabledLocally: true,
        hasToken: true,
        registeredUserId: '2',
        currentUserId: 2,
        lastRegisteredToken: 'tok',
        currentToken: 'tok',
      }),
    ).toBe(false);
  });
});
