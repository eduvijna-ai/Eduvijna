import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { QuizListItem, QuizTile } from '../../core/types/quizAnalytics.types';
import type { QuizPerformanceSummary } from '../../core/utils/teacherAnalyticsHelpers';

interface Props {
  tile: QuizTile;
  originalQuiz?: QuizListItem;
  classroomName: string;
  performanceSummary: QuizPerformanceSummary;
  urgency: { level: 'critical' | 'warning' | 'normal' | 'expired'; text: string };
  onViewAnalytics: () => void;
  colors: {
    card: string;
    border: string;
    text: string;
    textSecondary: string;
    primary: string;
    background: string;
  };
}

const URGENCY_COLORS = {
  critical: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  warning: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  normal: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  expired: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
};

export default function AnalyticsQuizCard({
  tile,
  originalQuiz,
  classroomName,
  performanceSummary,
  urgency,
  onViewAnalytics,
  colors,
}: Props) {
  const urgencyStyle = URGENCY_COLORS[urgency.level];
  const total = tile.total_students || 0;
  const completed = tile.completed_count || 0;
  const inProgress = tile.in_progress_count || 0;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const pendingPct = Math.max(0, 100 - completionPct - inProgressPct);

  const duration = originalQuiz?.duration ?? 0;
  const questionCount = originalQuiz?.question_count ?? 0;
  const missedCount = tile.missed_count ?? 0;

  const hasMetrics =
    tile.highest_score !== undefined ||
    tile.lowest_score !== undefined ||
    tile.avg_score !== undefined ||
    tile.at_risk_count !== undefined;

  return (
    <View
      testID={`analytics-quiz-card-${tile.quiz_id}-${tile.session_id}`}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderLeftColor: urgency.level === 'warning' || urgency.level === 'critical' ? urgencyStyle.text : '#f59e0b',
        },
      ]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {tile.quiz_name}
          </Text>
          {tile.topic ? (
            <Text style={[styles.topic, { color: colors.textSecondary }]} numberOfLines={1}>
              {tile.topic}
            </Text>
          ) : null}
        </View>
        {classroomName ? (
          <View style={[styles.classBadge, { backgroundColor: '#fef3c7' }]}>
            <Text style={styles.classBadgeText} numberOfLines={1}>
              {classroomName}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.urgencyBadge, { backgroundColor: urgencyStyle.bg, borderColor: urgencyStyle.border }]}>
        {urgency.level === 'critical' ? (
          <Ionicons name="alert-circle" size={14} color={urgencyStyle.text} />
        ) : null}
        <Text style={[styles.urgencyText, { color: urgencyStyle.text }]}>{urgency.text}</Text>
      </View>

      <View style={styles.progressWrap}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          {completionPct > 0 ? (
            <View style={[styles.segmentCompleted, { width: `${completionPct}%` }]} />
          ) : null}
          {inProgressPct > 0 ? (
            <View style={[styles.segmentInProgress, { width: `${inProgressPct}%` }]} />
          ) : null}
          {pendingPct > 0 ? (
            <View style={[styles.segmentPending, { width: `${pendingPct}%` }]} />
          ) : null}
        </View>
        <View style={styles.progressMeta}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {completed} of {total} completed
          </Text>
          <Text style={[styles.progressPct, { color: colors.text }]}>{completionPct}%</Text>
        </View>
      </View>

      {hasMetrics ? (
        <View style={styles.metricsGrid}>
          {[
            { label: 'Highest', value: tile.highest_score != null ? `${tile.highest_score.toFixed(1)}%` : '--' },
            { label: 'Average', value: tile.avg_score !== undefined ? `${tile.avg_score.toFixed(1)}%` : '--' },
            { label: 'Lowest', value: tile.lowest_score != null ? `${tile.lowest_score.toFixed(1)}%` : '--' },
            { label: 'At-Risk', value: String(tile.at_risk_count ?? 0) },
          ].map((m) => (
            <View key={m.label} style={[styles.metricItem, { borderColor: colors.border }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{m.label}</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{m.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.performanceSection, { borderColor: colors.border }]}>
        <View style={styles.performanceHeader}>
          <Text style={[styles.performanceTitle, { color: colors.text }]}>Student Performance Overview</Text>
          <Text style={[styles.performanceMeta, { color: colors.textSecondary }]}>
            Improving: {performanceSummary.improvingCount} · Consistent: {performanceSummary.consistentCount}
          </Text>
        </View>
        {performanceSummary.totalStudents === 0 ? (
          <Text style={[styles.performanceEmpty, { color: colors.textSecondary }]}>
            No completed attempts available.
          </Text>
        ) : (
          <>
            <View style={styles.performanceColumns}>
              <View style={styles.performanceColumn}>
                <Text style={[styles.columnTitle, { color: colors.text }]}>Top 3 ({'>='} 80%)</Text>
                {performanceSummary.topPerformers.length === 0 ? (
                  <Text style={[styles.performanceEmpty, { color: colors.textSecondary }]}>
                    No students above 80%.
                  </Text>
                ) : (
                  performanceSummary.topPerformers.map((s, idx) => (
                    <Text key={`${s.username}-${idx}`} style={[styles.perfLine, { color: colors.text }]}>
                      {idx + 1}. {s.username} ({s.avgScore.toFixed(1)}%)
                    </Text>
                  ))
                )}
              </View>
              <View style={styles.performanceColumn}>
                <Text style={[styles.columnTitle, { color: colors.text }]}>Bottom 3 ({'<='} 40%)</Text>
                {performanceSummary.bottomPerformers.length === 0 ? (
                  <Text style={[styles.performanceEmpty, { color: colors.textSecondary }]}>
                    No students at or below 40%.
                  </Text>
                ) : (
                  performanceSummary.bottomPerformers.map((s, idx) => (
                    <Text key={`${s.username}-${idx}`} style={[styles.perfLine, { color: colors.text }]}>
                      {idx + 1}. {s.username} ({s.avgScore.toFixed(1)}%)
                    </Text>
                  ))
                )}
              </View>
            </View>
            <Text style={[styles.columnTitle, { color: colors.text, marginTop: 8 }]}>Performance Categories</Text>
            <View style={styles.categoryGrid}>
              {performanceSummary.categories.map((c) => (
                <View key={c.label} style={[styles.categoryItem, { borderColor: colors.border }]}>
                  <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>{c.label}</Text>
                  <Text style={[styles.categoryValue, { color: colors.text }]}>
                    {c.count} ({Math.round(c.percent)}%)
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.quickStats}>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>{duration}m</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="help-circle-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>{questionCount}Q</Text>
          </View>
        </View>
        <View style={styles.studentStats}>
          {[
            { label: 'Total', value: total },
            { label: 'Completed', value: completed },
            { label: 'Pending', value: tile.pending_count },
            ...(missedCount > 0 ? [{ label: 'Missed', value: missedCount }] : []),
          ].map((s) => (
            <View key={s.label} style={[styles.studentPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>{s.label}:</Text>
              <Text style={[styles.pillValue, { color: colors.text }]}>{s.value}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.viewBtn, { backgroundColor: colors.primary }]}
          onPress={() => onViewAnalytics()}
          activeOpacity={0.85}
          testID={`analytics-quiz-view-${tile.quiz_id}-${tile.session_id}-open`}
          accessibilityRole="button"
          accessibilityLabel={`View analytics for ${tile.quiz_name} in ${classroomName}`}
        >
          <Text style={styles.viewBtnText}>View Analytics</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 15, fontWeight: '700' },
  topic: { fontSize: 12, marginTop: 2 },
  classBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, maxWidth: 120 },
  classBadgeText: { fontSize: 10, fontWeight: '700', color: '#92400e' },
  urgencyBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  urgencyText: { fontSize: 11, fontWeight: '600' },
  progressWrap: { gap: 4 },
  progressTrack: { height: 8, borderRadius: 4, flexDirection: 'row', overflow: 'hidden' },
  segmentCompleted: { height: '100%', backgroundColor: '#059669' },
  segmentInProgress: { height: '100%', backgroundColor: '#2563eb' },
  segmentPending: { height: '100%', backgroundColor: '#e2e8f0' },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 11 },
  progressPct: { fontSize: 11, fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metricItem: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  metricValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  performanceSection: { borderTopWidth: 1, paddingTop: 10, gap: 6 },
  performanceHeader: { gap: 2 },
  performanceTitle: { fontSize: 13, fontWeight: '700' },
  performanceMeta: { fontSize: 11 },
  performanceEmpty: { fontSize: 12, fontStyle: 'italic' },
  performanceColumns: { flexDirection: 'row', gap: 8 },
  performanceColumn: { flex: 1, gap: 2 },
  columnTitle: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  perfLine: { fontSize: 11 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryItem: { width: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 6, padding: 6 },
  categoryLabel: { fontSize: 10 },
  categoryValue: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  footer: { gap: 8, marginTop: 4 },
  quickStats: { flexDirection: 'row', gap: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, fontWeight: '600' },
  studentStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  studentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillLabel: { fontSize: 10, fontWeight: '600' },
  pillValue: { fontSize: 11, fontWeight: '800' },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  viewBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
