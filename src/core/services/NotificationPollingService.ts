/**
 * Notification Polling Service
 * Polls backend API for new notifications (backend uses Firebase Admin SDK)
 */

import { AppState, AppStateStatus } from 'react-native';
import { getNotifications } from '@core/api/notifications.api';
import type { Notification } from '@core/api/notifications.api';

const POLLING_INTERVAL = 30000; // 30 seconds
const POLLING_INTERVAL_BACKGROUND = 60000; // 1 minute when in background

class NotificationPollingService {
  private static instance: NotificationPollingService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private userId: number | null = null;
  private isActive: boolean = false;
  private appState: AppStateStatus = 'active';
  private onNewNotificationsCallback: ((notifications: Notification[]) => void) | null = null;
  private lastNotificationCount: number = 0;

  private constructor() {
    // Listen to app state changes
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  static getInstance(): NotificationPollingService {
    if (!NotificationPollingService.instance) {
      NotificationPollingService.instance = new NotificationPollingService();
    }
    return NotificationPollingService.instance;
  }

  /**
   * Start polling for notifications
   * COMMENTED OUT - Causing rate limit errors
   */
  start(userId: number, callback: (notifications: Notification[]) => void): void {
    console.log('⚠️ [Polling] Notification polling is disabled (rate limit prevention)');
    
    // this.userId = userId;
    // this.onNewNotificationsCallback = callback;
    // this.isActive = true;

    // // Fetch immediately
    // this.pollNotifications();

    // // Set up interval
    // this.setupPolling();
  }

  /**
   * Stop polling
   */
  stop(): void {
    console.log('⏹️ [Polling] Stopping notification polling');
    
    this.isActive = false;
    this.userId = null;
    this.onNewNotificationsCallback = null;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Set up polling interval
   */
  private setupPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    const interval = this.appState === 'active' 
      ? POLLING_INTERVAL 
      : POLLING_INTERVAL_BACKGROUND;

    this.pollingInterval = setInterval(() => {
      if (this.isActive && this.userId) {
        this.pollNotifications();
      }
    }, interval);

    console.log(`⏱️ [Polling] Set interval to ${interval}ms (${this.appState})`);
  }

  /**
   * Poll for new notifications
   * COMMENTED OUT - Causing rate limit errors
   */
  private async pollNotifications(): Promise<void> {
    // if (!this.userId || !this.isActive) return;

    // try {
    //   console.log('🔄 [Polling] Fetching notifications...');
      
    //   // Fetch all notifications from backend
    //   const notifications = await getNotifications();

    //   // Check if there are new notifications since last poll
    //   if (notifications.length > this.lastNotificationCount) {
    //     const newCount = notifications.length - this.lastNotificationCount;
    //     console.log('📬 [Polling] Found', newCount, 'new notification(s)');
        
    //     // Update count
    //     this.lastNotificationCount = notifications.length;
        
    //     // Notify callback with all notifications
    //     if (this.onNewNotificationsCallback) {
    //       this.onNewNotificationsCallback(notifications);
    //     }
    //   } else if (notifications.length !== this.lastNotificationCount) {
    //     // Count changed (maybe notifications were deleted)
    //     this.lastNotificationCount = notifications.length;
    //   }
    // } catch (error) {
    //   console.error('❌ [Polling] Failed to poll notifications:', error);
    //   // Don't stop polling on error - continue trying
    // }
    console.log('⚠️ [Polling] Polling disabled to prevent rate limits');
  }

  /**
   * Manually trigger a poll
   * COMMENTED OUT - Causing rate limit errors
   */
  async pollNow(): Promise<void> {
    console.log('⚠️ [Polling] Manual polling disabled to prevent rate limits');
    // await this.pollNotifications();
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (this.appState !== nextAppState) {
      console.log(`📱 [Polling] App state changed: ${this.appState} → ${nextAppState}`);
      this.appState = nextAppState;

      // Adjust polling interval based on app state
      if (this.isActive) {
        this.setupPolling();

        // Poll immediately when app becomes active
        if (nextAppState === 'active') {
          this.pollNotifications();
        }
      }
    }
  };

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    AppState.removeEventListener('change', this.handleAppStateChange);
  }
}

export default NotificationPollingService.getInstance();
