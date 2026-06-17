import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@core/hooks/useAuth';
import { fetchTeacherQuizzes } from '@core/services/dashboardApi';
import QuizExplanationAccordion from '../components/QuizExplanationAccordion';
import { useTeacherTheme } from '../erp_schools/theme/useTeacherTheme';

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
  } = route.params || {};

  const theme = useTeacherTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(!initialQuizData && (!passedQuestions || !passedSubmission));
  const [quizData, setQuizData] = useState<any>(initialQuizData);
  const [userAnswers, setUserAnswers] = useState<any>(initialUserAnswers);
  const [attemptData, setAttemptData] = useState<any>(null);

  const effectiveStudentId = studentId || user?.id;

  useEffect(() => {
    if (quizId && (!quizData || !userAnswers)) {
      if (passedAttemptData || passedSubmission || passedQuestions) {
        handlePassedAttemptData();
      } else {
        fetchAttemptData();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, passedAttemptData]);

  const handlePassedAttemptData = () => {
    try {
      setLoading(true);
      if (!passedQuestions || !passedSubmission) {
        fetchAttemptData();
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

  const fetchAttemptData = async () => {
    try {
      setLoading(true);
      const response = await fetchTeacherQuizzes({ view_type: 'all', quiz_id: quizId });
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        const quiz = response.data[0];
        const attempts = typeof quiz.attempts === 'string'
          ? JSON.parse(quiz.attempts)
          : quiz.attempts;
        let attempt;
        if (attemptId) {
          attempt = attempts.find((a: any) => a.attempt_id === attemptId);
        }
        if (!attempt && effectiveStudentId) {
          const studentAttempts = attempts.filter(
            (a: any) => String(a.student_id) === String(effectiveStudentId)
          );
          attempt = studentAttempts.find((a: any) => a.status === 'completed') || studentAttempts[0];
        }
        if (attempt) {
          const hasSubmission = attempt.submission?.log_data || attempt.log_data;
          if (hasSubmission) {
            const logData = attempt.submission?.log_data
              ? (typeof attempt.submission.log_data === 'string'
                ? JSON.parse(attempt.submission.log_data)
                : attempt.submission.log_data)
              : (typeof attempt.log_data === 'string'
                ? JSON.parse(attempt.log_data)
                : attempt.log_data);
            setAttemptData(logData);
            if (quiz.subject) {
              const subjectData = typeof quiz.subject === 'string'
                ? JSON.parse(quiz.subject)
                : quiz.subject;
              if (subjectData.quizzes && Array.isArray(subjectData.quizzes)) {
                const questions = subjectData.quizzes.map((q: any) => ({
                  question: q.quiz?.question || q.question || '',
                  options: q.quiz?.options || q.options || [],
                  answer: q.quiz?.answer || q.answer || '',
                  correctAnswer: q.quiz?.answer || q.answer || '',
                  explanation: q.explanation || null,
                }));
                setQuizData({ questions });
                if (logData.answers) {
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
          } else {
            console.warn('⚠️ No submission data found in attempt');
          }
        } else {
          console.warn('⚠️ Attempt not found for quizId:', quizId);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching attempt data:', err);
    } finally {
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
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No Results Available</Text>
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
      const correctAnswer = q.correctAnswer || q.answer;
      const userAnswer = userAnswers?.[index];
      if (correctAnswer === userAnswer) correct++;
    });
    return {
      correct,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
    };
  };

  const results = calculateResults();
  const finalScore = score !== undefined ? score : results.percentage;
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
    const correctAnswer = question.correctAnswer || question.answer || '';
    const userAnswer = userAnswers[index] || '';
    const isCorrect = correctAnswer === userAnswer;

    return (
      <View
        key={index}
        style={[
          styles.questionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isCorrect ? theme.colors.success : theme.colors.danger,
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
              { backgroundColor: isCorrect ? theme.colors.tintGreen : theme.colors.tintRed },
            ]}
          >
            <Ionicons
              name={isCorrect ? 'checkmark' : 'close'}
              size={13}
              color={isCorrect ? theme.colors.success : theme.colors.danger}
            />
            <Text
              style={[
                styles.resultBadgeText,
                { color: isCorrect ? theme.colors.success : theme.colors.danger },
              ]}
            >
              {isCorrect ? 'Correct' : 'Incorrect'}
            </Text>
          </View>
        </View>

        <Text style={[styles.questionText, { color: theme.colors.textPrimary }]}>{questionText}</Text>

        <View style={styles.optionsList}>
          {options.map((option: string, optIndex: number) => {
            const optionLabel = String.fromCharCode(65 + optIndex);
            const isUserAnswer = userAnswer === optionLabel;
            const isCorrectAnswer = correctAnswer === optionLabel;

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
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: isCorrectAnswer
                        ? theme.colors.onTintGreen
                        : isUserAnswer
                          ? theme.colors.danger
                          : theme.colors.textPrimary,
                      fontWeight: isCorrectAnswer || isUserAnswer ? '600' : '400',
                      flex: 1,
                    },
                  ]}
                >
                  {option}
                </Text>
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
          questionId={question.id || `q-${index}-${question.question.substring(0, 20)}`}
          questionText={question.question}
          options={question.options}
          selectedAnswer={userAnswers[index] || ''}
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
        <View style={[styles.scoreCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
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
});
