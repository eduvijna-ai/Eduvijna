import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchTeacherQuizzes } from '@core/services/dashboardApi';
import { Ionicons } from '@expo/vector-icons';

export default function QuizPreviewScreen({ route, navigation }: any) {
  const { quizId } = route.params || {};
  const { theme } = useTheme();
  const colors = theme.colors;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizDetails, setQuizDetails] = useState<any>(null);

  useEffect(() => {
    const loadQuizDetails = async () => {
      if (!quizId) {
        setError('No quiz ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('📋 Fetching quiz details for quiz_id:', quizId);
        
        // Fetch quiz details from API
        const response = await fetchTeacherQuizzes({
          view_type: 'all', 
          quiz_id: quizId,
        });

        if (response.data && response.data.length > 0) {
          const quiz = response.data[0];
          //console.log('✅ Quiz details loaded:', quiz);
          setQuizDetails(quiz);
        } else {
          setError('Quiz not found');
        }
      } catch (err: any) {
        console.error('❌ Failed to load quiz details:', err);
        setError(err.message || 'Failed to load quiz details');
      } finally {
        setLoading(false);
      }
    };

    loadQuizDetails();
  }, [quizId]);

  const handleScheduleQuiz = () => {
    navigation.goBack();
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={60} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading quiz details...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !quizDetails) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || 'No quiz data available'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Parse questions from quiz data
  let questions = [];
  
  // Try to get questions from subject field first (API response)
  if (quizDetails.subject) {
    try {
      const parsedData = typeof quizDetails.subject === 'string' 
        ? JSON.parse(quizDetails.subject) 
        : quizDetails.subject;
      
      console.log('📝 Parsed subject data:', parsedData);
      
      if (parsedData.quizzes && Array.isArray(parsedData.quizzes)) {
        questions = parsedData.quizzes;
      } else if (Array.isArray(parsedData)) {
        questions = parsedData;
      } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
        questions = parsedData.questions;
      }
    } catch (error) {
      console.error('Failed to parse subject data:', error);
    }
  }
  
  // Fallback to quiz_data if subject doesn't have questions
  if (questions.length === 0 && quizDetails.quiz_data) {
    try {
      const parsedData = typeof quizDetails.quiz_data === 'string' 
        ? JSON.parse(quizDetails.quiz_data) 
        : quizDetails.quiz_data;
      
      console.log('📝 Parsed quiz_data:', parsedData);
      
      if (parsedData.quizzes && Array.isArray(parsedData.quizzes)) {
        questions = parsedData.quizzes;
      } else if (Array.isArray(parsedData)) {
        questions = parsedData;
      } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
        questions = parsedData.questions;
      }
    } catch (error) {
      console.error('Failed to parse quiz_data:', error);
    }
  }

  //console.log('QuizPreviewScreen - Questions count:', questions.length);
  //console.log('QuizPreviewScreen - First question:', questions[0]);
  //console.log('QuizPreviewScreen - All questions:', questions);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Quiz Preview</Text>
          
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Quiz Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            {quizDetails.quiz_name || 'Quiz Preview'}
          </Text>
          {quizDetails.classroom_name && (
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {quizDetails.classroom_name}
            </Text>
          )}
          {quizDetails.topic && (
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {quizDetails.topic}
            </Text>
          )}
          <Text style={[styles.questionCount, { color: colors.textSecondary }]}>
            {questions.length} Questions
          </Text>
        </View>


        {/* Questions List */}
        <View style={styles.questionsContainer}>
          {questions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}> 
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}> 
                No questions available for this quiz
              </Text>
            </View>
          ) : (
            <>
              {questions.map((question: any, index: number) => {
                // Extract quiz data from nested structure
                const quizData = question.quiz || question;
                const questionText = quizData.question || quizData.text || quizData.question_text || 'No question text';
                const options = quizData.options || quizData.choices || [];
                const correctAnswerLetter = question.answer || quizData.answer || quizData.correctAnswer;

                return (
                  <View key={question.id || index} style={[styles.questionCard, { backgroundColor: colors.card }]}> 
                    {/* Question Header */}
                    <View style={styles.questionHeader}>
                      <Text style={[styles.questionNumber, { color: colors.primary }]}> 
                        Q{index + 1}
                      </Text>
                    </View>

                    {/* Question Text */}
                    <Text style={[styles.questionText, { color: colors.text }]}> 
                      {questionText}
                    </Text>

                    {/* Options */}
                    {options && Array.isArray(options) && options.length > 0 && (
                      <View style={styles.optionsContainer}>
                        {options.map((option: string, optionIndex: number) => {
                          // Convert option index to letter (0=A, 1=B, 2=C, 3=D)
                          const optionLetter = String.fromCharCode(65 + optionIndex);
                          const isCorrect = optionLetter === correctAnswerLetter;
                          return (
                            <View
                              key={optionIndex}
                              style={[
                                styles.optionCard,
                                { backgroundColor: colors.surface, borderColor: colors.border },
                                isCorrect && styles.optionCardCorrect,
                              ]}
                            >
                              <View style={[
                                styles.optionBullet,
                                { backgroundColor: colors.card, borderColor: colors.border },
                                isCorrect && styles.optionBulletCorrect
                              ]}>
                                <Text style={[
                                  styles.optionBulletText,
                                  { color: colors.textSecondary },
                                  isCorrect && styles.optionBulletTextCorrect
                                ]}>
                                  {String.fromCharCode(65 + optionIndex)}
                                </Text>
                              </View>
                              <Text style={[
                                styles.optionText,
                                { color: colors.text },
                                isCorrect && styles.optionTextCorrect
                              ]}>
                                {option}
                              </Text>
                              {isCorrect && (
                                <Text style={styles.correctIcon}>✓</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Explanation */}
                    {(quizData.explanation || question.explanation) && (
                      <View style={[styles.explanationCard, { backgroundColor: colors.surface }]}> 
                        <Text style={styles.explanationLabel}>💡 Explanation:</Text>
                        <Text style={[styles.explanationText, { color: colors.textSecondary }]}> 
                          {quizData.explanation || question.explanation}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      {/* <View style={[styles.bottomActions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.scheduleButton]}
          onPress={handleScheduleQuiz}
        >
          <Text style={styles.actionButtonText}>Close</Text>
        </TouchableOpacity>
      </View> */}
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
    marginTop: 8,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  questionCount: {
    fontSize: 14,
  },
  infoCard: {
    marginHorizontal: 8,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    marginTop: 2,
  },
  questionsContainer: {
    padding: 8,
    paddingBottom: 60,
  },
  questionCard: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  questionHeader: {
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  optionsContainer: {
    gap: 6,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  optionCardCorrect: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  optionBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  optionBulletCorrect: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  optionBulletText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionBulletTextCorrect: {
    color: '#fff',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  optionTextCorrect: {
    fontWeight: '600',
    color: '#2E7D32',
  },
  correctIcon: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginHorizontal: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  explanationCard: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 12,
    lineHeight: 18,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    borderTopWidth: 1,
  },
  actionButton: {
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    width: '100%',
  },
  scheduleButton: {
    backgroundColor: '#7C3AED',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
});
