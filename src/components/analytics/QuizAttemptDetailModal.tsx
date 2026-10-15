import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseLogData } from '../../core/services/quizAnalyticsApi';
import { formatDate, formatDuration } from '../../core/utils/analyticsUiUtils';
import { usePersistedQuizReview } from '../../core/hooks/usePersistedQuizReview';
import { evaluatePersistedAnswerCorrectness } from '../../core/utils/answerMappingUtils';

interface ReviewContext {
  studentId: string;
  quizId: number | string;
  sessionId?: string | null;
  classroomId?: string | null;
  attemptId?: number;
  isTeacherView?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  quizName: string;
  studentName?: string;
  score: number | null;
  timeSpent: number | null;
  logData: string | null;
  submittedAt: string | null;
  reviewContext?: ReviewContext | null;
  colors: {
    card: string;
    background: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
  };
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
  reviewContext,
  colors,
}: Props) {
  const persisted = usePersistedQuizReview({
    enabled: visible && !!reviewContext?.studentId && !!reviewContext?.quizId,
    quizId: reviewContext?.quizId,
    studentId: reviewContext?.studentId,
    sessionId: reviewContext?.sessionId,
    classroomId: reviewContext?.classroomId,
    attemptId: reviewContext?.attemptId,
    isTeacherView: reviewContext?.isTeacherView ?? true,
  });

  const parsed = parseLogData(logData);
  const legacyAnswers = parsed?.answers ?? [];

  const reviewRows = useMemo(() => {
    if (persisted.questions.length > 0) {
      return persisted.questions.map((question, index) => ({
        questionNumber: index + 1,
        question: question.question,
        userAnswer: persisted.userAnswers[index] ?? '',
        correctAnswer: question.correctAnswer || question.answer || '',
        isCorrect: evaluatePersistedAnswerCorrectness(persisted.userAnswers[index], question),
        options: question.options ?? [],
      }));
    }
    return legacyAnswers.map((a) => ({
      questionNumber: a.questionNumber,
      question: a.question,
      userAnswer: a.userAnswer ?? '',
      correctAnswer: a.correctAnswer,
      isCorrect: a.isCorrect,
      options: a.options ?? [],
    }));
  }, [legacyAnswers, persisted.questions, persisted.userAnswers]);

  const displayScore =
    persisted.score != null ? persisted.score : score;

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
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {displayScore !== null ? `${displayScore}%` : '—'}
              </Text>
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

          {persisted.loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading answers…</Text>
            </View>
          ) : null}

          {!persisted.loading && persisted.error ? (
            <View style={styles.empty}>
              <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{persisted.error}</Text>
            </View>
          ) : null}

          {!persisted.loading && !persisted.error && reviewRows.length > 0 ? (
            reviewRows.map((a, i) => (
              <View key={i} style={[styles.qCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.qHeader}>
                  <Text style={[styles.qNum, { color: colors.textSecondary }]}>Q{a.questionNumber}</Text>
                  <Ionicons
                    name={a.isCorrect === true ? 'checkmark-circle' : a.isCorrect === false ? 'close-circle' : 'help-circle'}
                    size={18}
                    color={a.isCorrect === true ? '#059669' : a.isCorrect === false ? '#dc2626' : '#94a3b8'}
                  />
                </View>
                <Text style={[styles.qText, { color: colors.text }]}>{a.question}</Text>
                {a.options.length === 0 ? (
                  <>
                    <Text style={[styles.answerLine, { color: colors.textSecondary }]}>
                      Your answer: <Text style={{ color: colors.text, fontWeight: '600' }}>{a.userAnswer || '—'}</Text>
                    </Text>
                    {a.correctAnswer ? (
                      <Text style={[styles.answerLine, { color: colors.textSecondary }]}>
                        Expected: <Text style={{ color: '#059669', fontWeight: '600' }}>{a.correctAnswer}</Text>
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={[styles.answerLine, { color: colors.textSecondary }]}>
                      Your answer: <Text style={{ color: colors.text, fontWeight: '600' }}>{a.userAnswer ?? '—'}</Text>
                    </Text>
                    <Text style={[styles.answerLine, { color: colors.textSecondary }]}>
                      Correct: <Text style={{ color: '#059669', fontWeight: '600' }}>{a.correctAnswer}</Text>
                    </Text>
                  </>
                )}
              </View>
            ))
          ) : !persisted.loading && !persisted.error ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No detailed answer data available</Text>
            </View>
          ) : null}
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
  body: { padding: 16, gap: 12 },
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700' },
  qCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  qNum: { fontSize: 12, fontWeight: '600' },
  qText: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  answerLine: { fontSize: 13, lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
