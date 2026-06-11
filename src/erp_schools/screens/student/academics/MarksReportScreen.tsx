/**
 * Marks Report — subject-wise marks with grade and progress.
 * Derived from the Academics "Subject Wise" view; reachable from More.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  ProgressBar,
  Badge,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentData } from '../../../hooks/useStudentData';

export default function MarksReportScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const { academics } = useStudentData();

  return (
    <TeacherScreen header={<ScreenHeader title="Marks Report" trailingIcon="download-outline" />} contentStyle={styles.content}>
      <SurfaceCard style={[styles.summaryCard, { backgroundColor: theme.colors.tintTeal }]}>
        <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>{academics.summary.overallAverage}%</Text>
        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Overall Average • Rank #{academics.summary.rank} of {academics.summary.classStrength}</Text>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Subject Wise Marks" />
        <SurfaceCard style={styles.listCard}>
          {academics.subjects.map((subject) => {
            const accent = accentColors(theme.colors, subject.accent);
            return (
              <View key={subject.id} style={styles.subjectRow}>
                <View style={styles.subjectHead}>
                  <View style={[styles.subjectIcon, { backgroundColor: accent.bg }]}>
                    <Ionicons name={subject.icon as keyof typeof Ionicons.glyphMap} size={16} color={accent.fg} />
                  </View>
                  <Text style={[styles.subjectName, { color: theme.colors.textPrimary }]}>{subject.subject}</Text>
                  <Text style={[styles.subjectTotal, { color: theme.colors.textSecondary }]}>{subject.total}</Text>
                  <Badge label={subject.grade} accent={subject.percent >= 90 ? 'green' : 'blue'} />
                </View>
                <ProgressBar
                  percent={subject.percent}
                  height={7}
                  color={subject.percent >= 90 ? theme.colors.success : subject.percent >= 75 ? theme.colors.primary : theme.colors.warning}
                />
              </View>
            );
          })}
        </SurfaceCard>
      </View>

      <SurfaceCard onPress={() => navigation.navigate('ProgressReport')}>
        <View style={styles.linkRow}>
          <View style={[styles.linkIcon, { backgroundColor: theme.colors.tintGreen }]}>
            <Ionicons name="trending-up" size={18} color={theme.colors.success} />
          </View>
          <View style={styles.linkInfo}>
            <Text style={[styles.linkTitle, { color: theme.colors.textPrimary }]}>View Progress Report</Text>
            <Text style={[styles.linkSub, { color: theme.colors.textSecondary }]}>Term-wise improvement over time</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  summaryCard: { alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 30, fontWeight: '800' },
  summaryLabel: { fontSize: 13 },
  section: { gap: 0 },
  listCard: { gap: 14 },
  subjectRow: { gap: 8 },
  subjectHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subjectIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  subjectName: { flex: 1, fontSize: 14, fontWeight: '600' },
  subjectTotal: { fontSize: 12, fontWeight: '600' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  linkInfo: { flex: 1 },
  linkTitle: { fontSize: 14, fontWeight: '700' },
  linkSub: { fontSize: 12, marginTop: 2 },
});
