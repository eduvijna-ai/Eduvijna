import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseLogData } from '../../core/services/quizAnalyticsApi';
import { formatDate, formatDuration } from '../../core/utils/analyticsUiUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  quizName: string;
  studentName?: string;
  score: number | null;
  timeSpent: number | null;
  logData: string | null;
  submittedAt: string | null;
  colors: { card: string; background: string; text: string; textSecondary: string; border: string; primary: string };
}

export default function QuizAttemptDetailModal({
  visible,
  onClose,
  quizName,
  studentName,
  score,
  timeSpent,
  logData,
  submittedAt,
  colors,
}: Props) {
  const parsed = parseLogData(logData);
  const answers = parsed?.answers ?? [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{quizName}</Text>
            {studentName ? <Text style={[styles.sub, { color: colors.textSecondary }]}>{studentName}</Text> : null}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Score</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>{score !== null ? `${score}%` : '—'}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Time</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(timeSpent)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Submitted</Text>
              <Text style={[styles.statValue, { color: colors.text, fontSize: 12 }]}>{formatDate(submittedAt)}</Text>
            </View>
          </View>

          {answers.length > 0 ? (
            answers.map((a, i) => (
              <View key={i} style={[styles.qCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.qHeader}>
                  <Text style={[styles.qNum, { color: colors.textSecondary }]}>Q{a.questionNumber}</Text>
                  <Ionicons
                    name={a.isCorrect ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={a.isCorrect ? '#059669' : '#dc2626'}
                  />
                </View>
                <Text style={[styles.qText, { color: colors.text }]}>{a.question}</Text>
                <Text style={[styles.answerLine, { color: colors.textSecondary }]}>
                  Your answer: <Text style={{ color: colors.text, fontWeight: '600' }}>{a.userAnswer ?? '—'}</Text>
                </Text>
                <Text style={[styles.answerLine, { color: colors.textSecondary }]}>
                  Correct: <Text style={{ color: '#059669', fontWeight: '600' }}>{a.correctAnswer}</Text>
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No detailed answer data available</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '700' },
  sub: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 4 },
  body: { padding: 16, paddingBottom: 32 },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  stat: { flex: 1, padding: 14, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800' },
  qCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 10 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  qNum: { fontSize: 12, fontWeight: '700' },
  qText: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  answerLine: { fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14 },
});
