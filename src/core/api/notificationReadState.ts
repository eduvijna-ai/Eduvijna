import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationId } from './notificationIdentity';
import { notificationIdKey, normalizeNotificationId } from './notificationIdentity';

const KEY_PREFIX = 'eduvijna:notification_read_ids:';

function storageKey(accountKey: string): string {
  return `${KEY_PREFIX}${accountKey}`;
}

export async function loadReadNotificationIds(accountKey: string): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(storageKey(accountKey));
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    const keys = new Set<string>();
    for (const entry of parsed) {
      if (typeof entry === 'string' && entry.trim()) {
        keys.add(entry);
        continue;
      }
      if (typeof entry === 'number' && Number.isFinite(entry)) {
        keys.add(notificationIdKey(entry));
      }
    }
    return keys;
  } catch {
    return new Set();
  }
}

export async function persistReadNotificationId(
  accountKey: string,
  notificationId: NotificationId,
): Promise<Set<string>> {
  const normalized = normalizeNotificationId(notificationId);
  const current = await loadReadNotificationIds(accountKey);
  current.add(notificationIdKey(normalized));
  await AsyncStorage.setItem(storageKey(accountKey), JSON.stringify(Array.from(current)));
  return current;
}

export async function clearReadNotificationIds(accountKey: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(accountKey));
}
