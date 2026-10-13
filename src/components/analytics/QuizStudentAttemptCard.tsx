import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { QuizAttemptViewRow } from '../../core/utils/teacherAnalyticsHelpers';
import { getAttemptSummaryText } from '../../core/utils/teacherAnalyticsHelpers';
import { formatDate, scoreColor } from '../../core/utils/analyticsUiUtils';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: '#dcfce7', text: '#059669' },
  pending: { bg: '#fef3c7', text: '#d97706' },
  missed: { bg: '#fee2e2', text: '#dc2626' },
};

interface Props {
  row: QuizAttemptViewRow;
  quizName: string;
  onView?: () => void;
  viewResultTestId?: string;
  colors: { card: string; border: string; text: string; textSecondary: string; primary: string };
}

export default function QuizStudentAttemptCard({
  row,
  quizName,
  onView,
  viewResultTestId,
  colors,
}: Props) {
  const isCompleted = row.status === 'completed';
  const statusStyle = STATUS_COLORS[row.derivedStatus] ?? STATUS_COLORS.pending;
  const summary = getAttemptSummaryText(row, isCompleted);

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      testID={
        row.attempt_id
          ? `analytics-student-attempt-${row.student_id}-${row.attempt_id}`
          : undefined
      }
      accessibilityLabel={`${row.student_fullname || row.student_username || 'Student'} attempt for ${quizName}`}
    >
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}14` }]}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>
            {row.student_fullname || row.student_username || 'Unknown'}
          </Text>
          {row.student_username ? (
            <Text style={[styles.username, { color: colors.textSecondary }]}>@{row.student_username}</Text>
          ) : null}
        </View>
        {row.score !== null ? (
          <Text style={[styles.score, { color: scoreColor(row.score) }]}>{row.score}%</Text>
        ) : (
          <Text style={[styles.score, { color: colors.textSecondary }]}>N/A</Text>
        )}
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>{row.derivedStatus}</Text>
        </View>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          Time: {row.time_spent_seconds ? `${row.time_spent_seconds}s` : 'N/A'}
        </Text>
      </View>

      <Text style={[styles.submitted, { color: colors.textSecondary }]}>
        {row.submitted_at ? formatDate(row.submitted_at) : 'Not submitted'}
      </Text>

      <Text style={[styles.summary, { color: colors.text }]} numberOfLines={2}>
        {summary}
      </Text>

      {isCompleted && onView ? (
        <TouchableOpacity
          style={[styles.viewBtn, { backgroundColor: colors.primary }]}
          onPress={onView}
          testID={viewResultTestId}
          accessibilityRole="button"
          accessibilityLabel={`View saved result for ${row.student_fullname || row.student_username || 'student'}`}
          collapsable={false}
          importantForAccessibility="yes"
        >
          <Text style={styles.viewBtnText}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '700' },
  username: { fontSize: 11, marginTop: 1 },
  score: { fontSize: 16, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  meta: { fontSize: 11 },
  submitted: { fontSize: 11 },
  summary: { fontSize: 12, lineHeight: 17 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  viewBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
