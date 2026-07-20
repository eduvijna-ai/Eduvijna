import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { QuizListItem, QuizTile } from '../../core/types/quizAnalytics.types';

interface Props {
  quizName: string;
  className: string;
  topic?: string | null;
  quiz?: QuizListItem | null;
  tile?: QuizTile | null;
  colors: { card: string; border: string; text: string; textSecondary: string; primary: string };
}

export default function QuizDetailHeader({ quizName, className, topic, quiz, tile, colors }: Props) {
  const completed = tile?.completed_count ?? quiz?.completed_count ?? 0;
  const total = tile?.total_students ?? quiz?.total_students ?? 0;
  const avg = tile?.avg_score ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {quizName}
      </Text>
      {topic ? (
        <Text style={[styles.topic, { color: colors.textSecondary }]} numberOfLines={1}>
          {topic}
        </Text>
      ) : null}
      <Text style={[styles.className, { color: colors.textSecondary }]}>{className}</Text>

      <View style={styles.metrics}>
        {[
          { label: 'Completed', value: `${completed}/${total}`, color: '#059669' },
          { label: 'Rate', value: `${pct}%`, color: colors.primary },
          { label: 'Average', value: `${avg.toFixed(1)}%`, color: '#7c3aed' },
          {
            label: 'At Risk',
            value: String(tile?.at_risk_count ?? 0),
            color: (tile?.at_risk_count ?? 0) > 0 ? '#dc2626' : '#94a3b8',
          },
        ].map((m) => (
          <View key={m.label} style={[styles.metric, { borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{m.label}</Text>
            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
          </View>
        ))}
      </View>

      {quiz?.duration != null || quiz?.question_count != null ? (
        <View style={styles.metaRow}>
          {quiz?.duration != null ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{quiz.duration}m duration</Text>
          ) : null}
          {quiz?.question_count != null ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{quiz.question_count} questions</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  title: { fontSize: 17, fontWeight: '800' },
  topic: { fontSize: 13 },
  className: { fontSize: 12, fontWeight: '600' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  metric: {
    flexGrow: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  metricValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  meta: { fontSize: 11 },
});
