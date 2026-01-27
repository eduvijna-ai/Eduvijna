/**
 * Notification Polling Hook
 * Polls backend API for notifications (backend uses Firebase Admin SDK)
 */

import { useEffect, useState } from 'react';
import notificationPollingService from '@core/services/NotificationPollingService';
import { useAuth } from '@core/hooks/useAuth';
import useNotifications from '@core/hooks/useNotifications';
import type { Notification } from '@core/api/notifications.api';

export interface NotificationStatus {
  polling: boolean;
  error: string | null;
  lastPoll: Date | null;
}

export function useNotificationPolling() {
  const { user, isLoggedIn } = useAuth();
  const { fetchNotifications } = useNotifications();
  const [status, setStatus] = useState<NotificationStatus>({
    polling: false,
    error: null,
    lastPoll: null,
  });

  /**
   * Start polling when user logs in
   */
  useEffect(() => {
    // Commented out to prevent rate limit errors
    /*
    if (!isLoggedIn || !user) {
      console.log('⏭️ [useNotificationPolling] User not logged in, skipping polling');
      return;
    }

    console.log('🚀 [useNotificationPolling] Starting notification polling...');
    
    // Callback for new notifications
    const handleNewNotifications = (notifications: Notification[]) => {
      console.log('📬 [useNotificationPolling] Received notifications update:', notifications.length);
      
      // Refresh the notifications list from the existing hook
      fetchNotifications();
      
      setStatus((prev) => ({
        ...prev,
        lastPoll: new Date(),
      }));
    };

    // Start polling service
    notificationPollingService.start(user.id, handleNewNotifications);

    setStatus({
      polling: true,
      error: null,
      lastPoll: new Date(),
    });

    // Cleanup on logout
    return () => {
      console.log('🧹 [useNotificationPolling] Stopping polling...');
      notificationPollingService.stop();
      setStatus({
        polling: false,
        error: null,
        lastPoll: null,
      });
    };
    */
  }, [isLoggedIn, user?.id, fetchNotifications]);

  /**
   * Manually trigger a poll
   */
  const pollNow = async () => {
    try {
      console.log('🔄 [useNotificationPolling] Manual poll triggered');
      await notificationPollingService.pollNow();
      setStatus((prev) => ({
        ...prev,
        lastPoll: new Date(),
        error: null,
      }));
    } catch (error: any) {
      console.error('❌ [useNotificationPolling] Manual poll failed:', error);
      setStatus((prev) => ({
        ...prev,
        error: error?.message || 'Poll failed',
      }));
    }
  };

  return {
    ...status,
    pollNow,
  };
}
