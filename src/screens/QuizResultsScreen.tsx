import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@core/hooks/useAuth';
import { fetchTeacherQuizzes } from '@core/services/dashboardApi';

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
    // Teacher view params
    isTeacherView,
    quizId,
    attemptId,
    studentId,
    studentName,
    quizName,
    // Direct attempt data (fallback if attemptId is not available)
    attemptData: passedAttemptData,
    questions: passedQuestions,
    submission: passedSubmission,
  } = route.params || {};
  
  const { theme } = useTheme();
  const { user } = useAuth();
  const colors = theme.colors;
  
  // Set loading if we need to fetch data (when we don't have initialQuizData or questions/submission)
  const [loading, setLoading] = useState(!initialQuizData && (!passedQuestions || !passedSubmission));
  const [quizData, setQuizData] = useState<any>(initialQuizData);
  const [userAnswers, setUserAnswers] = useState<any>(initialUserAnswers);
  const [attemptData, setAttemptData] = useState<any>(null);

  // Use current user's ID if studentId is not provided (student viewing their own results)
  const effectiveStudentId = studentId || user?.id;

  // Fetch attempt data if we have quizId but missing quiz data
  useEffect(() => {
    if (quizId && (!quizData || !userAnswers)) {
      // If we have direct attempt data passed, use it
      if (passedAttemptData || passedSubmission || passedQuestions) {
        console.log('📦 Using passed attempt data directly');
        handlePassedAttemptData();
      } else {
        // Fetch quiz data and find the student's attempt
        console.log('🔍 Fetching quiz data to find student attempt for quiz:', quizId);
        fetchAttemptData();
      }
    }
  }, [quizId, passedAttemptData]);

  const handlePassedAttemptData = () => {
    try {
      setLoading(true);
      console.log('📦 Processing passed attempt data:', {
        hasQuestions: !!passedQuestions,
        hasSubmission: !!passedSubmission,
        hasAttemptData: !!passedAttemptData,
        quizId: quizId,
        attemptId: attemptId,
      });

      // If we don't have questions or submission, we need to fetch from API
      if (!passedQuestions || !passedSubmission) {
        console.log('⚠️ Missing questions or submission data, fetching from API instead');
        fetchAttemptData();
        return;
      }

      // If we have submission data (log_data)
      if (passedSubmission) {
        const logData = typeof passedSubmission === 'string'
          ? JSON.parse(passedSubmission)
          : passedSubmission;
        
        console.log('📝 Parsed log data:', logData);
        setAttemptData(logData);
        
        // If we have questions, set them up
        if (passedQuestions) {
          let questions = typeof passedQuestions === 'string'
            ? JSON.parse(passedQuestions)
            : passedQuestions;
          
          // Handle different question formats
          if (questions.quizzes && Array.isArray(questions.quizzes)) {
            // Format from subject field: {quizzes: [{quiz: {...}, answer: "A"}]}
            questions = questions.quizzes.map((q: any, index: number) => ({
              question: q.quiz?.question || q.question || '',
              options: q.quiz?.options || q.options || [],
              answer: q.quiz?.answer || q.answer || '',
              correctAnswer: q.quiz?.answer || q.answer || '',
              explanation: q.explanation || null,
            }));
          } else if (!Array.isArray(questions)) {
            // If not an array, try to extract array from object
            questions = [];
          }
          
          console.log('📚 Parsed questions:', questions);
          setQuizData({ questions });
          
          // Extract user answers from log_data
          if (logData?.answers && Array.isArray(logData.answers)) {
            const answers = logData.answers.map((a: any) => a.userAnswer);
            console.log('✅ Extracted user answers:', answers);
            setUserAnswers(answers);
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error processing passed attempt data:', error);
      setLoading(false);
    }
  };

  const fetchAttemptData = async () => {
    try {
      setLoading(true);
      console.log('📚 Fetching attempt data for:', { quizId, attemptId, studentId, effectiveStudentId });
      
      // Fetch quiz with attempts
      const response = await fetchTeacherQuizzes({
        view_type: 'all',
        quiz_id: quizId,
      });
      
      console.log('✅ Quiz response:', response);
      
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        const quiz = response.data[0];
        
        // Parse attempts
        const attempts = typeof quiz.attempts === 'string'
          ? JSON.parse(quiz.attempts)
          : quiz.attempts;
        
        console.log('👥 All attempts:', attempts);
        
        // Find the specific attempt
        let attempt;
        
        // Priority 1: Find by attemptId if provided
        if (attemptId) {
          attempt = attempts.find((a: any) => a.attempt_id === attemptId);
          console.log('🔍 Found by attemptId:', attempt?.attempt_id);
        }
        
        // Priority 2: Find by studentId (for teacher viewing student's result)
        if (!attempt && effectiveStudentId) {
          console.log('🔍 Searching by studentId:', effectiveStudentId);
          // Find the most recent completed attempt by this student
          const studentAttempts = attempts.filter(
            (a: any) => String(a.student_id) === String(effectiveStudentId)
          );
          console.log('📝 Student attempts found:', studentAttempts.length);
          
          // Prefer completed attempts, fallback to any attempt
          attempt = studentAttempts.find((a: any) => a.status === 'completed') || studentAttempts[0];
          console.log('🎯 Selected attempt:', attempt?.attempt_id, 'status:', attempt?.status);
        }
        
        console.log('🎯 Final attempt:', attempt);
        
        if (attempt) {
          // Check if we have submission data
          const hasSubmission = attempt.submission?.log_data || attempt.log_data;
          
          if (hasSubmission) {
            const logData = attempt.submission?.log_data 
              ? (typeof attempt.submission.log_data === 'string'
                ? JSON.parse(attempt.submission.log_data)
                : attempt.submission.log_data)
              : (typeof attempt.log_data === 'string'
                ? JSON.parse(attempt.log_data)
                : attempt.log_data);
            
            console.log('📝 Log data:', logData);
            setAttemptData(logData);
            
            // Parse quiz questions from subject field
            if (quiz.subject) {
              const subjectData = typeof quiz.subject === 'string'
                ? JSON.parse(quiz.subject)
                : quiz.subject;
              
              if (subjectData.quizzes && Array.isArray(subjectData.quizzes)) {
                // Convert to expected format
                const questions = subjectData.quizzes.map((q: any) => ({
                  question: q.quiz?.question || q.question || '',
                  options: q.quiz?.options || q.options || [],
                  answer: q.quiz?.answer || q.answer || '',
                  correctAnswer: q.quiz?.answer || q.answer || '',
                  explanation: q.explanation || null,
                }));
                
                console.log('📚 Extracted questions:', questions.length);
                setQuizData({ questions });
                
                // Extract user answers from log_data
                if (logData.answers && Array.isArray(logData.answers)) {
                  const answers = logData.answers.map((a: any) => a.userAnswer);
                  console.log('✅ Extracted user answers:', answers.length);
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
    } catch (error) {
      console.error('❌ Error fetching attempt data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text, marginTop: 12 }]}>Loading attempt data...</Text>
        </View>
      </View>
    );
  }

  if (!quizData || !userAnswers) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>No quiz results available</Text>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Go Back</Text>
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
      if (correctAnswer === userAnswer) {
        correct++;
      }
    });
    
    return {
      correct,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
    };
  };

  const results = calculateResults();
  const finalScore = score !== undefined ? score : results.percentage;
  const finalCorrect = correctCount !== undefined ? correctCount : results.correct;
  const finalTotal = totalQuestions !== undefined ? totalQuestions : results.total;
  
  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 90) return { message: 'Excellent! 🎉', color: '#4CAF50' };
    if (percentage >= 75) return { message: 'Great Job! 👏', color: '#8BC34A' };
    if (percentage >= 60) return { message: 'Good Work! 👍', color: '#FFC107' };
    if (percentage >= 40) return { message: 'Keep Practicing! 💪', color: '#FF9800' };
    return { message: 'Need Improvement! 📚', color: '#F44336' };
  };

  const performance = getPerformanceMessage(finalScore);

  const renderQuestion = (question: any, index: number) => {
    const questionData = question;
    const questionText = questionData.question || '';
    const options = questionData.options || [];
    const correctAnswer = questionData.correctAnswer || questionData.answer || '';
    
    // userAnswers stores the letter (A, B, C, D)
    const userAnswer = userAnswers[index] || '';
    const isCorrect = correctAnswer === userAnswer;

    return (
      <View
        key={index}
        style={[
          styles.questionCard,
          { backgroundColor: colors.card },
          isCorrect ? styles.questionCardCorrect : styles.questionCardIncorrect,
        ]}
      >
        <View style={styles.questionHeader}>
          <Text style={[styles.questionNumber, { color: colors.textSecondary }]}>Q{index + 1}</Text>
          <View style={[
            styles.resultBadge,
            { backgroundColor: isCorrect ? '#4CAF50' : '#F44336' }
          ]}>
            <Ionicons name={isCorrect ? 'checkmark' : 'close'} size={12} color="#fff" />
          </View>
        </View>

        <Text style={[styles.questionText, { color: colors.text }]}>{questionText}</Text>

        <View style={styles.optionsList}>
          {options.map((option: string, optIndex: number) => {
            const optionLabel = String.fromCharCode(65 + optIndex);
            const isUserAnswer = userAnswer === optionLabel;
            const isCorrectAnswer = correctAnswer === optionLabel;

            return (
              <View
                key={optIndex}
                style={[
                  styles.optionItem,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isCorrectAnswer && styles.optionCorrect,
                  isUserAnswer && !isCorrectAnswer && styles.optionIncorrect,
                ]}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.optionBadge,
                    isCorrectAnswer && styles.badgeSuccess,
                    isUserAnswer && !isCorrectAnswer && styles.badgeError,
                    !isCorrectAnswer && !isUserAnswer && styles.badgeLight,
                  ]}>
                    <Text style={[
                      styles.optionBadgeText,
                      isCorrectAnswer && { color: '#4CAF50', fontWeight: 'bold' },
                      isUserAnswer && !isCorrectAnswer && { color: '#F44336', fontWeight: 'bold' },
                    ]}>
                      {optionLabel}
                    </Text>
                  </View>
                  <Text style={[
                    styles.optionText, 
                    { color: colors.text },
                    isCorrectAnswer && { color: '#1B5E20', fontWeight: '600' },
                    isUserAnswer && !isCorrectAnswer && { color: '#B71C1C', fontWeight: '500' },
                  ]}>{option}</Text>
                </View>
                {isUserAnswer && (
                  <Ionicons
                    name="person"
                    size={16}
                    color={isCorrectAnswer ? '#4CAF50' : '#F44336'}
                    style={{ marginLeft: 4 }}
                  />
                )}
                {isCorrectAnswer && (
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Simple Header with Close Button */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          {isTeacherView && studentName && (
            <Text style={[styles.headerTitle, { color: colors.text }]}>{studentName}</Text>
          )}
          {quizName && (
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{quizName}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Compact Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: colors.card }]}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: performance.color }]}>{finalScore}%</Text>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Score</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: colors.text }]}>{finalCorrect}/{finalTotal}</Text>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Correct</Text>
            </View>
            {attemptData?.time_spent_seconds && (
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreValue, { color: colors.text }]}>{attemptData.time_spent_seconds}s</Text>
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Time</Text>
              </View>
            )}
          </View>
        </View>

        {/* Questions */}
        <View style={styles.questionsSection}>
          {quizData.questions.map((question: any, index: number) => renderQuestion(question, index))}
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scoreCard: {
    margin: 6,
    padding: 10,
    borderRadius: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  questionsSection: {
    paddingHorizontal: 6,
  },
  questionCard: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
  },
  questionCardCorrect: {
    borderColor: '#4CAF50',
  },
  questionCardIncorrect: {
    borderColor: '#F44336',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 8,
  },
  optionsList: {
    gap: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 5,
  },
  optionCorrect: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  optionIncorrect: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 2,
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  optionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  badgeSuccess: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  badgeError: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 2,
  },
  badgeLight: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  optionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 24,
  },
  optionText: {
    fontSize: 13,
    flex: 1,
  },
  answerBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  answerBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
});
