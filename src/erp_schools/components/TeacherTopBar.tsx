/** TeacherTopBar — side menu · EduVijna logo · notifications · profile avatar. */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppSideNavMenuButton } from '@context/AppSideNavContext';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import { Avatar } from './Avatar';

interface TeacherTopBarProps {
  userName: string;
  avatarUrl?: string;
  notificationCount?: number;
  onPressNotifications?: () => void;
  onPressProfile?: () => void;
}

export function TeacherTopBar({
  userName,
  avatarUrl,
  notificationCount = 0,
  onPressNotifications,
  onPressProfile,
}: TeacherTopBarProps) {
  const theme = useTeacherTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.colors.background }]}>
      <View style={styles.brandRow}>
        <AppSideNavMenuButton color={theme.colors.textPrimary} />
        <Image
          source={
            theme.isDark
              ? require('../../../assets/eduvijna_logo_sidebar_white.png')
              : require('../../../assets/eduvijna_logo_sidebar.png')
          }
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="EduVijna"
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onPressNotifications}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${notificationCount} unread`}
        >
          <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
          {notificationCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPressProfile}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Avatar name={userName} uri={avatarUrl} size={38} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 },
  logo: { width: 120, height: 38 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBtn: { padding: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
