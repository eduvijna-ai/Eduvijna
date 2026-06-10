/** Scheduled Notices — notices queued for future auto-publish. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  Badge,
  EmptyState,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { scheduledNotices } from '../../../data';

export default function ScheduledNoticeScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();

  return (
    <TeacherScreen
      header={<ScreenHeader title="Scheduled Notices" trailingIcon="add" onTrailingPress={() => navigation.navigate('CreateNotice', {})} />}
      contentStyle={styles.content}
    >
      {scheduledNotices.length === 0 ? (
        <EmptyState icon="time-outline" title="No scheduled notices" message="Schedule a notice to auto-publish later." ctaLabel="Create Notice" onCtaPress={() => navigation.navigate('CreateNotice', {})} />
      ) : (
        scheduledNotices.map((notice) => (
          <SurfaceCard key={notice.id}>
            <View style={styles.top}>
              <Badge label="Scheduled" accent="blue" icon="time" />
              <Text style={[styles.date, { color: theme.colors.textSecondary }]}>{notice.date}</Text>
            </View>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{notice.title}</Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{notice.body}</Text>
            <Text style={[styles.audience, { color: theme.colors.textSecondary }]}>{notice.audience}</Text>
          </SurfaceCard>
        ))
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  date: { fontSize: 11 },
  title: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  audience: { fontSize: 12, marginTop: 8 },
});
