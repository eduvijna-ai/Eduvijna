/**
 * Account-scoped helpers for push prompt dismissal and registration ownership.
 * OS permission + FCM token are device-level; backend association is per account.
 */

export const PUSH_ACCOUNT_STORAGE = {
  FCM_TOKEN: 'fcmDeviceToken',
  PUSH_ENABLED: 'pushNotificationsEnabled',
  LAST_TOKEN_REGISTERED: 'lastTokenRegistered',
  TOKEN_ID: 'deviceTokenId',
  REGISTERED_USER_ID: 'pushRegisteredUserId',
  PROMPT_DISMISSED_PREFIX: 'pushPromptDismissedAt:',
} as const;

export function promptDismissedStorageKey(userId: string | number): string {
  return `${PUSH_ACCOUNT_STORAGE.PROMPT_DISMISSED_PREFIX}${String(userId)}`;
}

export function wasPromptDismissedRecently(
  dismissedAtIso: string | null | undefined,
  nowMs: number,
  windowHours = 24,
): boolean {
  if (!dismissedAtIso) return false;
  const dismissedTime = new Date(dismissedAtIso).getTime();
  if (!Number.isFinite(dismissedTime)) return false;
  const hoursSince = (nowMs - dismissedTime) / (1000 * 60 * 60);
  return hoursSince >= 0 && hoursSince < windowHours;
}

/** True when a local token must be (re)registered for the authenticated account. */
export function needsAccountTokenReconcile(input: {
  isSupported: boolean;
  hasPermission: boolean;
  pushEnabledLocally: boolean;
  hasToken: boolean;
  registeredUserId: string | null;
  currentUserId: string | number | null | undefined;
  lastRegisteredToken: string | null;
  currentToken: string | null;
}): boolean {
  if (!input.isSupported || !input.hasPermission || !input.currentUserId) {
    return false;
  }
  if (!input.pushEnabledLocally && !input.hasToken) {
    return false;
  }
  // Device preference or existing token: bind to this account.
  if (!input.pushEnabledLocally && input.hasToken) {
    return true;
  }
  const current = String(input.currentUserId);
  if (!input.registeredUserId || input.registeredUserId !== current) {
    return true;
  }
  if (input.currentToken && input.lastRegisteredToken !== input.currentToken) {
    return true;
  }
  return false;
}
