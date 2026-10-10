/**
 * Notifications Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  Notification,
} from '../api/notifications.api';
import { useAuth } from '@core/hooks/useAuth';

const POLL_INTERVAL_MS = 60_000;

export default function useNotifications() {
  const { user } = useAuth();
  const accountKey = user?.id != null ? String(user.id) : null;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousAccountRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!accountKey) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getNotifications({ accountKey });
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.clicked_at && !n.is_read).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [accountKey]);

  const fetchUnreadCount = useCallback(async () => {
    if (!accountKey) return;
    try {
      const count = await getUnreadCount({ accountKey, notifications });
      setUnreadCount(count);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load unread count';
      console.error('Failed to fetch unread count:', errorMsg);
    }
  }, [accountKey]);

  const markNotificationRead = useCallback(
    async (notificationId: string | number) => {
      if (!accountKey) return;
      try {
        setNotifications((prev) =>
          prev.map((n) => (n.id === Number(notificationId) ? { ...n, is_read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        await markAsRead(String(notificationId), accountKey);
      } catch (err: unknown) {
        console.error('Failed to mark notification as read:', err);
        await fetchNotifications();
      }
    },
    [accountKey, fetchNotifications],
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!accountKey) return;
    try {
      const ids = notifications.map((n) => n.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      await markAllAsRead(ids, accountKey);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mark all as read';
      console.error('Failed to mark all notifications as read:', errorMsg);
      await fetchNotifications();
    }
  }, [accountKey, fetchNotifications, notifications]);

  const refreshAfterQuizGenerated = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (previousAccountRef.current !== accountKey) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      previousAccountRef.current = accountKey;
    }

    if (!accountKey) {
      return;
    }

    void fetchNotifications();
    const interval = setInterval(() => {
      void fetchUnreadCount();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [accountKey, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    refreshAfterQuizGenerated,
  };
}
