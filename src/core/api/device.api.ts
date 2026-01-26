/**
 * Notifications API
 * API-based notification system (backend uses Firebase Admin SDK)
 */

import { apiClient } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_NOTIFICATION_CHECK = '@eduvijna:last_notification_check';

export interface NotificationMessage {
  id: string;
  title: string;
  body: string;
  type: 'new_quiz' | 'quiz_graded' | 'classroom_invite' | 'announcement' | 'general';
  data?: {
    quiz_id?: string;
    session_id?: string;
    quiz_title?: string;
    teacher_name?: string;
    classroom_id?: string;
    [key: string]: any;
  };
  timestamp: string;
  read: boolean;
}

export interface FetchNotificationsResponse {
  success: boolean;
  notifications: NotificationMessage[];
  unread_count: number;
}

export interface SendNotificationPayload {
  user_id?: number;
  user_ids?: number[];
  title: string;
  body: string;
  type: 'new_quiz' | 'quiz_graded' | 'classroom_invite' | 'announcement' | 'general';
  data?: Record<string, any>;
}

export interface SendNotificationResponse {
  success: boolean;
  message: string;
  sent_count?: number;
}

class NotificationsAPI {
  /**
   * Fetch new notifications from backend
   */
  async fetchNotifications(userId: number, since?: string): Promise<FetchNotificationsResponse> {
    try {
      console.log('📬 [Notifications API] Fetching notifications...');

      const params: any = { user_id: userId };
      if (since) {
        params.since = since;
      }

      const response = await apiClient.get<FetchNotificationsResponse>(
        '/api/notifications/fetch',
        { params }
      );

      // Update last check timestamp
      await this.updateLastCheckTimestamp();

      console.log('✅ [Notifications API] Fetched:', response.data.notifications.length, 'notifications');
      return response.data;
    } catch (error: any) {
      console.error('❌ [Notifications API] Fetch failed:', error);
      throw new Error(error?.response?.data?.message || 'Failed to fetch notifications');
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: number): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        '/api/notifications/mark-read',
        { notification_id: notificationId, user_id: userId }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ [Notifications API] Mark as read failed:', error);
      return { success: false };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: number): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        '/api/notifications/mark-all-read',
        { user_id: userId }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ [Notifications API] Mark all as read failed:', error);
      return { success: false };
    }
  }

  /**
   * Send notification via backend (uses Firebase Admin SDK)
   */
  async sendNotification(payload: SendNotificationPayload): Promise<SendNotificationResponse> {
    try {
      console.log('📤 [Notifications API] Sending notification...');

      const response = await apiClient.post<SendNotificationResponse>(
        '/api/notifications/send',
        payload
      );

      console.log('✅ [Notifications API] Notification sent');
      return response.data;
    } catch (error: any) {
      console.error('❌ [Notifications API] Send failed:', error);
      throw new Error(error?.response?.data?.message || 'Failed to send notification');
    }
  }

  /**
   * Send quiz notification to student(s)
   */
  async sendQuizNotification(payload: {
    user_ids: number[];
    quiz_id: string;
    quiz_title: string;
    teacher_name: string;
    session_id?: string;
  }): Promise<SendNotificationResponse> {
    try {
      console.log('🎯 [Notifications API] Sending quiz notification...');

      const response = await apiClient.post<SendNotificationResponse>(
        '/api/notifications/send-quiz-notification',
        payload
      );

      console.log('✅ [Notifications API] Quiz notification sent');
      return response.data;
    } catch (error: any) {
      console.error('❌ [Notifications API] Send quiz notification failed:', error);
      throw new Error(error?.response?.data?.message || 'Failed to send quiz notification');
    }
  }

  /**
   * Get last notification check timestamp
   */
  async getLastCheckTimestamp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_NOTIFICATION_CHECK);
    } catch (error) {
      console.error('❌ [Notifications API] Failed to get last check timestamp:', error);
      return null;
    }
  }

  /**
   * Update last notification check timestamp
   */
  private async updateLastCheckTimestamp(): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_NOTIFICATION_CHECK, new Date().toISOString());
    } catch (error) {
      console.error('❌ [Notifications API] Failed to update last check timestamp:', error);
    }
  }
}

export default new NotificationsAPI();
