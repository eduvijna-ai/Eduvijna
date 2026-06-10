/** Notifications — activity feed with read/unread states. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  ListItem,
  EmptyState,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { notifications } from '../../../data';

export default function NotificationsScreen() {
  const theme = useTeacherTheme();

  return (
    <TeacherScreen header={<ScreenHeader title="Notifications" trailingIcon="checkmark-done-outline" trailingAccessibilityLabel="Mark all read" />} contentStyle={styles.content}>
      {notifications.length === 0 ? (
        <EmptyState icon="notifications-outline" title="You're all caught up" message="New notifications will appear here." />
      ) : (
        <SurfaceCard padded={false} style={styles.card}>
          {notifications.map((item, index) => (
            <ListItem
              key={item.id}
              icon={item.iconName as never}
              iconAccent={item.accent}
              title={item.title}
              subtitle={item.body}
              divider={index < notifications.length - 1}
              trailing={
                <View style={styles.right}>
                  <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{item.timeLabel}</Text>
                  {!item.read ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
                </View>
              }
            />
          ))}
        </SurfaceCard>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4 },
  card: { paddingHorizontal: 14 },
  right: { alignItems: 'flex-end', gap: 6 },
  time: { fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
