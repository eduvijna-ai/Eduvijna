/**
 * Exams — exam KPIs, upcoming / ongoing exams, recent results & quick links.
 * Reference: assets/admin_screens/admin exams screen.png
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
  type QuickAction,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminData } from '../../../hooks/useAdminData';
import type { AdminExam } from '../../../types/admin';

export default function ExamsScreen() {
  const theme = useTeacherTheme();
  const { exams } = useAdminData();

  const quickLinks: QuickAction[] = [
    { key: 'tt', icon: 'calendar-outline', label: 'Exam Timetable', accent: 'teal', onPress: () => undefined },
    { key: 'guide', icon: 'document-text-outline', label: 'Guidelines', accent: 'purple', onPress: () => undefined },
    { key: 'perf', icon: 'bar-chart-outline', label: 'Performance', accent: 'orange', onPress: () => undefined },
    { key: 'mark', icon: 'bookmark-outline', label: 'Marking Scheme', accent: 'pink', onPress: () => undefined },
  ];

  const ExamRow = ({ exam, last }: { exam: AdminExam; last: boolean }) => (
    <View
      style={[
        styles.examRow,
        !last && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.dateChip, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Text style={[styles.dateDay, { color: theme.colors.textPrimary }]}>{exam.day}</Text>
        <Text style={[styles.dateMonth, { color: theme.colors.textSecondary }]}>{exam.month}</Text>
        <Text style={[styles.dateWeekday, { color: theme.colors.textSecondary }]}>{exam.weekday}</Text>
      </View>
      <View style={styles.examInfo}>
        <Text style={[styles.examTitle, { color: theme.colors.textPrimary }]}>{exam.title}</Text>
        <Text style={[styles.examMeta, { color: theme.colors.textSecondary }]}>{exam.grade} • {exam.subject}</Text>
        <View style={styles.examTimeRow}>
          <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
          <Text style={[styles.examMeta, { color: theme.colors.textSecondary }]}>{exam.timeLabel}</Text>
        </View>
      </View>
      {exam.averageScore != null ? (
        <View style={styles.scoreWrap}>
          <Text style={[styles.scoreValue, { color: theme.colors.primary }]}>{exam.averageScore}%</Text>
          <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>Avg</Text>
        </View>
      ) : (
        <Badge label={exam.badgeLabel} accent={exam.state === 'ongoing' ? 'green' : 'blue'} />
      )}
    </View>
  );

  return (
    <TeacherScreen header={<ScreenHeader title="Exams" />} contentStyle={styles.content}>
      <StatGrid items={exams.kpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Upcoming Exams" actionLabel="View All" onAction={() => undefined} />
        {exams.upcoming.map((exam, index) => (
          <ExamRow key={exam.id} exam={exam} last={index === exams.upcoming.length - 1} />
        ))}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Ongoing Exams" />
        {exams.ongoing.map((exam, index) => (
          <ExamRow key={exam.id} exam={exam} last={index === exams.ongoing.length - 1} />
        ))}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Recent Results" actionLabel="View All" onAction={() => undefined} />
        {exams.recent.map((exam, index) => (
          <ExamRow key={exam.id} exam={exam} last={index === exams.recent.length - 1} />
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
