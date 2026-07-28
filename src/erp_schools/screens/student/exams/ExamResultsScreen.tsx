/**
 * Exam Results — web student subject performance (mySubjectPerformance).
 * Honest rollup by subject — not staff published class results / report cards.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentModuleHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  DonutChart,
  Badge,
  ProgressBar,
  EmptyState,
  type StatItem,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentExams } from '../../../hooks/useStudentExams';

function gradeFromPct(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'E';
}

export default function ExamResultsScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const exams = useStudentExams();

  const onRefresh = useCallback(() => {
    void exams.refetch();
  }, [exams]);

  const overall = exams.overallPct;
  const grade = gradeFromPct(overall);

  const stats: StatItem[] = [
    {
      key: 'avg',
      icon: 'trophy-outline',
      value: `${overall % 1 === 0 ? overall.toFixed(0) : overall.toFixed(1)}%`,
      label: 'Overall',
      accent: 'blue',
    },
    { key: 'grade', icon: 'ribbon-outline', value: grade, label: 'Grade', accent: 'green' },
    {
      key: 'subjects',
      icon: 'book-outline',
      value: String(exams.perfRows.length),
      label: 'Subjects',
      accent: 'orange',
    },
  ];

  return (
    <TeacherScreen
      header={
        <StudentModuleHeader
          title="Subject Performance"
          trailingIcon="refresh-outline"
          onTrailingPress={onRefresh}
          trailingAccessibilityLabel="Refresh results"
        />
      }
      contentStyle={styles.content}
      refreshing={exams.status === 'loading'}
      onRefresh={onRefresh}
    >
      <View style={styles.heroBlock}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>My Assessments</Text>
        <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
          Subject-wise performance from published exam marks. Open Exam Schedule for the datesheet.
        </Text>
      </View>

      {exams.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{exams.error}</Text>
      ) : null}

      {exams.status === 'loading' && exams.perfRows.length === 0 ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 16 }} />
      ) : null}

      {exams.perfRows.length === 0 && exams.status === 'ready' ? (
        <EmptyState
          icon="ribbon-outline"
          title="No performance data yet"
          message="Subject scores will appear here after your school publishes exam marks."
          ctaLabel="View Schedule"
          onCtaPress={() => navigation.navigate('ExamSchedule')}
        />
      ) : (
        <>
          <SurfaceCard>
            <Text style={[styles.examName, { color: theme.colors.textPrimary }]}>
              Subject Performance
            </Text>
            <View style={styles.summaryRow}>
              <DonutChart
                size={120}
                strokeWidth={16}
                centerValue={`${overall % 1 === 0 ? overall.toFixed(0) : overall.toFixed(1)}%`}
                centerLabel={`Grade ${grade}`}
                segments={[
                  { value: Math.max(overall, 0), color: theme.colors.success },
                  {
                    value: Math.max(100 - overall, 0),
                    color: theme.colors.surfaceAlt,
                  },
                ]}
              />
              <View style={styles.summaryStats}>
                <StatGrid items={stats} columns={3} variant="tinted" />
              </View>
            </View>
          </SurfaceCard>

          <View style={styles.section}>
            <SectionHeader
              title="Subject Wise"
              actionLabel="Schedule"
              onAction={() => navigation.navigate('ExamSchedule')}
            />
            <SurfaceCard style={styles.listCard}>
              {exams.perfRows.map((result) => {
                const accent = accentColors(theme.colors, result.accent);
                return (
                  <View key={result.id} style={styles.resultRow}>
                    <View style={[styles.icon, { backgroundColor: accent.bg }]}>
                      <Ionicons
                        name={result.icon as keyof typeof Ionicons.glyphMap}
                        size={16}
                        color={accent.fg}
                      />
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={[styles.subject, { color: theme.colors.textPrimary }]}>
                        {result.subject}
                      </Text>
                      <ProgressBar
                        percent={result.percent}
                        height={5}
                        color={
                          result.percent >= 90 ? theme.colors.success : theme.colors.primary
                        }
                      />
                      {result.examCount > 0 ? (
                        <Text style={[styles.examCount, { color: theme.colors.textSecondary }]}>
                          {result.examCount} exam{result.examCount === 1 ? '' : 's'} counted
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.marks, { color: theme.colors.textSecondary }]}>
                      {result.obtained}/{result.maxMarks}
                    </Text>
                    <Badge
                      label={result.grade}
                      accent={result.percent >= 90 ? 'green' : 'blue'}
                    />
                  </View>
                );
              })}
            </SurfaceCard>
          </View>
        </>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 28 },
  heroBlock: { gap: 2 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroSub: { fontSize: 13, lineHeight: 18 },
  examName: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryStats: { flex: 1 },
  section: { gap: 0 },
  listCard: { gap: 14 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: { flex: 1, gap: 4 },
  subject: { fontSize: 13, fontWeight: '600' },
  examCount: { fontSize: 10 },
  marks: { fontSize: 12, fontWeight: '600' },
});
