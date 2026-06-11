/**
 * Assignment Performance — stats, distribution donut, per-subject progress and
 * recent graded assignments.
 * Reference: assets/student_screens/student assignments performance screen.png
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentIdentityHeader,
  SegmentedControl,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  DonutChart,
  ProgressBar,
  ListItem,
  InfoBanner,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';
import { useStudentUIStore } from '../../../store/studentUI.store';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'subject', label: 'Subject Wise' },
  { key: 'trend', label: 'Trend' },
  { key: 'detailed', label: 'Detailed' },
];

const DIST_COLOR = { success: 'success', info: 'info', warning: 'warning', danger: 'danger' } as const;

export default function AssignmentPerformanceScreen() {
  const theme = useTeacherTheme();
  const { profile, assignments } = useStudentData();
  const termRange = useStudentUIStore((s) => s.termRange);
  const [tab, setTab] = useState('overview');

  const p = assignments;
  const stats: StatItem[] = [
    { key: 'total', icon: 'documents-outline', value: p.performanceStats.total, label: 'Total\nAssignments', accent: 'blue' },
    { key: 'submitted', icon: 'checkmark-circle-outline', value: p.performanceStats.submitted, label: 'Submitted', accent: 'green' },
    { key: 'graded', icon: 'star-outline', value: p.performanceStats.graded, label: 'Graded', accent: 'orange' },
    { key: 'avg', icon: 'trending-up-outline', value: `${p.performanceStats.averageScore}%`, label: 'Average\nScore', accent: 'red' },
  ];

  const graded = assignments.list.filter((a) => a.status === 'graded');

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Assignment Performance"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
          trailingIcon="calendar-outline"
          rightSlot={
            <View style={[styles.termPill, { borderColor: theme.colors.border }]}>
              <Text style={[styles.termText, { color: theme.colors.textSecondary }]}>{termRange}</Text>
              <Ionicons name="chevron-down" size={13} color={theme.colors.textSecondary} />
            </View>
          }
        />
      }
      contentStyle={styles.content}
    >
      <StatGrid items={stats} columns={4} />

      <SegmentedControl segments={TABS} activeKey={tab} onChange={setTab} />

      {tab === 'overview' || tab === 'trend' ? (
        <SurfaceCard>
          <View style={styles.perfHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Overall Performance</Text>
            <View style={[styles.avgBox, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Text style={[styles.avgLabel, { color: theme.colors.textSecondary }]}>Average Score</Text>
              <Text style={[styles.avgValue, { color: theme.colors.success }]}>{p.performanceStats.averageScore}%</Text>
              <Text style={[styles.avgNote, { color: theme.colors.textSecondary }]}>Good Job! 👏</Text>
            </View>
          </View>
          <View style={styles.donutRow}>
            <DonutChart
              size={120}
              strokeWidth={16}
              centerValue={`${p.performanceStats.averageScore}%`}
              centerLabel="Avg. Score"
              segments={[
                { value: p.performanceStats.averageScore, color: theme.colors.success },
                { value: 100 - p.performanceStats.averageScore, color: theme.colors.surfaceAlt },
              ]}
            />
            <View style={styles.legend}>
              {p.performanceDistribution.map((band) => (
                <View key={band.label} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: theme.colors[DIST_COLOR[band.color]] }]} />
                  <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>{band.label}</Text>
                  <Text style={[styles.legendCount, { color: theme.colors.textPrimary }]}>{band.count}</Text>
                </View>
              ))}
            </View>
          </View>
        </SurfaceCard>
      ) : null}

      {tab === 'overview' || tab === 'subject' ? (
        <View style={styles.section}>
          <SectionHeader title="Performance by Subject" actionLabel={tab === 'overview' ? 'View All' : undefined} onAction={tab === 'overview' ? () => setTab('subject') : undefined} />
          <SurfaceCard style={styles.listCardGap}>
            {p.subjectPerformance.map((subject) => (
              <View key={subject.id} style={styles.subjectRow}>
                <Ionicons name={subject.icon as keyof typeof Ionicons.glyphMap} size={18} color={theme.colors.primary} />
                <Text style={[styles.subjectName, { color: theme.colors.textPrimary }]}>{subject.subject}</Text>
                <Text style={[styles.subjectCount, { color: theme.colors.textSecondary }]}>{subject.completed} / {subject.total}</Text>
                <View style={styles.subjectBar}>
                  <ProgressBar percent={subject.percent} height={6} color={subject.percent >= 85 ? theme.colors.success : subject.percent >= 70 ? theme.colors.primary : theme.colors.warning} />
                </View>
                <Text style={[styles.subjectPct, { color: subject.percent >= 70 ? theme.colors.success : theme.colors.warning }]}>{subject.percent}%</Text>
              </View>
            ))}
          </SurfaceCard>
        </View>
      ) : null}

      {tab === 'overview' || tab === 'detailed' ? (
        <View style={styles.section}>
          <SectionHeader title="Recent Graded Assignments" />
          <SurfaceCard padded={false} style={styles.listCard}>
            {graded.map((item, index) => (
              <ListItem
                key={item.id}
                icon={item.icon as keyof typeof Ionicons.glyphMap}
                iconAccent={item.accent}
                title={item.title}
                subtitle={`${item.dueLabel} • ${item.submittedLabel ?? ''}`}
                divider={index < graded.length - 1}
                trailing={
                  <View style={styles.gradedTrailing}>
                    <Text style={[styles.gradedMarks, { color: theme.colors.success }]}>{item.marks} / {item.maxMarks}</Text>
                    <Text style={[styles.gradedPct, { color: theme.colors.textSecondary }]}>
                      {item.marks != null && item.maxMarks ? Math.round((item.marks / item.maxMarks) * 100) : 0}%
                    </Text>
                  </View>
                }
              />
            ))}
          </SurfaceCard>
        </View>
      ) : null}

      <InfoBanner tone="tip" icon="star" title="Keep it up, Aarav! 🎉" text="You are performing great. Try submitting assignments early to improve even more!" />
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  termPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  termText: { fontSize: 12, fontWeight: '600' },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  avgBox: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  avgLabel: { fontSize: 10 },
  avgValue: { fontSize: 20, fontWeight: '800' },
  avgNote: { fontSize: 10 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  legendLabel: { flex: 1, fontSize: 12 },
  legendCount: { fontSize: 13, fontWeight: '700' },
  section: { gap: 0 },
  listCard: { paddingHorizontal: 14 },
  listCardGap: { gap: 12 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectName: { width: 92, fontSize: 13, fontWeight: '600' },
  subjectCount: { width: 34, fontSize: 11 },
  subjectBar: { flex: 1 },
  subjectPct: { width: 38, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  gradedTrailing: { alignItems: 'flex-end' },
  gradedMarks: { fontSize: 13, fontWeight: '700' },
  gradedPct: { fontSize: 11 },
});
