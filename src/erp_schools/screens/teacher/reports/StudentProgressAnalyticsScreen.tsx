/** Student Progress Analytics — top performers + students needing attention. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  ListItem,
  ProgressBar,
  StatGrid,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';

export default function StudentProgressAnalyticsScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { students } = useTeacherData();

  const ranked = [...students].sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0));
  const top = ranked.slice(0, 3);
  const needsAttention = [...students]
    .filter((s) => (s.averageScore ?? 100) < 60 || (s.attendancePercent ?? 100) < 75)
    .slice(0, 4);

  const avgScore = students.length
    ? Math.round(students.reduce((sum, s) => sum + (s.averageScore ?? 0), 0) / students.length)
    : 0;
  const avgAttendance = students.length
    ? Math.round(students.reduce((sum, s) => sum + (s.attendancePercent ?? 0), 0) / students.length)
    : 0;

  const stats: StatItem[] = [
    { key: 'students', icon: 'people-outline', value: students.length, label: 'Students', accent: 'blue' },
    { key: 'score', icon: 'ribbon-outline', value: `${avgScore}%`, label: 'Avg Score', accent: 'purple' },
    { key: 'attendance', icon: 'calendar-outline', value: `${avgAttendance}%`, label: 'Avg Attendance', accent: 'green' },
  ];

  return (
    <TeacherScreen header={<ScreenHeader title="Student Progress" trailingIcon="download-outline" />} contentStyle={styles.content}>
      <SurfaceCard>
        <StatGrid items={stats} columns={3} />
      </SurfaceCard>

      <SectionHeader title="Top Performers" />
      <SurfaceCard>
        <View style={styles.list}>
          {top.map((student, index) => (
            <View key={student.id} style={styles.rankRow}>
              <View style={[styles.rank, { backgroundColor: theme.colors.tintTeal }]}>
                <Text style={[styles.rankText, { color: theme.colors.primary }]}>{index + 1}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>{student.name}</Text>
                <ProgressBar percent={student.averageScore ?? 0} height={6} />
              </View>
              <Text style={[styles.score, { color: theme.colors.success }]}>{student.averageScore ?? 0}%</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SectionHeader title="Needs Attention" />
      <SurfaceCard padded={false} style={styles.card}>
        {needsAttention.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>All students are on track.</Text>
        ) : (
          needsAttention.map((student, index) => (
            <ListItem
              key={student.id}
              avatarName={student.name}
              title={student.name}
              subtitle={`Score ${student.averageScore ?? 0}% · Attendance ${student.attendancePercent ?? 0}%`}
              divider={index < needsAttention.length - 1}
              showChevron
              onPress={() => navigation.navigate('StudentProfile', { studentId: student.id })}
            />
          ))
        )}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  list: { gap: 16 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 13, fontWeight: '800' },
  rankInfo: { flex: 1, gap: 6 },
  name: { fontSize: 14, fontWeight: '600' },
  score: { fontSize: 14, fontWeight: '700', width: 44, textAlign: 'right' },
  card: { paddingHorizontal: 14 },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});
