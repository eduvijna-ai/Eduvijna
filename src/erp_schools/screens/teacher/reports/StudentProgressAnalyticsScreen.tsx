/**
 * Student Progress Analytics — live top performers + students needing attention.
 * Data: roster + attendance records % + exam marks avg (not mock fixtures).
 */

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
  EmptyState,
  ScreenLoader,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useStudentProgressAnalytics } from '../../../hooks/useStudentProgressAnalytics';

export default function StudentProgressAnalyticsScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const {
    studentCount,
    avgScore,
    avgAttendance,
    topPerformers,
    needsAttention,
    dateRange,
    status,
    error,
    refetch,
  } = useStudentProgressAnalytics();

  const bootLoading = status === 'idle' || status === 'loading';

  const stats: StatItem[] = [
    {
      key: 'students',
      icon: 'people-outline',
      value: bootLoading ? '…' : studentCount,
      label: 'Students',
      accent: 'blue',
    },
    {
      key: 'score',
      icon: 'ribbon-outline',
      value: bootLoading ? '…' : avgScore != null ? `${avgScore}%` : '—',
      label: 'Avg Score',
      accent: 'purple',
    },
    {
      key: 'attendance',
      icon: 'calendar-outline',
      value: bootLoading ? '…' : avgAttendance != null ? `${avgAttendance}%` : '—',
      label: 'Avg Attendance',
      accent: 'green',
    },
  ];

  return (
    <TeacherScreen
      header={<ScreenHeader title="Student Progress" trailingIcon="download-outline" />}
      contentStyle={styles.content}
      refreshing={status === 'loading'}
      onRefresh={() => void refetch()}
    >
      <Text style={[styles.rangeHint, { color: theme.colors.textSecondary }]}>
        Based on records from {dateRange.from} to {dateRange.to}
      </Text>

      <SurfaceCard>
        <StatGrid items={stats} columns={3} />
      </SurfaceCard>

      {error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text>
      ) : null}

      {bootLoading ? (
        <ScreenLoader message="Loading progress analytics…" />
      ) : (
        <>
          <SectionHeader title="Top Performers" />
          <SurfaceCard>
            {topPerformers.length === 0 ? (
              <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                No exam marks yet for your students.
              </Text>
            ) : (
              <View style={styles.list}>
                {topPerformers.map((student, index) => (
                  <View key={student.id} style={styles.rankRow}>
                    <View style={[styles.rank, { backgroundColor: theme.colors.tintTeal }]}>
                      <Text style={[styles.rankText, { color: theme.colors.primary }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.rankInfo}>
                      <Text
                        style={[styles.name, { color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {student.name}
                      </Text>
                      <ProgressBar percent={student.averageScore} height={6} />
                    </View>
                    <Text style={[styles.score, { color: theme.colors.success }]}>
                      {student.averageScore}%
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </SurfaceCard>

          <SectionHeader title="Needs Attention" />
          <SurfaceCard padded={false} style={styles.card}>
            {needsAttention.length === 0 ? (
              <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                {studentCount === 0
                  ? 'No students in your roster.'
                  : 'All students with data are on track.'}
              </Text>
            ) : (
              needsAttention.map((student, index) => (
                <ListItem
                  key={student.id}
                  avatarName={student.name}
                  title={student.name}
                  subtitle={`Score ${
                    student.hasScoreData ? `${student.averageScore}%` : '—'
                  } · Attendance ${
                    student.hasAttendanceData ? `${student.attendancePercent}%` : '—'
                  }`}
                  divider={index < needsAttention.length - 1}
                  showChevron
                  onPress={() =>
                    navigation.navigate('StudentProfile', { studentId: student.id })
                  }
                />
              ))
            )}
          </SurfaceCard>

          {studentCount === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No students"
              message="Students assigned to you will appear here."
            />
          ) : null}
        </>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  rangeHint: { fontSize: 11, fontWeight: '600' },
  list: { gap: 16 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 13, fontWeight: '800' },
  rankInfo: { flex: 1, gap: 6 },
  name: { fontSize: 14, fontWeight: '600' },
  score: { fontSize: 14, fontWeight: '700', width: 52, textAlign: 'right' },
  card: { paddingHorizontal: 14 },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});
