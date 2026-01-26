/**
 * Notifications Dropdown
 * Shows notifications list in a dropdown/panel
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notification } from '../core/api/notifications.api';
import { formatDistanceToNow } from 'date-fns';

interface NotificationsDropdownProps {
  notifications: Notification[];
  loading: boolean;
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead: () => void;
  colors: any;
}

export default function NotificationsDropdown({
  notifications,
  loading,
  onClose,
  onNotificationClick,
  onMarkAllRead,
  colors,
}: NotificationsDropdownProps) {
  const hasUnread = notifications.some(n => !n.is_read);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'quiz_assigned':
        return 'document-text';
      case 'quiz_graded':
        return 'checkmark-circle';
      case 'classroom_invite':
        return 'people';
      case 'announcement':
        return 'megaphone';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'quiz_assigned':
        return '#3B82F6';
      case 'quiz_graded':
        return '#10B981';
      case 'classroom_invite':
        return '#8B5CF6';
      case 'announcement':
        return '#F59E0B';
      default:
        return colors.primary;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          {notifications.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>
                {notifications.length}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {hasUnread && (
            <TouchableOpacity
              onPress={onMarkAllRead}
              style={styles.markAllButton}
            >
              <Text style={[styles.markAllText, { color: colors.primary }]}>
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No notifications yet
            </Text>
          </View>
        ) : (
          notifications.map((notification) => {
            const iconName = getNotificationIcon(notification.type);
            const iconColor = getNotificationColor(notification.type);

            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  { borderBottomColor: colors.border },
                  !notification.is_read && { backgroundColor: colors.primary + '08' },
                ]}
                onPress={() => onNotificationClick(notification)}
                activeOpacity={0.7}
              >
                {/* Unread indicator */}
                {!notification.is_read && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}

                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                  <Ionicons name={iconName as any} size={20} color={iconColor} />
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      { color: colors.text },
                      !notification.is_read && styles.unreadTitle,
                    ]}
                    numberOfLines={2}
                  >
                    {notification.title}
                  </Text>
                  <Text
                    style={[styles.notificationMessage, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {notification.message}
                  </Text>
                  <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                    {formatRelativeTime(notification.created_at)}
                  </Text>
                </View>

                {/* Chevron */}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 60 : 50,
    right: 10,
    width: 380,
    maxHeight: 500,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: 400,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    left: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 11,
  },
});
