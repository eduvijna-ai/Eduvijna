/** Assignment Dashboard — summary stats + filterable assignment list. */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  StatGrid,
  FilterChips,
  SectionHeader,
  StatusPill,
  ProgressBar,
  PrimaryButton,
  type StatItem,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { assignments, assignmentsSummary } from '../../../data';
import type { Assignment } from '../../../types/domain';

const FILTERS: ChipOption[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'closed', label: 'Closed' },
  { key: 'draft', label: 'Drafts' },
];

export default function AssignmentDashboardScreen() {
  const navigation = useTeacherNavigation();
  const [filter, setFilter] = useState('all');

  const stats: StatItem[] = [
    { key: 'active', icon: 'flash-outline', value: assignmentsSummary.active, label: 'Active', accent: 'green' },
    { key: 'scheduled', icon: 'time-outline', value: assignmentsSummary.scheduled, label: 'Scheduled', accent: 'blue' },
    { key: 'closed', icon: 'lock-closed-outline', value: assignmentsSummary.closed, label: 'Closed', accent: 'teal' },
    { key: 'drafts', icon: 'create-outline', value: assignmentsSummary.drafts, label: 'Drafts', accent: 'orange' },
  ];

  const filtered = useMemo(
    () => assignments.filter((a) => filter === 'all' || a.status === filter),
    [filter],
  );

  return (
    <TeacherScreen
      header={<ScreenHeader title="Assignments" trailingIcon="add" onTrailingPress={() => navigation.navigate('CreateAssignment')} />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Create Assignment" icon="add-circle-outline" onPress={() => navigation.navigate('CreateAssignment')} />}
    >
      <SurfaceCard>
        <StatGrid items={stats} columns={4} />
      </SurfaceCard>

      <FilterChips options={FILTERS} activeKey={filter} onChange={setFilter} />

      <View style={styles.section}>
        <SectionHeader title="Assignments" />
        {filtered.map((assignment) => (
          <AssignmentCard key={assignment.id} assignment={assignment} onPress={() => navigation.navigate('AssignmentSubmissions', { assignmentId: assignment.id })} />
        ))}
      </View>
    </TeacherScreen>
  );
}

function AssignmentCard({ assignment, onPress }: { assignment: Assignment; onPress: () => void }) {
  const theme = useTeacherTheme();
  const percent = assignment.total > 0 ? Math.round((assignment.submitted / assignment.total) * 100) : 0;

  return (
    <SurfaceCard onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{assignment.title}</Text>
          <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>Class {assignment.classCode} • {assignment.subject}</Text>
        </View>
        <StatusPill status={assignment.status} showIcon={false} />
      </View>
      <View style={styles.dueRow}>
        <Ionicons name="calendar-outline" size={13} color={theme.colors.textSecondary} />
        <Text style={[styles.dueText, { color: theme.colors.textSecondary }]}>Due {assignment.dueDate}</Text>
      </View>
      <View style={styles.progressRow}>
        <ProgressBar percent={percent} height={6} />
        <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>{assignment.submitted}/{assignment.total}</Text>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  section: { gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardMeta: { fontSize: 12 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  dueText: { fontSize: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  progressText: { fontSize: 11, fontWeight: '600' },
});
