/**
 * Notifications Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  Notification,
  notificationIdsEqual,
} from '../api/notifications.api';
import { useAuth } from '@core/hooks/useAuth';
import { countUnreadNotifications, isNotificationUnread } from '../api/notificationUnread';

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

    const fetchAccountKey = accountKey;
    try {
      setLoading(true);
      setError(null);
      const data = await getNotifications({ accountKey: fetchAccountKey });
      if (fetchAccountKey !== accountKey) {
        return;
      }
      setNotifications(data);
      setUnreadCount(countUnreadNotifications(data));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [accountKey]);

  const fetchUnreadCount = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const markNotificationRead = useCallback(
    async (notificationId: string | number) => {
      if (!accountKey) return;
      try {
        const wasUnread = notifications.some(
          (n) => notificationIdsEqual(n.id, notificationId) && isNotificationUnread(n),
        );
        setNotifications((prev) =>
          prev.map((n) =>
            notificationIdsEqual(n.id, notificationId) ? { ...n, is_read: true } : n,
          ),
        );
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        await markAsRead(String(notificationId), accountKey);
      } catch (err: unknown) {
        console.error('Failed to mark notification as read:', err);
        await fetchNotifications();
      }
    },
    [accountKey, fetchNotifications, notifications],
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
