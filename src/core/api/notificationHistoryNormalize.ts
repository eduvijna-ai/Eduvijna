import { resolveNotificationHistoryTotal } from './notificationPaginationTotal';

export type NormalizedNotificationRow = {
  id: number | string;
  title: string;
  body: string;
  status?: string;
  priority?: string;
  created_at?: string;
  type?: string;
  is_read?: boolean;
  clicked_at?: string;
  data?: Record<string, unknown>;
};

export type NotificationHistoryNormalizeResult =
  | {
      ok: true;
      notifications: NormalizedNotificationRow[];
      total: number;
      responseShape: 'array_root' | 'wrapped_notifications' | 'wrapped_data';
    }
  | {
      ok: false;
      responseShape: 'invalid' | 'unknown';
      error: string;
    };

function isValidNotificationRowId(id: unknown): boolean {
  if (typeof id === 'number') {
    return Number.isFinite(id);
  }
  if (typeof id === 'string') {
    return id.trim() !== '';
  }
  return false;
}

function isNotificationRow(value: unknown): value is NormalizedNotificationRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as NormalizedNotificationRow;
  return (
    isValidNotificationRowId(row.id) &&
    typeof row.title === 'string' &&
    typeof row.body === 'string'
  );
}

export function normalizeNotificationHistoryPayload(
  data: unknown,
): NotificationHistoryNormalizeResult {
  if (data == null || typeof data !== 'object') {
    return { ok: false, responseShape: 'invalid', error: 'not_object' };
  }

  if (Array.isArray(data)) {
    if (data.length > 0 && !data.every(isNotificationRow)) {
      return { ok: false, responseShape: 'unknown', error: 'array_items_invalid' };
    }
    return {
      ok: true,
      notifications: data as NormalizedNotificationRow[],
      total: data.length,
      responseShape: 'array_root',
    };
  }

  const record = data as Record<string, unknown>;
  if (Array.isArray(record.notifications)) {
    const notifications = record.notifications;
    if (notifications.length > 0 && !notifications.every(isNotificationRow)) {
      return { ok: false, responseShape: 'unknown', error: 'notifications_items_invalid' };
    }
    const totalResolved = resolveNotificationHistoryTotal(record.total, notifications.length);
    if (!totalResolved.ok) {
      return { ok: false, responseShape: 'unknown', error: totalResolved.error };
    }
    return {
      ok: true,
      notifications: notifications as NormalizedNotificationRow[],
      total: totalResolved.total,
      responseShape: 'wrapped_notifications',
    };
  }

  if (Array.isArray(record.data)) {
    const notifications = record.data;
    if (notifications.length > 0 && !notifications.every(isNotificationRow)) {
      return { ok: false, responseShape: 'unknown', error: 'data_items_invalid' };
    }
    const totalResolved = resolveNotificationHistoryTotal(record.total, notifications.length);
    if (!totalResolved.ok) {
      return { ok: false, responseShape: 'unknown', error: totalResolved.error };
    }
    return {
      ok: true,
      notifications: notifications as NormalizedNotificationRow[],
      total: totalResolved.total,
      responseShape: 'wrapped_data',
    };
  }

  return { ok: false, responseShape: 'unknown', error: 'unrecognized_shape' };
}
