export type NotificationId = number | string;

export function normalizeNotificationId(id: number | string): NotificationId {
  if (typeof id === 'number') {
    if (!Number.isFinite(id)) {
      throw new Error(`notification_history_shape:invalid_id:${String(id)}`);
    }
    return id;
  }
  const trimmed = String(id).trim();
  if (!trimmed) {
    throw new Error(`notification_history_shape:invalid_id:${String(id)}`);
  }
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && String(asNumber) === trimmed) {
    return asNumber;
  }
  return trimmed;
}

export function notificationIdKey(id: NotificationId): string {
  return typeof id === 'number' ? `n:${id}` : `s:${id}`;
}

export function notificationIdsEqual(a: NotificationId, b: NotificationId): boolean {
  return notificationIdKey(a) === notificationIdKey(b);
}
