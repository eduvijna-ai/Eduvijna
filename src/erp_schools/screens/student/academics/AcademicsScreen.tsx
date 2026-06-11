/**
 * Academics — marks overview, distribution, subject-wise marks and term trend.
 * Reference: assets/student_screens/student academic marks screen.png
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentIdentityHeader,
  IconTabs,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  DonutChart,
  BarChart,
  ProgressBar,
  ListItem,
  InfoBanner,
  Badge,
  AcademicYearPill,
  type StatItem,
  type IconTab,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentData } from '../../../hooks/useStudentData';
import { useStudentUIStore } from '../../../store/studentUI.store';

const TABS: IconTab[] = [
  { key: 'overview', label: 'Overview', icon: 'stats-chart-outline' },
  { key: 'term', label: 'Term Wise', icon: 'calendar-outline' },
  { key: 'subject', label: 'Subject Wise', icon: 'book-outline' },
  { key: 'detailed', label: 'Detailed Report', icon: 'document-text-outline' },
];

const BAND_COLOR = {
  success: 'success',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
} as const;

export default function AcademicsScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const { profile, academics, academicYears } = useStudentData();
  const academicYear = useStudentUIStore((s) => s.academicYear);
  const setAcademicYear = useStudentUIStore((s) => s.setAcademicYear);
  const [tab, setTab] = useState('overview');

  const summary = academics.summary;
  const stats: StatItem[] = [
    { key: 'avg', icon: 'trophy-outline', value: `${summary.overallAverage}%`, label: 'Overall Average', accent: 'blue' },
    { key: 'rank', icon: 'podium-outline', value: `#${summary.rank} / ${summary.classStrength}`, label: 'Rank', accent: 'green' },
    { key: 'subjects', icon: 'albums-outline', value: summary.subjects, label: 'Subjects', accent: 'purple' },
    { key: 'imp', icon: 'trending-up-outline', value: `↑ ${summary.improvement}%`, label: 'vs Last Term', accent: 'orange' },
  ];

  const maxBand = Math.max(...academics.distribution.map((b) => b.count), 1);
  const termTrend = academics.termComparison.map((t) => ({ label: t.label, value: t.percent }));

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Academics"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
          trailingIcon="calendar-outline"
          rightSlot={<AcademicYearPill value={academicYear} options={academicYears} onChange={setAcademicYear} />}
        />
      }
      contentStyle={styles.content}
    >
      <StatGrid items={stats} columns={4} />

      <View style={styles.tabsWrap}>
        <IconTabs tabs={TABS} activeKey={tab} onChange={setTab} />
      </View>

      {tab === 'overview' ? (
        <>
          <SurfaceCard>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Overall Performance</Text>
            <View style={styles.performRow}>
              <DonutChart
                size={120}
                strokeWidth={16}
                centerValue={`${summary.overallAverage}%`}
                centerLabel="Average"
                segments={[
                  { value: summary.overallAverage, color: theme.colors.info },
                  { value: 100 - summary.overallAverage, color: theme.colors.surfaceAlt },
                ]}
              />
              <View style={styles.bands}>
                {academics.distribution.map((band) => (
                  <View key={band.range} style={styles.bandRow}>
                    <Text style={[styles.bandLabel, { color: theme.colors.textSecondary }]}>{band.range}</Text>
                    <View style={styles.bandBar}>
                      <ProgressBar percent={(band.count / maxBand) * 100} height={6} color={theme.colors[BAND_COLOR[band.color]]} />
                    </View>
                    <Text style={[styles.bandCount, { color: theme.colors.textPrimary }]}>{band.count}</Text>
                  </View>
                ))}
              </View>
            </View>
          </SurfaceCard>

          <InfoBanner tone="tip" icon="star" title="Excellent work, Aarav! 🎉" text="You are performing above the class average." />

          <SurfaceCard padded={false} style={styles.listCard}>
            <View style={styles.listHeader}>
              <SectionHeader title="Subject Wise Marks" actionLabel="View Detailed" onAction={() => setTab('subject')} />
            </View>
            {academics.subjects.map((subject, index) => (
              <ListItem
                key={subject.id}
                icon={subject.icon as keyof typeof Ionicons.glyphMap}
                iconAccent={subject.accent}
                title={subject.subject}
                subtitle={`Total ${subject.total} • ${subject.percent}%`}
                divider={index < academics.subjects.length - 1}
                onPress={() => navigation.navigate('SubjectDetails', { subjectId: subject.id })}
                trailing={<Badge label={subject.grade} accent={subject.percent >= 90 ? 'green' : 'blue'} />}
                showChevron
              />
            ))}
          </SurfaceCard>
        </>
      ) : null}

      {tab === 'term' ? (
        <>
          <SurfaceCard>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Term Comparison</Text>
            <BarChart data={termTrend} barColor={theme.colors.info} />
          </SurfaceCard>
          <SurfaceCard padded={false} style={styles.listCard}>
            {academics.termComparison.map((term, index) => (
              <ListItem
                key={term.label}
                icon="calendar-outline"
                iconAccent="blue"
                title={term.label}
                subtitle={`Overall average ${term.percent}%`}
                divider={index < academics.termComparison.length - 1}
                trailing={<Text style={[styles.termPct, { color: theme.colors.primary }]}>{term.percent}%</Text>}
              />
            ))}
          </SurfaceCard>
        </>
      ) : null}

      {(tab === 'subject' || tab === 'detailed') ? (
        <>
          {tab === 'detailed' ? (
            <InfoBanner text="Select a subject to view its detailed assessment breakdown and grade." />
          ) : null}
          <SurfaceCard padded={false} style={styles.listCard}>
            {academics.subjects.map((subject, index) => (
              <ListItem
                key={subject.id}
                icon={subject.icon as keyof typeof Ionicons.glyphMap}
                iconAccent={subject.accent}
                title={subject.subject}
                subtitle={`${subject.total} • Grade ${subject.grade}`}
                divider={index < academics.subjects.length - 1}
                onPress={() => navigation.navigate('SubjectDetails', { subjectId: subject.id })}
                trailing={
                  <View style={styles.subjPct}>
                    <Text style={[styles.subjPctText, { color: theme.colors.primary }]}>{subject.percent}%</Text>
                  </View>
                }
                showChevron
              />
            ))}
          </SurfaceCard>
        </>
      ) : null}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  tabsWrap: { marginHorizontal: -16, paddingHorizontal: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  performRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bands: { flex: 1, gap: 12 },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bandLabel: { width: 64, fontSize: 11 },
  bandBar: { flex: 1 },
  bandCount: { width: 18, textAlign: 'right', fontSize: 13, fontWeight: '700' },
  listCard: { paddingHorizontal: 14 },
  listHeader: { paddingTop: 14 },
  termPct: { fontSize: 15, fontWeight: '800' },
  subjPct: { alignItems: 'flex-end' },
  subjPctText: { fontSize: 14, fontWeight: '800' },
});
