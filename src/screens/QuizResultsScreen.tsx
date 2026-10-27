import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@core/hooks/useAuth';
import { updateQuestionExplanation } from '@core/services/sharedApi';
import { fetchPersistedQuizResult } from '@core/services/quizResultRetrieval.service';
import QuizExplanationAccordion from '../components/QuizExplanationAccordion';
import { useTeacherTheme } from '../erp_schools/theme/useTeacherTheme';
import {
  evaluatePersistedAnswerCorrectness,
  isOptionTheCorrectAnswer,
  isOptionTheUserAnswer,
} from '@core/utils/answerMappingUtils';
import EducationalContent from '../components/EducationalContent';

interface QuizResultsScreenProps {
  route: any;
  navigation: any;
}

export default function QuizResultsScreen({ route, navigation }: QuizResultsScreenProps) {
  const {
    quizData: initialQuizData,
    userAnswers: initialUserAnswers,
    score,
    correctCount,
    totalQuestions,
    isTeacherView,
    quizId,
    attemptId,
    studentId,
    studentName,
    quizName,
    attemptData: passedAttemptData,
    questions: passedQuestions,
    submission: passedSubmission,
    assessmentId,
    sessionId,
    classroomId: routeClassroomId,
  } = route.params || {};

  const theme = useTeacherTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Explanation editing is only available when we have a saved user-assessment
  // id to PATCH against, and only for teachers / admins.
  const canEditExplanations =
    !!assessmentId &&
    (user?.role === 'instructor' || user?.role === 'admin');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [explanationDrafts, setExplanationDrafts] = useState<{ [key: number]: string }>({});
  const [savedExplanations, setSavedExplanations] = useState<{ [key: number]: string }>({});
  const [savingExplanationIdx, setSavingExplanationIdx] = useState<number | null>(null);

  const handleSaveExplanation = async (index: number) => {
    const draft = (explanationDrafts[index] ?? '').trim();
    setSavingExplanationIdx(index);
    try {
      await updateQuestionExplanation(Number(assessmentId), index, draft);
      setSavedExplanations((prev) => ({ ...prev, [index]: draft }));
      setEditingIdx(null);
    } catch {
      // Surface a lightweight inline failure by keeping the editor open.
    } finally {
      setSavingExplanationIdx(null);
    }
  };

  const [loading, setLoading] = useState(!initialQuizData && !initialUserAnswers);
  const [quizData, setQuizData] = useState<any>(initialQuizData);
  const [userAnswers, setUserAnswers] = useState<any>(initialUserAnswers);
  const [attemptData, setAttemptData] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadRetryable, setLoadRetryable] = useState(false);
  const [persistedScore, setPersistedScore] = useState<number | null>(
    typeof score === 'number' ? score : null,
  );

  const effectiveStudentId = studentId || user?.id;
  const teacherView = Boolean(isTeacherView);

  const loadPersistedResults = async () => {
    if (!quizId || !effectiveStudentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setLoadRetryable(false);
    try {
      const result = await fetchPersistedQuizResult({
        quizId,
        sessionId: sessionId ?? passedAttemptData?.session_id,
        classroomId:
          routeClassroomId ??
          passedAttemptData?.classroom_id ??
          passedAttemptData?.class_id,
        studentId: String(effectiveStudentId),
        attemptId,
        isTeacherView: teacherView,
      });
      if (result.status === 'loading') {
        return;
      }
      if (result.status === 'error') {
        setLoadError(result.message);
        setLoadRetryable(result.retryable);
        setQuizData(null);
        setUserAnswers(null);
        return;
      }
      if (result.status === 'missing') {
        setLoadError('No saved results were found for this assignment.');
        setLoadRetryable(false);
        setQuizData(null);
        setUserAnswers(null);
        return;
      }
      setQuizData(result.quizData);
      setUserAnswers(result.userAnswers);
      setAttemptData(result.logData);
      setPersistedScore(result.score);
    } catch {
      setLoadError('Could not load quiz results. Please try again.');
      setLoadRetryable(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuizData && initialUserAnswers) {
      setLoading(false);
      return;
    }
    if (passedQuestions && passedSubmission) {
      handlePassedAttemptData();
      return;
    }
    if (quizId) {
      loadPersistedResults();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, sessionId, passedAttemptData]);

  const handlePassedAttemptData = () => {
    try {
      setLoading(true);
      if (!passedQuestions || !passedSubmission) {
        loadPersistedResults();
        return;
      }
      if (passedSubmission) {
        const logData = typeof passedSubmission === 'string'
          ? JSON.parse(passedSubmission)
          : passedSubmission;
        setAttemptData(logData);
        if (passedQuestions) {
          let questions = typeof passedQuestions === 'string'
            ? JSON.parse(passedQuestions)
            : passedQuestions;
          if (questions.quizzes && Array.isArray(questions.quizzes)) {
            questions = questions.quizzes.map((q: any) => ({
              question: q.quiz?.question || q.question || '',
              options: q.quiz?.options || q.options || [],
              answer: q.quiz?.answer || q.answer || '',
              correctAnswer: q.quiz?.answer || q.answer || '',
              explanation: q.explanation || null,
            }));
          } else if (!Array.isArray(questions)) {
            questions = [];
          }
          setQuizData({ questions });
          if (logData?.answers) {
            let answers: string[];
            if (Array.isArray(logData.answers)) {
              answers = logData.answers.map((a: any) => a.userAnswer);
            } else if (typeof logData.answers === 'object') {
              answers = Object.keys(logData.answers)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((key: string) => logData.answers[key]);
            } else {
              answers = [];
            }
            setUserAnswers(answers);
          }
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('❌ Error processing passed attempt data:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <LoadingSpinner size={48} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
            Loading results…
          </Text>
        </View>
      </View>
    );
  }

  if (!quizData || !userAnswers) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.tintTeal }]}>
            <Ionicons name="document-text-outline" size={32} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
            {loadError ?? 'No Results Available'}
          </Text>
          {loadRetryable ? (
            <TouchableOpacity
              style={[styles.goBackBtn, { backgroundColor: theme.colors.primary, marginBottom: 12 }]}
              onPress={() => loadPersistedResults()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading results"
            >
              <Text style={[styles.goBackBtnText, { color: theme.colors.textInverse }]}>Retry</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.goBackBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.goBackBtnText, { color: theme.colors.textInverse }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const calculateResults = () => {
    const questions = Array.isArray(quizData?.questions) ? quizData.questions : [];
    let correct = 0;
    questions.forEach((q: any, index: number) => {
      const outcome = evaluatePersistedAnswerCorrectness(userAnswers?.[index], q);
      if (outcome === true) correct++;
    });
    return {
      correct,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
    };
  };

  const results = calculateResults();
  const finalScore =
    persistedScore !== null && persistedScore !== undefined
      ? persistedScore
      : score !== undefined
        ? score
        : results.percentage;
  const finalCorrect = correctCount !== undefined ? correctCount : results.correct;
  const finalTotal = totalQuestions !== undefined ? totalQuestions : results.total;

  const getPerformanceMeta = (percentage: number): { message: string; color: string; bg: string } => {
    if (percentage >= 90) return { message: 'Excellent! 🎉', color: theme.colors.success, bg: theme.colors.tintGreen };
    if (percentage >= 75) return { message: 'Great Job! 👏', color: theme.colors.onTintGreen, bg: theme.colors.tintGreen };
    if (percentage >= 60) return { message: 'Good Work! 👍', color: theme.colors.warning, bg: theme.colors.tintOrange };
    if (percentage >= 40) return { message: 'Keep Practicing! 💪', color: theme.colors.onTintOrange, bg: theme.colors.tintOrange };
    return { message: 'Need Improvement! 📚', color: theme.colors.danger, bg: theme.colors.tintRed };
  };

  const perf = getPerformanceMeta(finalScore);

  const renderQuestion = (question: any, index: number) => {
    const questionText = question.question || '';
    const options = question.options || [];
    const userAnswer = userAnswers[index] || '';
    const correctness = evaluatePersistedAnswerCorrectness(userAnswer, question);
    const isCorrect = correctness === true;
    const isUnknown = correctness === null;

    return (
      <View
        key={index}
        style={[
          styles.questionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isUnknown
              ? theme.colors.border
              : isCorrect
                ? theme.colors.success
                : theme.colors.danger,
            borderWidth: 1.5,
          },
        ]}
      >
        {/* Question header */}
        <View style={styles.questionHeader}>
          <View style={[styles.qNumBadge, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Text style={[styles.qNumText, { color: theme.colors.textSecondary }]}>Q{index + 1}</Text>
          </View>
          <View
            style={[
              styles.resultBadge,
              {
                backgroundColor: isUnknown
                  ? theme.colors.surfaceAlt
                  : isCorrect
                    ? theme.colors.tintGreen
                    : theme.colors.tintRed,
              },
            ]}
          >
            <Ionicons
              name={isUnknown ? 'help' : isCorrect ? 'checkmark' : 'close'}
              size={13}
              color={
                isUnknown
                  ? theme.colors.textSecondary
                  : isCorrect
                    ? theme.colors.success
                    : theme.colors.danger
              }
            />
            <Text
              style={[
                styles.resultBadgeText,
                {
                  color: isUnknown
                    ? theme.colors.textSecondary
                    : isCorrect
                      ? theme.colors.success
                      : theme.colors.danger,
                },
              ]}
            >
              {isUnknown ? 'Unknown' : isCorrect ? 'Correct' : 'Incorrect'}
            </Text>
          </View>
        </View>

        <EducationalContent content={questionText} />

        {options.length === 0 ? (
          <View style={styles.textAnswerBlock}>
            <Text style={[styles.answerLine, { color: theme.colors.textSecondary }]}>
              Your answer:{' '}
              <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                {userAnswer || '—'}
              </Text>
            </Text>
            {question.correctAnswer || question.answer ? (
              <Text style={[styles.answerLine, { color: theme.colors.textSecondary, marginTop: 6 }]}>
                Expected:{' '}
                <Text style={{ color: theme.colors.success, fontWeight: '600' }}>
                  {question.correctAnswer || question.answer}
                </Text>
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.optionsList}>
          {options.length > 0 && options.map((option: string, optIndex: number) => {
            const optionLabel = String.fromCharCode(65 + optIndex);
            const isUserAnswer = isOptionTheUserAnswer(option, userAnswer, options, optIndex);
            const isCorrectAnswer = isOptionTheCorrectAnswer(option, question, optIndex);

            let optBg = theme.colors.surfaceAlt;
            let optBorder = theme.colors.border;
            if (isCorrectAnswer) { optBg = theme.colors.tintGreen; optBorder = theme.colors.success; }
            else if (isUserAnswer) { optBg = theme.colors.tintRed; optBorder = theme.colors.danger; }

            return (
              <View
                key={optIndex}
                style={[
                  styles.optionItem,
                  { backgroundColor: optBg, borderColor: optBorder },
                ]}
              >
                <View
                  style={[
                    styles.optionLetter,
                    {
                      backgroundColor: isCorrectAnswer
                        ? theme.colors.success
                        : isUserAnswer
                          ? theme.colors.danger
                          : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLetterText,
                      {
                        color: isCorrectAnswer || isUserAnswer
                          ? theme.colors.textInverse
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {optionLabel}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <EducationalContent content={option} />
                </View>
                {isCorrectAnswer && (
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                )}
                {isUserAnswer && !isCorrectAnswer && (
                  <Ionicons name="person" size={16} color={theme.colors.danger} />
                )}
              </View>
            );
          })}
        </View>

        <QuizExplanationAccordion
          questionId={question.id || `q-${index}-${question.question?.substring(0, 20) ?? 'question'}`}
          questionText={question.question}
          options={question.options}
          selectedAnswer={userAnswers[index] || ''}
          correctAnswer={
            typeof question.correctOptionIndex === 'number' &&
            question.options?.[question.correctOptionIndex]
              ? question.options[question.correctOptionIndex]
              : question.correctAnswer || question.answer || undefined
          }
          clearTrigger={false}
          colors={{
            text: theme.colors.textPrimary,
            textSecondary: theme.colors.textSecondary,
            card: theme.colors.surface,
            border: theme.colors.border,
            primary: theme.colors.primary,
            background: theme.colors.background,
            inputBackground: theme.colors.surfaceAlt,
            error: theme.colors.danger,
            success: theme.colors.success,
          }}
        />

        {canEditExplanations && (
          <View style={[styles.explanationEditor, { borderTopColor: theme.colors.border }]}>
            {editingIdx === index ? (
              <>
                <TextInput
                  style={[
                    styles.explanationInput,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  value={explanationDrafts[index] ?? savedExplanations[index] ?? question.explanation ?? ''}
                  onChangeText={(text) =>
                    setExplanationDrafts((prev) => ({ ...prev, [index]: text }))
                  }
                  placeholder="Write a teacher explanation for this question…"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.explanationActions}>
                  <TouchableOpacity
                    style={[styles.explanationBtn, { backgroundColor: theme.colors.surfaceAlt }]}
                    onPress={() => setEditingIdx(null)}
                    disabled={savingExplanationIdx === index}
                  >
                    <Text style={[styles.explanationBtnText, { color: theme.colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.explanationBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleSaveExplanation(index)}
                    disabled={savingExplanationIdx === index}
                  >
                    {savingExplanationIdx === index ? (
                      <ActivityIndicator size="small" color={theme.colors.textInverse} />
                    ) : (
                      <Text style={[styles.explanationBtnText, { color: theme.colors.textInverse }]}>
                        Save
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={styles.explanationEditTrigger}
                onPress={() => {
                  setExplanationDrafts((prev) => ({
                    ...prev,
                    [index]: savedExplanations[index] ?? question.explanation ?? '',
                  }));
                  setEditingIdx(index);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={15} color={theme.colors.primary} />
                <Text style={[styles.explanationEditTriggerText, { color: theme.colors.primary }]}>
                  {savedExplanations[index] || question.explanation
                    ? 'Edit explanation'
                    : 'Add explanation'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.primary, paddingTop: insets.top > 0 ? insets.top : 12 },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {isTeacherView && studentName ? (
            <Text style={[styles.headerTitle, { color: theme.colors.textInverse }]} numberOfLines={1}>
              {studentName}
            </Text>
          ) : (
            <Text style={[styles.headerTitle, { color: theme.colors.textInverse }]}>Quiz Results</Text>
          )}
          {quizName ? (
            <Text style={[styles.headerSub, { color: 'rgba(255,255,255,0.80)' }]} numberOfLines={1}>
              {quizName}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.fill}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(16, insets.bottom) }}
      >
        {/* Score banner */}
        <View style={[styles.scoreBanner, { backgroundColor: perf.bg }]}>
          <Text style={[styles.scoreBannerMessage, { color: perf.color }]}>{perf.message}</Text>
        </View>

        {/* Score card */}
        <View
          testID="quiz-result-summary"
          accessibilityLabel={
            quizId && attemptId && effectiveStudentId
              ? `quiz-result-summary quiz-${quizId} session-${sessionId ?? 'unknown'} classroom-${routeClassroomId ?? 'unknown'} attempt-${attemptId} student-${effectiveStudentId}`
              : 'quiz-result-summary'
          }
          style={[styles.scoreCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: perf.color }]}>{finalScore}%</Text>
              <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>Score</Text>
            </View>
            <View style={[styles.scoreDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: theme.colors.textPrimary }]}>
                {finalCorrect}/{finalTotal}
              </Text>
              <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>Correct</Text>
            </View>
            {attemptData?.time_spent_seconds != null && (
              <>
                <View style={[styles.scoreDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.scoreItem}>
                  <Text style={[styles.scoreValue, { color: theme.colors.textPrimary }]}>
                    {attemptData.time_spent_seconds}s
                  </Text>
                  <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>Time</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Questions */}
        <View style={styles.questionsSection}>
          {quizData.questions.map((question: any, index: number) => (
            <View key={index}>{renderQuestion(question, index)}</View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { fontSize: 14 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 20 },
  goBackBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  goBackBtnText: { fontSize: 15, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },

  scoreBanner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  scoreBannerMessage: { fontSize: 18, fontWeight: '700' },

  scoreCard: {
    margin: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  scoreItem: { alignItems: 'center', flex: 1 },
  scoreDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  scoreValue: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  scoreLabel: { fontSize: 12, fontWeight: '500' },

  questionsSection: { paddingHorizontal: 16, gap: 12 },

  questionCard: {
    borderRadius: 16,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  qNumBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  qNumText: { fontSize: 12, fontWeight: '600' },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  resultBadgeText: { fontSize: 12, fontWeight: '700' },
  questionText: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  textAnswerBlock: { marginBottom: 12 },
  answerLine: { fontSize: 13, lineHeight: 18 },

  optionsList: { gap: 6 },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  optionLetter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: { fontSize: 12, fontWeight: '700' },
  optionText: { fontSize: 13, lineHeight: 18 },

  explanationEditor: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  explanationEditTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  explanationEditTriggerText: { fontSize: 13, fontWeight: '600' },
  explanationInput: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  explanationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  explanationBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explanationBtnText: { fontSize: 13, fontWeight: '700' },
});
