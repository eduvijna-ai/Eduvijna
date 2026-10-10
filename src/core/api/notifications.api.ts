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

export type NotificationType =
  | 'quiz_assigned'
  | 'quiz_graded'
  | 'classroom_invite'
  | 'announcement'
  | 'general';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'clicked';

export interface Notification {
  id: number;
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
    [key: string]: any;
  };
}

function applyClientReadState(
  rows: Notification[],
  readIds: Set<number>,
): Notification[] {
  return rows.map((n) => ({
    ...n,
    is_read: Boolean(n.clicked_at) || readIds.has(n.id) || n.is_read === true,
  }));
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
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      queryParams.append('limit', String(params?.limit ?? getNotificationHistoryLimit()));
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const endpoint = `/api/notifications/history?${queryParams.toString()}`;
      const response = await get<{ notifications: Notification[]; total: number }>(endpoint);
      const rows = response?.notifications || [];
      const seen = new Set<number>();
      return rows.filter((n) => {
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });
    });
    const readIds = await loadReadNotificationIds(accountKey);
    return applyClientReadState(result.notifications, readIds);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    const cached = getCachedNotificationsForAccount(accountKey);
    const readIds = await loadReadNotificationIds(accountKey);
    return applyClientReadState(cached, readIds);
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

export async function getNotificationById(notificationId: number): Promise<Notification | null> {
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
  await persistReadNotificationId(accountKey, Number(notificationId));
}

export async function markAllAsRead(
  notificationIds: number[],
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
