/**
 * Reports Dashboard — class analytics overview (attendance donut, assignment
 * breakdown, assessment bar chart, report center).
 * Reference: assets/teachers_screens/teachers_reports screens.png
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  ClassContextBanner,
  SurfaceCard,
  StatGrid,
  DonutChart,
  BarChart,
  ProgressBar,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors } from '../../../theme/accents';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';
import {
  reportOverview,
  attendanceReportBuckets,
  assignmentBreakdown,
  assessmentScoreBuckets,
  assessmentSummary,
  reportCenter,
} from '../../../data';

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'stats-chart-outline' as const },
  { key: 'students', label: 'Students', icon: 'people-outline' as const },
  { key: 'attendance', label: 'Attendance', icon: 'calendar-outline' as const },
  { key: 'assignments', label: 'Assignments', icon: 'clipboard-outline' as const },
  { key: 'assessments', label: 'Assessments', icon: 'ribbon-outline' as const },
];

export default function ReportsDashboardScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { classes } = useTeacherData();
  const classInfo = classes[0];
  const [activeTab, setActiveTab] = useState('overview');

  const overviewStats: StatItem[] = reportOverview.map((item) => ({
    key: item.key,
    icon: item.iconName as StatItem['icon'],
    value: item.value,
    label: item.label,
    accent: item.accent,
    trend: item.trend,
  }));

  return (
    <TeacherScreen
      header={<ScreenHeader title="Reports" showBack trailingIcon="ellipsis-horizontal" />}
      contentStyle={styles.content}
    >
      {classInfo ? (
        <ClassContextBanner code={classInfo.code} name={classInfo.name} subject={classInfo.subject} room={classInfo.room} studentCount={classInfo.studentCount} />
      ) : null}

      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <TouchableOpacity key={tab.key} style={styles.tab} onPress={() => setActiveTab(tab.key)} accessibilityRole="tab" accessibilityState={{ selected: active }}>
              <Ionicons name={tab.icon} size={20} color={active ? theme.colors.primary : theme.colors.textSecondary} />
              <Text style={[styles.tabLabel, { color: active ? theme.colors.primary : theme.colors.textSecondary }]}>{tab.label}</Text>
              {active ? <View style={[styles.tabUnderline, { backgroundColor: theme.colors.primary }]} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.rangeRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Class Overview</Text>
        <TouchableOpacity style={[styles.rangePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
          <Text style={[styles.rangeText, { color: theme.colors.textPrimary }]}>This Month (May 2025)</Text>
          <Ionicons name="chevron-down" size={13} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <StatGrid items={overviewStats} columns={2} />

      <SurfaceCard>
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Attendance Summary</Text>
        <View style={styles.attendanceRow}>
          <DonutChart
            size={130}
            strokeWidth={16}
            centerValue="92%"
            centerLabel="Avg Attendance"
            segments={[
              { value: 91, color: theme.colors.success },
              { value: 6, color: theme.colors.warning },
              { value: 3, color: theme.colors.danger },
            ]}
          />
          <View style={styles.attendanceLegend}>
            {attendanceReportBuckets.map((bucket) => {
              const color = bucket.status === 'present' ? theme.colors.success : bucket.status === 'late' ? theme.colors.warning : theme.colors.danger;
              return (
                <View key={bucket.status} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>{bucket.label}</Text>
                  <Text style={[styles.legendValue, { color: theme.colors.textPrimary }]}>{bucket.count} ({bucket.percent}%)</Text>
                </View>
              );
            })}
            <TouchableOpacity style={styles.viewLink} onPress={() => navigation.navigate('AttendanceAnalytics')}>
              <Text style={[styles.viewLinkText, { color: theme.colors.primary }]}>View Attendance Report</Text>
              <Ionicons name="chevron-forward" size={13} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Assignment Summary</Text>
          <TouchableOpacity style={styles.viewLink} onPress={() => navigation.navigate('AssignmentAnalytics')}>
            <Text style={[styles.viewLinkText, { color: theme.colors.primary }]}>View Assignment Report</Text>
            <Ionicons name="chevron-forward" size={13} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <ProgressBar
          height={10}
          segments={[
            { percent: assignmentBreakdown.submitted.percent, color: theme.colors.success },
            { percent: assignmentBreakdown.pending.percent, color: theme.colors.warning },
            { percent: assignmentBreakdown.notSubmitted.percent, color: theme.colors.danger },
          ]}
        />
        <View style={styles.assignLegend}>
          <LegendCount color={theme.colors.success} label="Submitted" value={`${assignmentBreakdown.submitted.count} (${assignmentBreakdown.submitted.percent}%)`} />
          <LegendCount color={theme.colors.warning} label="Pending" value={`${assignmentBreakdown.pending.count} (${assignmentBreakdown.pending.percent}%)`} />
          <LegendCount color={theme.colors.danger} label="Not Submitted" value={`${assignmentBreakdown.notSubmitted.count} (${assignmentBreakdown.notSubmitted.percent}%)`} />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Assessment Performance</Text>
          <TouchableOpacity style={styles.viewLink} onPress={() => navigation.navigate('AssessmentAnalytics')}>
            <Text style={[styles.viewLinkText, { color: theme.colors.primary }]}>View Assessment Report</Text>
            <Ionicons name="chevron-forward" size={13} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.assessRow}>
          <View style={styles.chartWrap}>
            <BarChart data={assessmentScoreBuckets.map((bucket) => ({ label: bucket.range, value: bucket.count }))} />
          </View>
          <View style={[styles.gradeBox, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Text style={[styles.gradeLabel, { color: theme.colors.textSecondary }]}>Average Score</Text>
            <Text style={[styles.gradeValue, { color: theme.colors.textPrimary }]}>{assessmentSummary.averageScore}%</Text>
            <Text style={[styles.gradeLabel, { color: theme.colors.textSecondary }]}>Class Grade</Text>
            <View style={[styles.gradePill, { backgroundColor: theme.colors.tintGreen }]}>
              <Text style={[styles.gradePillText, { color: theme.colors.success }]}>{assessmentSummary.classGrade}</Text>
            </View>
          </View>
        </View>
      </SurfaceCard>

      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Report Center</Text>
      <View style={styles.reportGrid}>
        {reportCenter.map((report) => {
          const accent = accentColors(theme.colors, 'teal');
          return (
            <SurfaceCard key={report.key} style={styles.reportCard} onPress={() => navigation.navigate(report.route)}>
              <View style={[styles.reportIcon, { backgroundColor: accent.bg }]}>
                <Ionicons name={report.iconName as keyof typeof Ionicons.glyphMap} size={18} color={accent.fg} />
              </View>
              <Text style={[styles.reportTitle, { color: theme.colors.textPrimary }]}>{report.title}</Text>
              <Text style={[styles.reportSub, { color: theme.colors.textSecondary }]}>{report.subtitle}</Text>
            </SurfaceCard>
          );
        })}
      </View>
    </TeacherScreen>
  );
}

function LegendCount({ color, label, value }: { color: string; label: string; value: string }) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.legendCount}>
      <View style={styles.legendCountTop}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={[styles.legendCountLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.legendCountValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  tabsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingBottom: 8 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabUnderline: { position: 'absolute', bottom: 0, height: 2, width: 28, borderRadius: 2 },

  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  rangePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 34, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  rangeText: { fontSize: 11, fontWeight: '600' },

  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  attendanceLegend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 9, height: 9, borderRadius: 4.5 },
  legendLabel: { flex: 1, fontSize: 13 },
  legendValue: { fontSize: 13, fontWeight: '700' },
  viewLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  viewLinkText: { fontSize: 12, fontWeight: '600' },

  assignLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  legendCount: { gap: 4 },
  legendCountTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendCountLabel: { fontSize: 12 },
  legendCountValue: { fontSize: 13, fontWeight: '700' },

  assessRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  chartWrap: { flex: 1 },
  gradeBox: { width: 110, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  gradeLabel: { fontSize: 10 },
  gradeValue: { fontSize: 22, fontWeight: '800' },
  gradePill: { paddingHorizontal: 12, paddingVertical: 2, borderRadius: 999, marginTop: 2 },
  gradePillText: { fontSize: 14, fontWeight: '800' },

  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  reportCard: { width: '48.5%', gap: 6 },
  reportIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reportTitle: { fontSize: 13, fontWeight: '700' },
  reportSub: { fontSize: 11 },
});
