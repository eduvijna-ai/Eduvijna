/**
 * Exam Results — overall result summary + subject-wise marks and grades.
 * Derived from the academics/exam domain (screens.md "Exam Results").
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentIdentityHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  DonutChart,
  Badge,
  ProgressBar,
  type StatItem,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';

export default function ExamResultsScreen() {
  const theme = useTeacherTheme();
  const { profile, exams } = useStudentData();
  const summary = exams.resultsSummary;

  const stats: StatItem[] = [
    { key: 'avg', icon: 'trophy-outline', value: `${summary.overallPercent}%`, label: 'Overall', accent: 'blue' },
    { key: 'grade', icon: 'ribbon-outline', value: summary.grade, label: 'Grade', accent: 'green' },
    { key: 'rank', icon: 'podium-outline', value: `#${summary.rank}`, label: `of ${summary.classStrength}`, accent: 'orange' },
  ];

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Exam Results"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
          trailingIcon="download-outline"
        />
      }
      contentStyle={styles.content}
    >
      <SurfaceCard>
        <Text style={[styles.examName, { color: theme.colors.textPrimary }]}>{summary.examName}</Text>
        <View style={styles.summaryRow}>
          <DonutChart
            size={120}
            strokeWidth={16}
            centerValue={`${summary.overallPercent}%`}
            centerLabel={`Grade ${summary.grade}`}
            segments={[
              { value: summary.overallPercent, color: theme.colors.success },
              { value: 100 - summary.overallPercent, color: theme.colors.surfaceAlt },
            ]}
          />
          <View style={styles.summaryStats}>
            <StatGrid items={stats} columns={3} variant="tinted" />
          </View>
        </View>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Subject Wise Results" />
        <SurfaceCard style={styles.listCard}>
          {exams.results.map((result) => {
            const accent = accentColors(theme.colors, result.accent);
            return (
              <View key={result.id} style={styles.resultRow}>
                <View style={[styles.icon, { backgroundColor: accent.bg }]}>
                  <Ionicons name={result.icon as keyof typeof Ionicons.glyphMap} size={16} color={accent.fg} />
                </View>
                <View style={styles.resultInfo}>
                  <Text style={[styles.subject, { color: theme.colors.textPrimary }]}>{result.subject}</Text>
                  <ProgressBar percent={result.percent} height={5} color={result.percent >= 90 ? theme.colors.success : theme.colors.primary} />
                </View>
                <Text style={[styles.marks, { color: theme.colors.textSecondary }]}>{result.obtained}/{result.maxMarks}</Text>
                <Badge label={result.grade} accent={result.percent >= 90 ? 'green' : 'blue'} />
              </View>
            );
          })}
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  examName: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryStats: { flex: 1 },
  section: { gap: 0 },
  listCard: { gap: 14 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1, gap: 4 },
  subject: { fontSize: 13, fontWeight: '600' },
  marks: { fontSize: 12, fontWeight: '600' },
});
