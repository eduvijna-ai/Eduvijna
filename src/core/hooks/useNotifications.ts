/**
 * Notifications Hook
 * Manages notification state and provides functions for fetching, marking as read
 */

import { useState, useEffect, useCallback } from 'react';
import {
  // getNotifications, // DISABLED: Preventing rate limit errors
  // getUnreadCount, // DISABLED: Preventing rate limit errors
  markAsRead,
  markAllAsRead,
  Notification,
} from '../api/notifications.api';
import { useAuth } from '@core/hooks/useAuth';

export default function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all notifications
   */
  const fetchNotifications = useCallback(async () => {
    // DISABLED: Notification API calls to prevent rate limit errors
    console.log('⚠️ Notification API calls disabled to prevent rate limiting');
    return;
    
    /* DISABLED CODE:
    // Only fetch if user is authenticated
    if (!user) {
      return;
    }

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
    */
  }, [user]);

  /**
   * Fetch only unread count (lighter API call)
   */
  const fetchUnreadCount = useCallback(async () => {
    // DISABLED: Notification API calls to prevent rate limit errors
    console.log('⚠️ Notification API calls disabled to prevent rate limiting');
    return;
    
    /* DISABLED CODE:
    // Only fetch if user is authenticated
    if (!user) {
      return;
    }

    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load unread count';
      console.error('Failed to fetch unread count:', errorMsg);
    }
    */
  }, [user]);

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
    // DISABLED: Notification API calls to prevent rate limit errors
    console.log('⚠️ Notification polling disabled to prevent rate limiting');
    return;
    
    /* DISABLED CODE:
    // Only setup notifications if user is authenticated
    if (!user) {
      // Clear notifications when logged out
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    // Poll for unread count every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
    */
  }, [fetchNotifications, fetchUnreadCount, user]);

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
