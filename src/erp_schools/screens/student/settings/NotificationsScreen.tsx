/** Notifications — student notification feed (read / unread). screens.md "Notifications". */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  EmptyState,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';

export default function NotificationsScreen() {
  const theme = useTeacherTheme();
  const { notifications } = useStudentData();

  return (
    <TeacherScreen header={<ScreenHeader title="Notifications" trailingIcon="checkmark-done-outline" />} contentStyle={styles.content}>
      {notifications.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title="No notifications" message="You're all caught up." />
      ) : (
        <SurfaceCard padded={false} style={styles.listCard}>
          {notifications.map((item, index) => {
            const accent = accentColors(theme.colors, item.accent);
            return (
              <View
                key={item.id}
                style={[
                  styles.row,
                  index < notifications.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: accent.bg }]}>
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={accent.fg} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.body, { color: theme.colors.textSecondary }]} numberOfLines={2}>{item.body}</Text>
                  <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{item.timeLabel}</Text>
                </View>
                {!item.read ? <View style={[styles.unread, { backgroundColor: theme.colors.primary }]} /> : null}
              </View>
            );
          })}
        </SurfaceCard>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4 },
  listCard: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 12, lineHeight: 17 },
  time: { fontSize: 11, marginTop: 2 },
  unread: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
