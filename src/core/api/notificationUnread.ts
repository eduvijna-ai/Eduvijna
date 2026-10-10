import type { Notification } from './notifications.api';

export function isNotificationUnread(notification: Notification): boolean {
  return !notification.clicked_at && !notification.is_read;
}

export function countUnreadNotifications(notifications: Notification[]): number {
  return notifications.filter(isNotificationUnread).length;
}
