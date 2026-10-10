import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'eduvijna:notification_read_ids:';

function storageKey(accountKey: string): string {
  return `${KEY_PREFIX}${accountKey}`;
}

export async function loadReadNotificationIds(accountKey: string): Promise<Set<number>> {
  const raw = await AsyncStorage.getItem(storageKey(accountKey));
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as number[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export async function persistReadNotificationId(
  accountKey: string,
  notificationId: number,
): Promise<Set<number>> {
  const current = await loadReadNotificationIds(accountKey);
  current.add(notificationId);
  await AsyncStorage.setItem(storageKey(accountKey), JSON.stringify(Array.from(current)));
  return current;
}

export async function clearReadNotificationIds(accountKey: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(accountKey));
}
