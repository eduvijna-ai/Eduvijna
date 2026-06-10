/** Assessment Analytics — score distribution + class average + grade. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  BarChart,
  Badge,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { assessmentScoreBuckets, assessmentSummary, assessments } from '../../../data';

export default function AssessmentAnalyticsScreen() {
  const theme = useTeacherTheme();
  const completed = assessments.filter((a) => a.state === 'completed');

  return (
    <TeacherScreen header={<ScreenHeader title="Assessment Analytics" trailingIcon="download-outline" />} contentStyle={styles.content}>
      <SurfaceCard>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>{assessmentSummary.averageScore}%</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Average Score</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.summaryItem}>
            <View style={[styles.gradePill, { backgroundColor: theme.colors.tintGreen }]}>
              <Text style={[styles.gradeText, { color: theme.colors.success }]}>{assessmentSummary.classGrade}</Text>
            </View>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Class Grade</Text>
          </View>
        </View>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Score Distribution" />
        <SurfaceCard>
          <BarChart data={assessmentScoreBuckets.map((bucket) => ({ label: bucket.range, value: bucket.count }))} />
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Completed Assessments" />
        <SurfaceCard padded={false} style={styles.card}>
          {completed.map((assessment, index) => (
            <View key={assessment.id} style={[styles.row, index < completed.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>{assessment.title}</Text>
                <Text style={[styles.rowMeta, { color: theme.colors.textSecondary }]}>Class {assessment.classCode} • {assessment.date}</Text>
              </View>
              <Badge label={`Avg ${assessment.averageScore}%`} accent="green" />
            </View>
          ))}
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  divider: { width: StyleSheet.hairlineWidth, height: 44 },
  summaryValue: { fontSize: 26, fontWeight: '800' },
  summaryLabel: { fontSize: 12 },
  gradePill: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: 999 },
  gradeText: { fontSize: 20, fontWeight: '800' },
  section: { gap: 0 },
  card: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 12 },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowMeta: { fontSize: 11 },
});
