/**
 * Notifications API
 * Handles notification-related API calls
 * Based on /api/notifications endpoints as per PUSH_NOTIFICATIONS_API_REFERENCE.md
 */

import { get } from './config';
import {
  getNotificationHistoryLimit,
  guardedNotificationFetch,
  getCachedNotificationsForAccount,
} from './notificationFetchGuard';
import { loadReadNotificationIds, persistReadNotificationId } from './notificationReadState';
import { normalizeNotificationHistoryPayload } from './notificationHistoryNormalize';
import {
  type NotificationId,
  normalizeNotificationId,
  notificationIdKey,
  notificationIdsEqual,
} from './notificationIdentity';

export type NotificationType =
  | 'quiz_assigned'
  | 'quiz_graded'
  | 'classroom_invite'
  | 'announcement'
  | 'general';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'clicked';

/** @deprecated use normalizeNotificationId */
export function coerceNotificationId(id: number | string): NotificationId {
  return normalizeNotificationId(id);
}

export interface Notification {
  id: NotificationId;
  title: string;
  body: string;
  message?: string;
  type?: NotificationType;
  is_read?: boolean;
  status: NotificationStatus;
  priority: 'high' | 'normal' | 'low';
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  clicked_at?: string;
  data?: {
    quiz_id?: string;
    quiz_title?: string;
    classroom_id?: string;
    classroom_name?: string;
    [key: string]: unknown;
  };
}

function applyClientReadState(
  rows: Notification[],
  readKeys: Set<string>,
): Notification[] {
  return rows.map((n) => ({
    ...n,
    is_read:
      Boolean(n.clicked_at) ||
      readKeys.has(notificationIdKey(n.id)) ||
      n.is_read === true,
  }));
}

function dedupeNotifications(rows: Notification[]): Notification[] {
  const seen = new Set<string>();
  return rows.filter((n) => {
    const key = notificationIdKey(n.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchNotificationHistoryPage(params: {
  status?: NotificationStatus;
  limit: number;
  offset: number;
}): Promise<{ notifications: Notification[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  queryParams.append('limit', String(params.limit));
  if (params.offset) queryParams.append('offset', params.offset.toString());

  const endpoint = `/api/notifications/history?${queryParams.toString()}`;
  const response = await get<unknown>(endpoint);
  const normalized = normalizeNotificationHistoryPayload(response);
  if (!normalized.ok) {
    throw new Error(`notification_history_shape:${normalized.responseShape}:${normalized.error}`);
  }
  const notifications = normalized.notifications.map((row) => ({
    ...(row as Notification),
    id: normalizeNotificationId(row.id),
  }));
  return { notifications, total: normalized.total };
}

export async function fetchAllNotificationHistory(params: {
  accountKey: string;
  status?: NotificationStatus;
  limit?: number;
}): Promise<Notification[]> {
  const limit = params.limit ?? getNotificationHistoryLimit();
  const collected: Notification[] = [];
  let offset = 0;
  let expectedTotal: number | null = null;

  while (true) {
    const page = await fetchNotificationHistoryPage({
      status: params.status,
      limit,
      offset,
    });
    if (expectedTotal == null) {
      expectedTotal = page.total;
    }
    if (page.notifications.length === 0) {
      break;
    }
    collected.push(...page.notifications);
    offset += page.notifications.length;
    if (expectedTotal != null && collected.length >= expectedTotal) {
      break;
    }
    if (page.notifications.length < limit) {
      break;
    }
  }

  return dedupeNotifications(collected);
}

export async function getNotifications(params?: {
  accountKey: string;
  status?: NotificationStatus;
  limit?: number;
  offset?: number;
}): Promise<Notification[]> {
  if (!params?.accountKey) {
    return [];
  }
  const accountKey = params.accountKey;
  try {
    const result = await guardedNotificationFetch(accountKey, async () => {
      if (params.offset != null && params.offset > 0) {
        const page = await fetchNotificationHistoryPage({
          status: params.status,
          limit: params.limit ?? getNotificationHistoryLimit(),
          offset: params.offset,
        });
        return page.notifications;
      }
      return fetchAllNotificationHistory({
        accountKey,
        status: params.status,
        limit: params.limit,
      });
    });
    const readKeys = await loadReadNotificationIds(accountKey);
    return applyClientReadState(result.notifications, readKeys);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    const cached = getCachedNotificationsForAccount(accountKey);
    const readKeys = await loadReadNotificationIds(accountKey);
    return applyClientReadState(cached, readKeys);
  }
}

export async function getUnreadCount(params: {
  accountKey: string;
  notifications?: Notification[];
}): Promise<number> {
  const rows =
    params.notifications ??
    (await getNotifications({ accountKey: params.accountKey, limit: getNotificationHistoryLimit() }));
  return rows.filter((n) => !n.clicked_at && !n.is_read).length;
}

export async function getNotificationById(notificationId: NotificationId): Promise<Notification | null> {
  try {
    const response = await get<Notification>(`/api/notifications/${notificationId}`);
    return response;
  } catch (error) {
    console.error('Failed to fetch notification:', error);
    return null;
  }
}

/**
 * Backend has no dedicated read endpoint; persist read ids per account locally.
 */
export async function markAsRead(notificationId: string, accountKey?: string): Promise<void> {
  if (!accountKey) return;
  await persistReadNotificationId(accountKey, notificationId);
}

export async function markAllAsRead(
  notificationIds: NotificationId[],
  accountKey?: string,
): Promise<void> {
  if (!accountKey) return;
  for (const id of notificationIds) {
    await persistReadNotificationId(accountKey, id);
  }
}

export async function deleteNotification(_notificationId: string): Promise<void> {
  console.warn('deleteNotification not available in backend');
}

export { notificationIdsEqual };
