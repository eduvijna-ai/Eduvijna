/**
 * Assignments — stat summary, status tabs and assignment cards.
 * Reference: assets/student_screens/student assignments screen.png
 */

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentModuleHeader,
  SurfaceCard,
  SectionHeader,
  SegmentedControl,
  StatusPill,
  type PillStatus,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentData } from '../../../hooks/useStudentData';
import type { StudentAssignment, StudentAssignmentStatus } from '../../../types/student';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'overdue', label: 'Overdue' },
];

const STATUS_PILL: Record<StudentAssignmentStatus, PillStatus> = {
  pending: 'pending',
  submitted: 'submitted',
  overdue: 'rejected',
  graded: 'graded',
};

function AssignmentCard({ item, onPress }: { item: StudentAssignment; onPress: () => void }) {
  const theme = useTeacherTheme();
  const accent = accentColors(theme.colors, item.accent);
  return (
    <SurfaceCard onPress={onPress}>
      <View style={styles.cardRow}>
        <View style={[styles.cardIcon, { backgroundColor: accent.bg }]}>
          <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={accent.fg} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
            <StatusPill status={STATUS_PILL[item.status]} label={item.status === 'overdue' ? 'Overdue' : undefined} showIcon={false} />
          </View>
          <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
          <View style={styles.cardMetaRow}>
            <Ionicons name="calendar-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>
              {item.submittedLabel ?? item.dueLabel}
            </Text>
            {item.marks != null ? (
              <Text style={[styles.cardMarks, { color: theme.colors.success }]}>{item.marks}/{item.maxMarks}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
}

export default function AssignmentsScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const { assignments } = useStudentData();
  const [tab, setTab] = useState('all');

  const stats = [
    { key: 'total', value: assignments.stats.total, label: 'Total\nAssignments', icon: 'documents-outline' as const, color: theme.colors.info },
    { key: 'submitted', value: assignments.stats.submitted, label: 'Submitted', icon: 'paper-plane-outline' as const, color: theme.colors.success },
    { key: 'pending', value: assignments.stats.pending, label: 'Pending', icon: 'hourglass-outline' as const, color: theme.colors.warning },
    { key: 'overdue', value: assignments.stats.overdue, label: 'Overdue', icon: 'alert-circle-outline' as const, color: theme.colors.danger },
  ];

  const { upcoming, completed } = useMemo(() => {
    const list = assignments.list;
    const filtered = tab === 'all'
      ? list.filter((a) => a.status !== 'graded')
      : list.filter((a) => a.status === tab);
    return {
      upcoming: filtered.filter((a) => a.status === 'pending' || a.status === 'overdue' || tab === 'submitted'),
      completed: list.filter((a) => a.status === 'submitted' || a.status === 'graded'),
    };
  }, [assignments.list, tab]);

  return (
    <TeacherScreen
      header={
        <StudentModuleHeader title="Assignments" trailingIcon="document-text-outline" />
      }
      contentStyle={styles.content}
    >
      <SurfaceCard>
        <View style={styles.statsRow}>
          {stats.map((stat, index) => (
            <React.Fragment key={stat.key}>
              {index > 0 ? <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} /> : null}
              <View style={styles.stat}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{String(stat.value).padStart(2, '0')}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]} numberOfLines={2}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </SurfaceCard>

      <SegmentedControl segments={TABS} activeKey={tab} onChange={setTab} />

      <View style={styles.section}>
        <SectionHeader title="Upcoming & Pending" />
        <View style={styles.list}>
          {upcoming.length > 0 ? (
            upcoming.map((item) => (
              <AssignmentCard key={item.id} item={item} onPress={() => navigation.navigate('AssignmentDetails', { assignmentId: item.id })} />
            ))
          ) : (
            <SurfaceCard>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No assignments in this view.</Text>
            </SurfaceCard>
          )}
        </View>
      </View>

      {tab === 'all' ? (
        <View style={styles.section}>
          <SectionHeader title="Completed Assignments" actionLabel="View All" onAction={() => navigation.navigate('AssignmentPerformance')} />
          <View style={styles.list}>
            {completed.slice(0, 2).map((item) => (
              <AssignmentCard key={item.id} item={item} onPress={() => navigation.navigate('AssignmentDetails', { assignmentId: item.id })} />
            ))}
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.perfLink, { backgroundColor: theme.colors.tintTeal }]}
        onPress={() => navigation.navigate('AssignmentPerformance')}
        accessibilityRole="button"
        accessibilityLabel="View assignment performance"
      >
        <Ionicons name="bar-chart" size={18} color={theme.colors.primary} />
        <Text style={[styles.perfLinkText, { color: theme.colors.primary }]}>View Assignment Performance</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
      </TouchableOpacity>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  statsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 2 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, textAlign: 'center', lineHeight: 13 },

  section: { gap: 0 },
  list: { gap: 12 },
  cardRow: { flexDirection: 'row', gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  cardDesc: { fontSize: 12, lineHeight: 17 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  cardMeta: { flex: 1, fontSize: 11 },
  cardMarks: { fontSize: 12, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 8 },

  perfLink: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  perfLinkText: { flex: 1, fontSize: 14, fontWeight: '700' },
});
