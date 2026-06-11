/** Assignment Analytics — submission rates per assignment. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  ProgressBar,
  StatGrid,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { assignments, assignmentBreakdown } from '../../../data';

export default function AssignmentAnalyticsScreen() {
  const theme = useTeacherTheme();

  const stats: StatItem[] = [
    { key: 'submitted', icon: 'cloud-done-outline', value: `${assignmentBreakdown.submitted.percent}%`, label: 'Submitted', accent: 'green' },
    { key: 'pending', icon: 'time-outline', value: `${assignmentBreakdown.pending.percent}%`, label: 'Pending', accent: 'orange' },
    { key: 'missing', icon: 'alert-circle-outline', value: `${assignmentBreakdown.notSubmitted.percent}%`, label: 'Not Submitted', accent: 'red' },
  ];

  return (
    <TeacherScreen header={<ScreenHeader title="Assignment Analytics" trailingIcon="download-outline" />} contentStyle={styles.content}>
      <SurfaceCard>
        <StatGrid items={stats} columns={3} />
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Submission Rate by Assignment" />
        <SurfaceCard>
          <View style={styles.list}>
            {assignments.map((assignment) => {
              const percent = assignment.total > 0 ? Math.round((assignment.submitted / assignment.total) * 100) : 0;
              return (
                <View key={assignment.id} style={styles.row}>
                  <View style={styles.info}>
                    <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>{assignment.title}</Text>
                    <Text style={[styles.pct, { color: percent >= 80 ? theme.colors.success : theme.colors.warning }]}>{percent}%</Text>
                  </View>
                  <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>Class {assignment.classCode} • {assignment.submitted}/{assignment.total}</Text>
                  <View style={styles.barWrap}><ProgressBar percent={percent} height={6} color={percent >= 80 ? theme.colors.success : theme.colors.warning} /></View>
                </View>
              );
            })}
          </View>
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  section: { gap: 0 },
  list: { gap: 16 },
  row: { gap: 4 },
  info: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontWeight: '600', flex: 1 },
  meta: { fontSize: 11 },
  pct: { fontSize: 13, fontWeight: '700' },
  barWrap: { marginTop: 4 },
});
