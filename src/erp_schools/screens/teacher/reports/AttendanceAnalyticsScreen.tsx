/** Attendance Analytics — donut + monthly trend + per-class comparison. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  DonutChart,
  BarChart,
  ProgressBar,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { attendanceReportBuckets } from '../../../data';

export default function AttendanceAnalyticsScreen() {
  const theme = useTeacherTheme();
  const { classes } = useTeacherData();

  const monthlyTrend = [
    { label: 'Jan', value: 88 },
    { label: 'Feb', value: 90 },
    { label: 'Mar', value: 87 },
    { label: 'Apr', value: 87 },
    { label: 'May', value: 92 },
  ];

  return (
    <TeacherScreen header={<ScreenHeader title="Attendance Analytics" trailingIcon="download-outline" />} contentStyle={styles.content}>
      <SurfaceCard>
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Overall (This Month)</Text>
        <View style={styles.row}>
          <DonutChart size={130} strokeWidth={16} centerValue="92%" centerLabel="Average"
            segments={[
              { value: 91, color: theme.colors.success },
              { value: 6, color: theme.colors.warning },
              { value: 3, color: theme.colors.danger },
            ]}
          />
          <View style={styles.legend}>
            {attendanceReportBuckets.map((bucket) => {
              const color = bucket.status === 'present' ? theme.colors.success : bucket.status === 'late' ? theme.colors.warning : theme.colors.danger;
              return (
                <View key={bucket.status} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>{bucket.label}</Text>
                  <Text style={[styles.legendValue, { color: theme.colors.textPrimary }]}>{bucket.percent}%</Text>
                </View>
              );
            })}
          </View>
        </View>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Monthly Trend" />
        <SurfaceCard>
          <BarChart data={monthlyTrend} barColor={theme.colors.primary} />
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="By Class" />
        <SurfaceCard>
          <View style={styles.classList}>
            {classes.map((classInfo, index) => {
              const percent = 88 + ((index * 3) % 10);
              return (
                <View key={classInfo.id} style={styles.classRow}>
                  <Text style={[styles.className, { color: theme.colors.textPrimary }]}>{classInfo.name}</Text>
                  <View style={styles.classBar}><ProgressBar percent={percent} height={6} /></View>
                  <Text style={[styles.classPct, { color: theme.colors.textSecondary }]}>{percent}%</Text>
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
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  legendLabel: { flex: 1, fontSize: 13 },
  legendValue: { fontSize: 13, fontWeight: '700' },
  section: { gap: 0 },
  classList: { gap: 14 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  className: { width: 78, fontSize: 13, fontWeight: '600' },
  classBar: { flex: 1 },
  classPct: { fontSize: 12, fontWeight: '600', width: 36, textAlign: 'right' },
});
