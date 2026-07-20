import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { QuizSummaryRow } from '../../core/utils/teacherAnalyticsHelpers';
import { formatScoreValue } from '../../core/utils/teacherAnalyticsHelpers';

interface Props {
  row: QuizSummaryRow;
  onPress: () => void;
  colors: { card: string; border: string; text: string; textSecondary: string; primary: string };
}

export default function QuizPerformanceSummaryCard({ row, onPress, colors }: Props) {
  const completionColor =
    row.completion_rate >= 80 ? '#059669' : row.completion_rate >= 50 ? '#d97706' : '#dc2626';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.primary }]} numberOfLines={2}>{row.quiz_name}</Text>
          {row.topic ? <Text style={[styles.topic, { color: colors.textSecondary }]} numberOfLines={1}>{row.topic}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>

      <View style={styles.statsGrid}>
        <Stat label="Students" value={String(row.total_students)} />
        <Stat label="Done" value={String(row.completed)} color="#059669" />
        <Stat label="Pending" value={String(row.pending)} color="#d97706" />
        <Stat label="Not Done" value={String(row.not_completed)} color="#dc2626" />
      </View>

      <View style={styles.statsGrid}>
        <Stat label="Highest" value={formatScoreValue(row.highest_score)} />
        <Stat label="Average" value={row.avg_score > 0 ? `${row.avg_score.toFixed(1)}%` : '—'} />
        <Stat label="Lowest" value={formatScoreValue(row.lowest_score)} />
        <Stat label="At Risk" value={String(row.at_risk)} color={row.at_risk > 0 ? '#dc2626' : undefined} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.distRow}>
        <DistPill label="80–100%" value={row.dist_80_100} />
        <DistPill label="60–80%" value={row.dist_60_80} />
        <DistPill label="40–60%" value={row.dist_40_60} />
        <DistPill label="0–40%" value={row.dist_0_40} />
        <DistPill label="Qs" value={row.questions || '—'} />
        <DistPill label="Time" value={row.duration ? `${row.duration}m` : '—'} />
        <DistPill label="Completion" value={`${row.completion_rate.toFixed(0)}%`} color={completionColor} />
      </ScrollView>
    </TouchableOpacity>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function DistPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={[styles.pillValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  name: { fontSize: 14, fontWeight: '700' },
  topic: { fontSize: 11, marginTop: 2 },
  statsGrid: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  stat: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 8, alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' },
  statValue: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginTop: 2 },
  distRow: { gap: 6, paddingTop: 4 },
  pill: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  pillLabel: { fontSize: 9, color: '#64748b', fontWeight: '600' },
  pillValue: { fontSize: 12, fontWeight: '800', color: '#1e293b', marginTop: 2 },
});
