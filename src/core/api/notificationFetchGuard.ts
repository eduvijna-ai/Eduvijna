/**
 * Per-account bounded fetch guard with last-success retention during throttle/429.
 */

import type { Notification } from './notifications.api';

const MIN_INTERVAL_MS = 15_000;
const BACKOFF_AFTER_429_MS = 120_000;
const DEFAULT_LIMIT = 50;

export type NotificationFetchResult =
  | { kind: 'fresh'; notifications: Notification[] }
  | { kind: 'suppressed'; notifications: Notification[]; reason: 'throttled' | 'rate_limited' | 'in_flight' };

type AccountGuardState = {
  lastFetchAt: number;
  backoffUntil: number;
  inFlight: Promise<NotificationFetchResult> | null;
  lastSuccess: Notification[] | null;
};

const accountStates = new Map<string, AccountGuardState>();

function stateFor(accountKey: string): AccountGuardState {
  let state = accountStates.get(accountKey);
  if (!state) {
    state = {
      lastFetchAt: 0,
      backoffUntil: 0,
      inFlight: null,
      lastSuccess: null,
    };
    accountStates.set(accountKey, state);
  }
  return state;
}

export function resetNotificationFetchGuardForAccount(accountKey: string | null): void {
  if (!accountKey) {
    accountStates.clear();
    return;
  }
  accountStates.delete(accountKey);
}

export function getNotificationHistoryLimit(): number {
  return DEFAULT_LIMIT;
}

export function getCachedNotificationsForAccount(accountKey: string): Notification[] {
  return stateFor(accountKey).lastSuccess ?? [];
}

export async function guardedNotificationFetch(
  accountKey: string,
  run: () => Promise<Notification[]>,
): Promise<NotificationFetchResult> {
  const state = stateFor(accountKey);
  const now = Date.now();

  if (state.inFlight) {
    return state.inFlight;
  }

  if (now < state.backoffUntil) {
    return {
      kind: 'suppressed',
      notifications: state.lastSuccess ?? [],
      reason: 'rate_limited',
    };
  }

  if (now - state.lastFetchAt < MIN_INTERVAL_MS) {
    return {
      kind: 'suppressed',
      notifications: state.lastSuccess ?? [],
      reason: 'throttled',
    };
  }

  const promise = (async (): Promise<NotificationFetchResult> => {
    try {
      const notifications = await run();
      state.lastFetchAt = Date.now();
      state.lastSuccess = notifications;
      return { kind: 'fresh', notifications };
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number }; status?: number })?.response?.status
        ?? (error as { status?: number })?.status;
      if (status === 429) {
        state.backoffUntil = Date.now() + BACKOFF_AFTER_429_MS;
        return {
          kind: 'suppressed',
          notifications: state.lastSuccess ?? [],
          reason: 'rate_limited',
        };
      }
      throw error;
    } finally {
      state.inFlight = null;
    }
  })();

  state.inFlight = promise;
  return promise;
}
