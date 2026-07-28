/**
 * Progress Report — term-over-term improvement and per-subject trend.
 * Derived from the Academics "Term Comparison" view; reachable from More.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentModuleHeader,
  SurfaceCard,
  SectionHeader,
  BarChart,
  ProgressBar,
  InfoBanner,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';

export default function ProgressReportScreen() {
  const theme = useTeacherTheme();
  const { academics } = useStudentData();

  const trend = academics.termComparison.map((t) => ({ label: t.label, value: t.percent }));
  const first = academics.termComparison[0]?.percent ?? 0;
  const last = academics.termComparison[academics.termComparison.length - 1]?.percent ?? 0;
  const improvement = Math.round((last - first) * 10) / 10;

  return (
    <TeacherScreen
      header={<StudentModuleHeader title="Progress Report" trailingIcon="download-outline" />}
      contentStyle={styles.content}
    >
      <SurfaceCard style={[styles.heroCard, { backgroundColor: theme.colors.tintGreen }]}>
        <Ionicons name="trending-up" size={28} color={theme.colors.success} />
        <Text style={[styles.heroValue, { color: theme.colors.success }]}>↑ {improvement}%</Text>
        <Text style={[styles.heroLabel, { color: theme.colors.textSecondary }]}>Improvement from Term 1 to Term 3</Text>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Term Comparison" />
        <SurfaceCard>
          <BarChart data={trend} barColor={theme.colors.info} />
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Subject Trend (This Term)" />
        <SurfaceCard style={styles.listCard}>
          {academics.subjects.slice(0, 6).map((subject) => {
            const accent = accentColors(theme.colors, subject.accent);
            return (
              <View key={subject.id} style={styles.row}>
                <View style={[styles.icon, { backgroundColor: accent.bg }]}>
                  <Ionicons name={subject.icon as keyof typeof Ionicons.glyphMap} size={15} color={accent.fg} />
                </View>
                <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{subject.subject}</Text>
                <View style={styles.bar}><ProgressBar percent={subject.percent} height={6} /></View>
                <Text style={[styles.pct, { color: theme.colors.textSecondary }]}>{subject.percent}%</Text>
              </View>
            );
          })}
        </SurfaceCard>
      </View>

      <InfoBanner tone="tip" icon="bulb-outline" title="Keep it up!" text="Your steady improvement shows consistent effort. Focus on Social Science to push your average higher." />
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  heroCard: { alignItems: 'center', gap: 4 },
  heroValue: { fontSize: 28, fontWeight: '800' },
  heroLabel: { fontSize: 13 },
  section: { gap: 0 },
  listCard: { gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  name: { width: 96, fontSize: 13, fontWeight: '600' },
  bar: { flex: 1 },
  pct: { width: 38, textAlign: 'right', fontSize: 12, fontWeight: '600' },
});
