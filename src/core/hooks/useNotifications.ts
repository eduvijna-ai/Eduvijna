/**
 * Notifications Hook
 * Manages notification state and provides functions for fetching, marking as read
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  Notification,
} from '../api/notifications.api';

export default function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all notifications
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNotifications();
      setNotifications(data);
      
      // Update unread count
      const count = data.filter(n => !n.is_read).length;
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch only unread count (lighter API call)
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load unread count';
      console.error('Failed to fetch unread count:', errorMsg);
    }
  }, []);

  /**
   * Mark a notification as read
   */
  const markNotificationRead = useCallback(async (notificationId: string | number) => {
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => 
          n.id === String(notificationId) ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // API call
      await markAsRead(String(notificationId));
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
      // Revert optimistic update
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  /**
   * Mark all notifications as read
   */
  const markAllNotificationsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);

      // API call
      await markAllAsRead();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mark all as read';
      console.error('Failed to mark all notifications as read:', errorMsg);
      // Revert optimistic update
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  /**
   * Refresh notifications after quiz generation
   */
  const refreshAfterQuizGenerated = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  /**
   * Initial load and polling setup
   */
  useEffect(() => {
    fetchNotifications();

    // Poll for unread count every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount]);

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
