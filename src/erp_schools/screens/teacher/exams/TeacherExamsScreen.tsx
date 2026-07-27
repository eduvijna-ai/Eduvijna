/**
 * Teacher Exams — placeholder UI (mock fixtures).
 * Avoids useAdminData admin APIs that return 403 for instructors and force logout.
 * Live exams parity will be wired later.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  Badge,
  QuickActionGrid,
  InfoBanner,
  type QuickAction,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  examKpis,
  upcomingExams,
  ongoingExams,
  recentExamResults,
} from '../../../data/admin/academics';
import type { AdminExam } from '../../../types/admin';

export default function TeacherExamsScreen() {
  const theme = useTeacherTheme();

  const quickLinks: QuickAction[] = [
    {
      key: 'tt',
      icon: 'calendar-outline',
      label: 'Exam Timetable',
      accent: 'teal',
      onPress: () => undefined,
    },
    {
      key: 'guide',
      icon: 'document-text-outline',
      label: 'Guidelines',
      accent: 'purple',
      onPress: () => undefined,
    },
    {
      key: 'perf',
      icon: 'bar-chart-outline',
      label: 'Performance',
      accent: 'orange',
      onPress: () => undefined,
    },
    {
      key: 'mark',
      icon: 'bookmark-outline',
      label: 'Marking Scheme',
      accent: 'pink',
      onPress: () => undefined,
    },
  ];

  const ExamRow = ({ exam, last }: { exam: AdminExam; last: boolean }) => (
    <View
      style={[
        styles.examRow,
        !last && {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={[styles.dateChip, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Text style={[styles.dateDay, { color: theme.colors.textPrimary }]}>{exam.day}</Text>
        <Text style={[styles.dateMonth, { color: theme.colors.textSecondary }]}>{exam.month}</Text>
        <Text style={[styles.dateWeekday, { color: theme.colors.textSecondary }]}>
          {exam.weekday}
        </Text>
      </View>
      <View style={styles.examInfo}>
        <Text style={[styles.examTitle, { color: theme.colors.textPrimary }]}>{exam.title}</Text>
        <Text style={[styles.examMeta, { color: theme.colors.textSecondary }]}>
          {exam.grade} • {exam.subject}
        </Text>
        <View style={styles.examTimeRow}>
          <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
          <Text style={[styles.examMeta, { color: theme.colors.textSecondary }]}>
            {exam.timeLabel}
          </Text>
        </View>
      </View>
      {exam.averageScore != null ? (
        <View style={styles.scoreWrap}>
          <Text style={[styles.scoreValue, { color: theme.colors.primary }]}>
            {exam.averageScore}%
          </Text>
          <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>Avg</Text>
        </View>
      ) : (
        <Badge
          label={exam.badgeLabel}
          accent={exam.state === 'ongoing' ? 'green' : 'blue'}
        />
      )}
    </View>
  );

  return (
    <TeacherScreen header={<ScreenHeader title="Exams" />} contentStyle={styles.content}>
      <InfoBanner text="Exam schedule preview. Live exam APIs will be connected in a later update." />
      <StatGrid items={examKpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Upcoming Exams" />
        {upcomingExams.map((exam, index) => (
          <ExamRow key={exam.id} exam={exam} last={index === upcomingExams.length - 1} />
        ))}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Ongoing Exams" />
        {ongoingExams.map((exam, index) => (
          <ExamRow key={exam.id} exam={exam} last={index === ongoingExams.length - 1} />
        ))}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Recent Results" />
        {recentExamResults.map((exam, index) => (
          <ExamRow key={exam.id} exam={exam} last={index === recentExamResults.length - 1} />
        ))}
      </SurfaceCard>

      <View>
        <SectionHeader title="Quick Links" />
        <QuickActionGrid actions={quickLinks} columns={4} />
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  examRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dateChip: { width: 48, borderRadius: 12, alignItems: 'center', paddingVertical: 6 },
  dateDay: { fontSize: 16, fontWeight: '800' },
  dateMonth: { fontSize: 10, fontWeight: '600' },
  dateWeekday: { fontSize: 9 },
  examInfo: { flex: 1, gap: 2 },
  examTitle: { fontSize: 14, fontWeight: '700' },
  examMeta: { fontSize: 12 },
  examTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreWrap: { alignItems: 'center' },
  scoreValue: { fontSize: 16, fontWeight: '800' },
  scoreLabel: { fontSize: 10 },
});
