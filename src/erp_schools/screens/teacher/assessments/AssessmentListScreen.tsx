/** Assessment List — upcoming/ongoing/completed assessments. */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  StatGrid,
  FilterChips,
  Badge,
  type StatItem,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { assessments, assessmentsSummary } from '../../../data';
import type { Assessment, AssessmentState } from '../../../types/domain';

const FILTERS: ChipOption[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
];

const STATE_ACCENT: Record<AssessmentState, 'blue' | 'orange' | 'green'> = {
  upcoming: 'blue',
  ongoing: 'orange',
  completed: 'green',
};

export default function AssessmentListScreen() {
  const navigation = useTeacherNavigation();
  const [filter, setFilter] = useState('all');

  const stats: StatItem[] = [
    { key: 'upcoming', icon: 'hourglass-outline', value: assessmentsSummary.upcoming, label: 'Upcoming', accent: 'blue' },
    { key: 'ongoing', icon: 'flash-outline', value: assessmentsSummary.ongoing, label: 'Ongoing', accent: 'orange' },
    { key: 'completed', icon: 'checkmark-done-outline', value: assessmentsSummary.completed, label: 'Completed', accent: 'green' },
    { key: 'avg', icon: 'ribbon-outline', value: `${assessmentsSummary.avgScore}%`, label: 'Avg Score', accent: 'purple' },
  ];

  const filtered = useMemo(() => assessments.filter((a) => filter === 'all' || a.state === filter), [filter]);

  return (
    <TeacherScreen header={<ScreenHeader title="Assessments" trailingIcon="add" />} contentStyle={styles.content}>
      <SurfaceCard>
        <StatGrid items={stats} columns={4} />
      </SurfaceCard>

      <FilterChips options={FILTERS} activeKey={filter} onChange={setFilter} />

      {filtered.map((assessment) => (
        <AssessmentCard key={assessment.id} assessment={assessment} onPress={() => navigation.navigate('AssessmentDetails', { assessmentId: assessment.id })} />
      ))}
    </TeacherScreen>
  );
}

function AssessmentCard({ assessment, onPress }: { assessment: Assessment; onPress: () => void }) {
  const theme = useTeacherTheme();
  return (
    <SurfaceCard onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{assessment.title}</Text>
          <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>Class {assessment.classCode} • {assessment.subject}</Text>
        </View>
        <Badge label={assessment.state.charAt(0).toUpperCase() + assessment.state.slice(1)} accent={STATE_ACCENT[assessment.state]} />
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={theme.colors.textSecondary} />
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{assessment.date}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="school-outline" size={13} color={theme.colors.textSecondary} />
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>Max {assessment.maxMarks}</Text>
        </View>
        {assessment.averageScore != null ? (
          <View style={styles.metaItem}>
            <Ionicons name="trending-up-outline" size={13} color={theme.colors.success} />
            <Text style={[styles.metaText, { color: theme.colors.success }]}>Avg {assessment.averageScore}%</Text>
          </View>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardMeta: { fontSize: 12 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
});
