/**
 * Notifications API
 * Handles notification-related API calls
 * Based on /api/notifications endpoints as per PUSH_NOTIFICATIONS_API_REFERENCE.md
 */

import { get, put, post } from './config';

/**
 * Notification type
 */
export type NotificationType = 
  | 'quiz_assigned' 
  | 'quiz_graded' 
  | 'classroom_invite' 
  | 'announcement' 
  | 'general';

/**
 * Notification Status
 */
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'clicked';

/**
 * Notification interface (from backend history endpoint)
 */
export interface Notification {
  id: number;
  title: string;
  body: string;
  message?: string; // Alias for body for compatibility
  type?: NotificationType; // Notification type
  is_read?: boolean; // Read status
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

/**
 * Get notification history for current user
 * GET /api/notifications/history
 * DISABLED: To prevent rate limit errors
 */
export async function getNotifications(params?: {
  status?: NotificationStatus;
  limit?: number;
  offset?: number;
}): Promise<Notification[]> {
  console.log('⚠️ Notification API disabled to prevent rate limiting');
  return [];
  
  /* DISABLED CODE:
  try {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const query = queryParams.toString();
    const endpoint = query ? `/api/notifications/history?${query}` : '/api/notifications/history';
    
    const response = await get<{ notifications: Notification[]; total: number }>(endpoint);
    return response?.notifications || [];
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
  */
}

/**
 * Get unread notifications count (calculated from history)
 * Note: Backend doesn't have a dedicated unread-count endpoint
 * DISABLED: To prevent rate limit errors
 */
export async function getUnreadCount(): Promise<number> {
  console.log('⚠️ Notification API disabled to prevent rate limiting');
  return 0;
  
  /* DISABLED CODE:
  try {
    // Get all notifications and filter unclicked/undelivered
    const notifications = await getNotifications({ limit: 100 });
    const unreadCount = notifications.filter(n => !n.clicked_at).length;
    return unreadCount;
  } catch (error) {
    console.error('Failed to calculate unread count:', error);
    return 0;
  }
  */
}

/**
 * Get notification by ID
 * GET /api/notifications/{notification_id}
 */
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
 * Mark notification as read (not available in backend)
 * Note: Backend tracks clicked_at when notification is clicked, not read status
 */
export async function markAsRead(notificationId: string): Promise<void> {
  console.warn('markAsRead not implemented - backend uses clicked_at tracking');
}

/**
 * Mark all notifications as read (not available in backend)
 */
export async function markAllAsRead(): Promise<void> {
  console.warn('markAllAsRead not implemented - backend uses clicked_at tracking');
}

/**
 * Delete notification (not available in backend)
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  console.warn('deleteNotification not available in backend');
}
