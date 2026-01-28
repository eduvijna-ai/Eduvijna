import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@core/hooks/useAuth';
import { 
  createQuizAttempt, 
  updateQuizAttempt, 
  createQuizSubmission, 
  getQuizBySessionId,
  generateAIQuiz
} from '../core/services/sharedApi';
import QuizExplanationAccordion from '../components/QuizExplanationAccordion';
import ShareQuizModal from '../components/ShareQuizModal';
import ShareOptionsModal from '../components/ShareOptionsModal';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: string;
  answer?: string;
  explanation: string | null;
}

interface QuizData {
  id?: string | number;
  quiz_id?: string | number;
  session_id?: string;
  classroom_id?: string;
  title: string;
  class?: string;
  subject?: string;
  difficulty?: string;
  lesson?: string;
  duration?: number;
  has_time_limit?: boolean;
  questions: QuizQuestion[];
  regenerationParams?: any;
}

export default function QuizTakingScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const colors = theme.colors;
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { 
    quizData, 
    quizId, 
    sessionId, 
    classroomId,
    showShareButton,
    showActionButtons,
    onNewQuiz
  } = route.params || {};
  
  // Initial debug log - see what route params were passed
  console.log('🔍 QuizTakingScreen ROUTE PARAMS:', {
    hasQuizData: !!quizData,
    quizId,
    sessionId,
    classroomId,
    showShareButton,
    showActionButtons,
    hasOnNewQuiz: !!onNewQuiz,
    allParams: route.params
  });
  
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [questionResults, setQuestionResults] = useState<{ [key: number]: boolean }>({});
  const [timeRemaining, setTimeRemaining] = useState(1800);
  const [quizStarted, setQuizStarted] = useState(true);
  const [quizStartTime] = useState(new Date().toISOString()); // Track when quiz started
  const [isLoading, setIsLoading] = useState(!quizData);
  const [submitting, setSubmitting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareOptionsModal, setShowShareOptionsModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  // Use quiz state as currentQuizData for consistency with reference
  const currentQuizData = quiz;
  const setCurrentQuizData = setQuiz;

  // Determine if this is a teacher-assigned quiz
  // Check both route params AND quiz data for session_id/classroom_id
  // Teacher-assigned quizzes will have these fields, self-assessments won't
  const isAssignedQuiz = Boolean(
    (sessionId && classroomId) || 
    (quiz?.session_id && quiz?.classroom_id)
  ) && !showActionButtons;

  // Log params when quiz data changes
  useEffect(() => {
    console.log('📝 QuizTakingScreen state update:', {
      // Route params
      routeParams: {
        sessionId,
        classroomId,
        quizId,
        showActionButtons,
        showShareButton
      },
      // Quiz state data
      quizState: {
        hasQuiz: !!quiz,
        quiz_id: quiz?.quiz_id,
        session_id: quiz?.session_id,
        classroom_id: quiz?.classroom_id,
        questionCount: quiz?.questions?.length
      },
      // Computed values
      computed: {
        isAssignedQuiz,
        willSubmitToBackend: Boolean(isAssignedQuiz && quiz?.quiz_id && user?.id)
      }
    });
  }, [quiz, sessionId, classroomId, quizId, showActionButtons, isAssignedQuiz, user?.id]); // Re-log when any relevant value changes

  // Get performance message based on score
  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 90) return { message: 'Excellent! 🎉', color: '#4CAF50' };
    if (percentage >= 75) return { message: 'Great Job! 👏', color: '#8BC34A' };
    if (percentage >= 60) return { message: 'Good Work! 👍', color: '#FFC107' };
    if (percentage >= 40) return { message: 'Keep Practicing! 💪', color: '#FF9800' };
    return { message: 'Need Improvement! 📚', color: '#F44336' };
  };

  // Calculate results helper function
  const calculateResults = () => {
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    if (!currentQuizData?.questions) return { correctCount, incorrectCount, unansweredCount };

    currentQuizData.questions.forEach((question: QuizQuestion, index: number) => {
      if (!selectedAnswers[index]) {
        unansweredCount++;
      } else {
        const selectedOption = selectedAnswers[index];
        const selectedIndex = question.options.indexOf(selectedOption);
        const selectedLetter = String.fromCharCode(65 + selectedIndex);
        const isCorrect = selectedLetter === (question.correctAnswer || question.answer);
        if (isCorrect) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      }
    });

    return { correctCount, incorrectCount, unansweredCount };
  };

  // Fetch quiz data when coming from notifications with IDs
  useEffect(() => {
    const fetchQuiz = async () => {
      if (quizData) {
        // Validate and set quiz data from params
        let questions = [];
        
        // Try to get questions from various sources
        if (Array.isArray(quizData.questions)) {
          questions = quizData.questions;
        } else if (quizData.subject) {
          // Parse subject field (contains quiz questions as JSON)
          try {
            const subjectData = typeof quizData.subject === 'string'
              ? JSON.parse(quizData.subject)
              : quizData.subject;
            
            if (subjectData.quizzes && Array.isArray(subjectData.quizzes)) {
              // Convert from subject format to expected format
              questions = subjectData.quizzes.map((q: any, index: number) => ({
                id: (index + 1).toString(),
                question: q.quiz?.question || q.question || '',
                options: q.quiz?.options || q.options || [],
                correctAnswer: q.quiz?.answer || q.answer || '',
                answer: q.quiz?.answer || q.answer || '',
                explanation: q.explanation || null,
              }));
              console.log('✅ Parsed', questions.length, 'questions from subject field');
            }
          } catch (e) {
            console.error('❌ Error parsing subject field:', e);
          }
        }
        
        // Ensure questions is always an array
        const validatedQuestions = Array.isArray(questions) ? questions : [];
        
        const validatedQuizData = {
          ...quizData,
          // Preserve or extract session_id and classroom_id
          session_id: quizData.session_id || quizData.sessionId || sessionId,
          classroom_id: quizData.classroom_id || quizData.classroomId || classroomId,
          quiz_id: quizData.quiz_id || quizData.quizId || quizData.id || quizId,
          questions: validatedQuestions.map((q: any, index: number) => ({
            ...q,
            id: q.id || `${index}-${q.question?.substring(0, 10) || 'q'}`,
            options: Array.isArray(q.options) ? q.options : [],
            explanation: q.explanation ?? null, // Normalize undefined to null
          })),
        };
        
        console.log('✅ Quiz loaded with', validatedQuestions.length, 'questions');
        console.log('📋 Quiz IDs:', {
          quiz_id: validatedQuizData.quiz_id,
          session_id: validatedQuizData.session_id,
          classroom_id: validatedQuizData.classroom_id
        });
        setQuiz(validatedQuizData);
        setTimeRemaining(quizData.duration || 1800);
        setIsLoading(false);
      } else if (quizId || (sessionId && classroomId)) {
        // Fetch from API using quiz ID or session ID
        console.log('📥 Fetching assessment data:', { quizId, sessionId, classroomId });
        setIsLoading(true);
        try {
          // Use sessionId if available, otherwise use quizId
          const fetchId = sessionId || quizId?.toString();
          if (!fetchId) {
            throw new Error('No valid ID to fetch quiz data');
          }
          
          console.log('📡 Fetching quiz with ID:', fetchId);
          const response = await getQuizBySessionId(fetchId);
          
          console.log('📨 API Response:', { 
            success: response.success, 
            hasQuizData: !!response.quiz_data,
            quizId: response.quiz_data?.quiz_id 
          });
          
          if (response.success && response.quiz_data) {
            // Transform questions from API format
            const transformedQuestions = response.quiz_data.questions?.quizzes?.map((q: any, index: number) => ({
              id: (index + 1).toString(),
              question: q.quiz?.question || q.question || '',
              options: q.quiz?.options || q.options || [],
              correctAnswer: q.quiz?.answer || q.answer || '',
              explanation: q.explanation || null,
            })) || [];
            
            console.log('✅ Loaded', transformedQuestions.length, 'questions');
            
            const quizDataFromAPI: QuizData = {
              quiz_id: response.quiz_data.quiz_id || quizId,
              session_id: sessionId,
              classroom_id: classroomId,
              title: response.quiz_data.topic || 'Assessment',
              questions: transformedQuestions,
              duration: response.quiz_data.duration,
              has_time_limit: response.quiz_data.has_time_limit,
            };
            
            console.log('✅ Quiz data prepared:', {
              quiz_id: quizDataFromAPI.quiz_id,
              session_id: quizDataFromAPI.session_id,
              classroom_id: quizDataFromAPI.classroom_id,
              questionCount: quizDataFromAPI.questions.length
            });
            
            setCurrentQuizData(quizDataFromAPI);
            setTimeRemaining(response.quiz_data.duration || 1800);
          } else {
            console.error('❌ No questions found in assessment response');
            Alert.alert('Error', 'Assessment data not available');
            navigation.goBack();
          }
        } catch (error) {
          console.error('❌ Failed to fetch assessment:', error);
          Alert.alert('Error', 'Failed to load assessment. Please try again.');
          navigation.goBack();
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizData, quizId, sessionId, classroomId]);

  // Timer countdown
  useEffect(() => {
    if (quizStarted && timeRemaining > 0 && !showResults) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Time expired - optionally auto-submit
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
    return undefined;
  }, [quizStarted, timeRemaining, showResults]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading assessment...</Text>
        </View>
      </View>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>No assessment data available</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  if (!currentQuestion || !currentQuestion.options || !Array.isArray(currentQuestion.options)) {
    console.error('Invalid question data at index:', currentQuestionIndex);
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Error loading question</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Centralized regeneration function for all quiz types
  const handleRegenerateQuiz = async () => {
    if (!currentQuizData?.regenerationParams) {
      Alert.alert('Error', 'Regeneration not available for this assessment');
      return;
    }

    const regenerationParams = currentQuizData.regenerationParams;
    
    try {
      let newQuizData;
      
      switch (regenerationParams.type) {
        case 'ai':
          newQuizData = await generateAIQuiz({
            class: regenerationParams.classId,
            subject: regenerationParams.subjectId,
            lesson: currentQuizData.lesson || '',
            level: currentQuizData.difficulty || 'basic',
            count: regenerationParams.count || 10,
            itext: regenerationParams.itext || ''
          });
          return {
            id: newQuizData.quiz_id,
            title: currentQuizData?.title || `${currentQuizData.lesson} Assessment`,
            questions: newQuizData.quiz || [],
            class: currentQuizData?.class,
            subject: currentQuizData?.subject,
            difficulty: currentQuizData?.difficulty,
            lesson: currentQuizData?.lesson,
            thread_id: newQuizData.thread_id,
            thread_slug: newQuizData.thread_slug,
            reused_thread: newQuizData.reused_thread,
            regenerationParams: regenerationParams,
          };

        case 'youtube':
          // YouTube quizzes use AI generation with video summary as instructions
          newQuizData = await generateAIQuiz({
            class: regenerationParams.classId,
            subject: regenerationParams.subjectId,
            lesson: currentQuizData.lesson || '',
            level: currentQuizData.difficulty || 'basic',
            count: regenerationParams.count || 10,
            itext: regenerationParams.itext || ''
          });
          return {
            id: newQuizData.quiz_id,
            title: currentQuizData?.title || `${currentQuizData.lesson} Quiz`,
            questions: newQuizData.quiz || [],
            class: currentQuizData?.class,
            subject: currentQuizData?.subject,
            difficulty: currentQuizData?.difficulty,
            lesson: currentQuizData?.lesson,
            thread_id: newQuizData.thread_id,
            thread_slug: newQuizData.thread_slug,
            reused_thread: newQuizData.reused_thread,
            regenerationParams: regenerationParams,
          };

        case 'website':
          // Website quizzes use AI generation with website content as instructions
          newQuizData = await generateAIQuiz({
            class: regenerationParams.classId,
            subject: regenerationParams.subjectId,
            lesson: currentQuizData.lesson || '',
            level: currentQuizData.difficulty || 'basic',
            count: regenerationParams.count || 10,
            itext: regenerationParams.itext || ''
          });
          return {
            id: newQuizData.quiz_id,
            title: currentQuizData?.title || newQuizData.title,
            questions: newQuizData.quiz || [],
            class: currentQuizData?.class,
            subject: currentQuizData?.subject,
            difficulty: currentQuizData?.difficulty,
            lesson: currentQuizData?.lesson,
            regenerationParams: regenerationParams,
          };

        case 'image':
        case 'document':
          // For image and document quizzes, use AI assessment generation with the extracted text
          newQuizData = await generateAIQuiz({
            class: regenerationParams.classId || regenerationParams.grade,
            subject: regenerationParams.subjectId || regenerationParams.subject,
            lesson: currentQuizData.lesson || '',
            level: currentQuizData.difficulty || 'basic',
            count: regenerationParams.count || 10,
            itext: regenerationParams.itext || ''
          });
          return {
            id: newQuizData.quiz_id,
            title: currentQuizData?.title || `${currentQuizData.lesson} Assessment`,
            questions: newQuizData.quiz || [],
            class: currentQuizData?.class,
            subject: currentQuizData?.subject,
            difficulty: currentQuizData?.difficulty,
            lesson: currentQuizData?.lesson,
            thread_id: newQuizData.thread_id,
            thread_slug: newQuizData.thread_slug,
            reused_thread: newQuizData.reused_thread,
            regenerationParams: regenerationParams,
          };

        default:
          throw new Error(`Unsupported regeneration type: ${regenerationParams.type}`);
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      throw error;
    }
  };

  const handleShareSuccess = (url: string) => {
    setShareUrl(url);
    setShowShareOptionsModal(true);
  };

  const totalQuestions = quiz.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (optionIndex: number) => {
    const option = currentQuestion.options[optionIndex];
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: option,
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    const unanswered = totalQuestions - Object.keys(selectedAnswers).length;
    
    if (unanswered > 0) {
      Alert.alert(
        'Incomplete Assessment',
        `You have ${unanswered} unanswered question(s). Do you want to submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: () => submitQuiz() },
        ]
      );
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    
    try {
      // Calculate results
      let correctCount = 0;
      const results: { [key: number]: boolean } = {};

      quiz.questions.forEach((question: QuizQuestion, index: number) => {
        const selectedAnswer = selectedAnswers[index];
        if (selectedAnswer) {
          const selectedIndex = question.options.indexOf(selectedAnswer);
          const selectedLetter = ['A', 'B', 'C', 'D'][selectedIndex];
          const isCorrect = selectedLetter === (question.correctAnswer || question.answer);
          results[index] = isCorrect;
          
          if (isCorrect) {
            correctCount++;
          }
        } else {
          results[index] = false;
        }
      });

      const score = Math.round((correctCount / totalQuestions) * 100);
      const completedAt = new Date().toISOString();
      const timeSpent = Math.max(0, Math.floor(
        (new Date(completedAt).getTime() - new Date(quizStartTime).getTime()) / 1000
      ));
      
      // Store elapsed time for display
      setElapsedTime(timeSpent);

      // Debug: Log all conditions for backend submission
      console.log('🔍 Submission conditions check:', {
        isAssignedQuiz,
        hasQuizId: !!quiz.quiz_id,
        hasUserId: !!user?.id,
        sessionId: quiz.session_id || sessionId,
        classroomId: quiz.classroom_id || classroomId,
        showActionButtons,
        willSubmitToBackend: isAssignedQuiz && quiz.quiz_id && user?.id
      });

      // ONLY submit to backend if this is a teacher-assigned assessment
      if (isAssignedQuiz && quiz.quiz_id && user?.id) {
        console.log('📤 Submitting assigned assessment:', {
          quiz_id: quiz.quiz_id,
          session_id: quiz.session_id || sessionId,
          classroom_id: quiz.classroom_id || classroomId,
          score
        });

        try {
          // Convert selectedAnswers to letter format for log_data
          const answersAsLetters: Record<number, string> = {};
          Object.keys(selectedAnswers).forEach((index) => {
            const questionIndex = parseInt(index);
            const selectedOption = selectedAnswers[questionIndex];
            const question = quiz.questions[questionIndex];
            if (question && selectedOption) {
              const optionIndex = question.options.indexOf(selectedOption);
              answersAsLetters[questionIndex] = ['A', 'B', 'C', 'D'][optionIndex] || '';
            }
          });

          // Step 1: Create quiz attempt
          const attemptResponse = await createQuizAttempt({
            quiz_id: quiz.quiz_id,
            student_id: user.id,
            class_id: quiz.session_id || sessionId || '', // Using session_id as class_id
            attempt_number: 1,
            status: 'started',
            started_at: quizStartTime,
          });

          console.log('✅ Quiz attempt created:', attemptResponse.id);

          

          // Step 2: Create submission
          await createQuizSubmission({
            quiz_id: quiz.quiz_id,
            student_id: user.id,
            classroom_id: quiz.session_id || sessionId || '', // Using session_id as classroom_id
            score: score,
            summary: 'Auto-scored client-side',
            log_data: {
              answers: answersAsLetters,
              questionCount: quiz.questions.length,
              time_spent_seconds: timeSpent,
              attempt_id: attemptResponse.id,
            },
            submitted_at: completedAt,
          });

          console.log('✅ Quiz submission successful');

          // Step 3: Update attempt as completed
          await updateQuizAttempt(attemptResponse.id, {
            score: score,
            status: 'completed',
            completed_at: completedAt,
            time_spent_seconds: timeSpent,
          });

          console.log('✅ Assessment attempt updated');
        } catch (submitError: any) {
          console.error('❌ Quiz submission failed:', submitError);
          console.error('Error details:', {
            message: submitError?.message || 'Unknown error',
            response: submitError?.response?.data,
            status: submitError?.response?.status,
          });
          Alert.alert(
            'Submission Error',
            'Your answers could not be submitted. Please check your connection and try again.'
          );
          setSubmitting(false);
          return;
        }
      } else {
        console.log('ℹ️ Self-Generated Assessment - skipping backend submission');
      }

      // Store results and show them inline
      setQuestionResults(results);
      setShowResults(true);
      setCurrentQuestionIndex(0);
      
    //   Alert.alert(
    //     'Assessment Complete!',
    //     `You scored ${score}%\n${correctCount} out of ${totalQuestions} correct`,
    //     [{ text: 'Review Answers', style: 'default' }]
    //   );
    } catch (error: any) {
      console.error('Error submitting assessment:', error);
      Alert.alert('Error', 'Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Action Buttons - Top (Regenerate, Retake, New Quiz, Share) */}
      {(showShareButton || showActionButtons) && (
        <View style={styles.topActionsContainer}>
          {showActionButtons && currentQuizData?.regenerationParams && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.regenerateButton]}
              onPress={async () => {
                Alert.alert(
                  'ReGenerate assessment',
                  'This will create a new assessment. Your current progress will be lost. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Yes, Regenerate', 
                      onPress: async () => {
                        setIsRegenerating(true);
                        try {
                          const newQuizData = await handleRegenerateQuiz();
                          
                          // Ensure all questions have proper IDs and structure
                          const validatedQuestions = Array.isArray(newQuizData?.questions) 
                            ? newQuizData.questions.map((q: any, index: number) => ({
                                ...q,
                                id: q.id || `${index}-${q.question?.substring(0, 10) || 'question'}`,
                                options: Array.isArray(q.options) ? q.options : [],
                              }))
                            : [];
                          
                          // Preserve original quiz metadata while updating questions
                          const updatedQuizData = {
                            ...currentQuizData,
                            ...newQuizData,
                            questions: validatedQuestions,
                            // Ensure these key properties are preserved from original
                            title: currentQuizData.title,
                            class: currentQuizData.class,
                            subject: currentQuizData.subject,
                            difficulty: currentQuizData.difficulty,
                            lesson: currentQuizData.lesson,
                          };
                          
                          console.log('✅ ReGenerated Assessment with', validatedQuestions.length, 'questions');
                          
                          setCurrentQuizData(updatedQuizData);
                          setQuizStarted(true);
                          setSelectedAnswers({});
                          setCurrentQuestionIndex(0);
                          setShowResults(false);
                          setQuestionResults({});
                          setTimeRemaining(1800);
                          Alert.alert('Success', 'New assessment generated with fresh questions!');
                        } catch (error: any) {
                          console.error('❌ Regeneration failed:', error);
                          Alert.alert('Error', 'Failed to reGenerate assessment: ' + (error.message || 'Unknown error'));
                        } finally {
                          setIsRegenerating(false);
                        }
                      }
                    }
                  ]
                );
              }}
              disabled={isRegenerating}
            >
              <Text style={styles.actionButtonText}>🔄 Regenerate</Text>
            </TouchableOpacity>
          )}
          
          {showActionButtons && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.retakeButton]}
              onPress={() => {
                Alert.alert(
                  'ReTake Assessment',
                  'This will reset your answers and restart the assessment. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Yes, Retake',
                      onPress: () => {
                        setSelectedAnswers({});
                        setCurrentQuestionIndex(0);
                        setShowResults(false);
                        setTimeRemaining(1800);
                        setQuestionResults({});
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={styles.actionButtonText}>🔁 Retake</Text>
            </TouchableOpacity>
          )}
          
          {showActionButtons && onNewQuiz && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.newButton]}
              onPress={() => {
                Alert.alert(
                  'Create New Assessment',
                  'Go back to create a new assessment?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Yes', onPress: onNewQuiz }
                  ]
                );
              }}
            >
              <Text style={styles.actionButtonText}>✨ New</Text>
            </TouchableOpacity>
          )}
          
          {showShareButton && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.shareButton]}
              onPress={() => setShowShareModal(true)}
            >
              <Text style={styles.actionButtonText}>📤 Share</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={[styles.contentWrapper, isWeb && styles.webContainer]}>
      {/* Show Results Inline if quiz is submitted */}
      {showResults && (() => {
        const results = calculateResults();
        const finalScore = Math.round((results.correctCount / (quiz?.questions?.length || 1)) * 100);
        const performance = getPerformanceMessage(finalScore);

        return (
          <View style={styles.inlineResultsContainer}>
            {/* Performance Header */}
            <View style={[styles.performanceCard, { backgroundColor: colors.card }]}>
              <View style={[styles.performanceBadge, { backgroundColor: performance.color }]}>
                <Text style={styles.performanceText}>{performance.message}</Text>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Time Taken</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{formatTime(elapsedTime)}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={[styles.scoreValue, { color: performance.color }]}>
                    {finalScore}%
                  </Text>
                  <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Score</Text>
                  <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                    {results.correctCount}/{quiz?.questions?.length || 0} Correct
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Accuracy</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{finalScore}%</Text>
                </View>
              </View>
                {/* Stats Grid */}
                <View style={styles.statsGridInline}>
                <View style={[styles.statCardInline, styles.statCardCorrect]}>
                    <Text style={[styles.statNumberInline, { color: colors.text }]}>{results.correctCount}</Text>
                    <Text style={[styles.statLabelInline, { color: colors.textSecondary }]}>✓ Correct</Text>
                </View>
                <View style={[styles.statCardInline, styles.statCardIncorrect]}>
                    <Text style={[styles.statNumberInline, { color: colors.text }]}>{results.incorrectCount}</Text>
                    <Text style={[styles.statLabelInline, { color: colors.textSecondary }]}>✗ Incorrect</Text>
                </View>
                <View style={[styles.statCardInline, styles.statCardUnanswered]}>
                    <Text style={[styles.statNumberInline, { color: colors.text }]}>{results.unansweredCount}</Text>
                    <Text style={[styles.statLabelInline, { color: colors.textSecondary }]}>○ Unanswered</Text>
                </View>
                </View>
          </View>
        </View>

            
        );
      })()}

      {!showResults && (
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}> 
          <View style={styles.headerTop}>
            {/* <TouchableOpacity 
              onPress={() => {
                Alert.alert('Exit Assessment?', 'Your progress will be lost.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() }
                ]);
              }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity> */}
            <Text style={[styles.headerTitle, { color: colors.text }]}>{quiz.title}</Text>
            <View style={[styles.timerBadge, { backgroundColor: timeRemaining < 300 ? '#F44336' : colors.primary }]}> 
              <Ionicons name="time-outline" size={16} color="#fff" />
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
            </View>
          </View>
          
          <View style={styles.progressSection}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}> 
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}> 
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        <View style={[styles.questionCard, { backgroundColor: colors.card }]}>
          <View style={styles.questionHeader}>
            <View style={[styles.questionNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.questionNumberText}>{currentQuestionIndex + 1}</Text>
            </View>
            <Text style={[styles.questionLabel, { color: colors.primary }]}>Question</Text>
          </View>

          <Text style={[styles.questionText, { color: colors.text }]}>
            {currentQuestion.question}
          </Text>

          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option: string, index: number) => {
              const isSelected = selectedAnswers[currentQuestionIndex] === option;
              const optionLetter = String.fromCharCode(65 + index);
              const isCorrectAnswer = showResults && optionLetter === (currentQuestion.correctAnswer || currentQuestion.answer);
              const isWrongSelection = showResults && isSelected && !isCorrectAnswer;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    !showResults && isSelected && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 2 },
                    isCorrectAnswer && { backgroundColor: '#E8F5E9', borderColor: '#4CAF50', borderWidth: 2 },
                    isWrongSelection && { backgroundColor: '#FFEBEE', borderColor: '#F44336', borderWidth: 2 }
                  ]}
                  onPress={() => !showResults && handleSelectAnswer(index)}
                  disabled={showResults}
                >
                  <View style={[
                    styles.optionBullet,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    !showResults && isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    isCorrectAnswer && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
                    isWrongSelection && { backgroundColor: '#F44336', borderColor: '#F44336' }
                  ]}>
                    <Text style={[
                      styles.optionBulletText,
                      { color: colors.textSecondary },
                      (isSelected || isCorrectAnswer || isWrongSelection) && { color: '#fff' }
                    ]}>
                      {optionLetter}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                  {!showResults && isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                  {showResults && isCorrectAnswer && (
                    <Text style={styles.correctBadge}>✓ Correct</Text>
                  )}
                  {showResults && isWrongSelection && (
                    <Text style={styles.wrongBadge}>✗ Wrong</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Explanation Display */}
          {/* {showResults && showExplanations && currentQuestion.explanation && (
            <View style={styles.explanationContainer}>
              <View style={styles.explanationHeader}>
                <Ionicons name="bulb-outline" size={20} color={colors.primary} />
                <Text style={[styles.explanationTitle, { color: colors.text }]}>Explanation</Text>
              </View>
              <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                {currentQuestion.explanation}
              </Text>
            </View>
          )} */}

            {/* Quiz Explanation Accordion - Only in results view */}
        {showResults && (
          <QuizExplanationAccordion
            questionId={currentQuestion.id}
            questionText={currentQuestion.question}
            options={currentQuestion.options}
            selectedAnswer={selectedAnswers[currentQuestionIndex] || ''}
            clearTrigger={!showResults}
            colors={colors}
          />
        )}
          {/* Question Navigator */}
          <View style={styles.questionNavigator}>
            <View style={styles.questionDotsContainer}>
              {quiz.questions.map((_: any, index: number) => {
                const isAnswered = !!selectedAnswers[index];
                const isCurrent = index === currentQuestionIndex;
                const isCorrectResult = showResults && questionResults[index] === true;
                const isWrongResult = showResults && questionResults[index] === false;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.questionDot,
                      !showResults && isAnswered && styles.questionDotAnswered,
                      isCurrent && !showResults && styles.questionDotCurrent,
                      !showResults && !isAnswered && !isCurrent && styles.questionDotUnanswered,
                      showResults && isCorrectResult && styles.questionDotCorrectResult,
                      showResults && isWrongResult && styles.questionDotWrongResult,
                      isCurrent && styles.questionDotCurrentHighlight,
                    ]}
                    onPress={() => setCurrentQuestionIndex(index)}
                  >
                    <Text
                      style={[
                        styles.questionDotText,
                        (isAnswered || isCurrent) && styles.questionDotTextActive,
                        !showResults && !isAnswered && !isCurrent && styles.questionDotTextUnanswered,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {!showResults && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[
                styles.navButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                currentQuestionIndex === 0 && styles.navButtonDisabled
              ]}
              onPress={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <Ionicons name="chevron-back" size={20} color={currentQuestionIndex === 0 ? colors.textSecondary : colors.text} />
              <Text style={[styles.navButtonText, { color: currentQuestionIndex === 0 ? colors.textSecondary : colors.text }]}>
                Previous
              </Text>
            </TouchableOpacity>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <TouchableOpacity style={[styles.navButton, styles.nextButton, { backgroundColor: colors.primary }]} onPress={handleNextQuestion}>
                <Text style={[styles.navButtonText, { color: '#fff' }]}>Next</Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: '#4CAF50' }, submitting && { opacity: 0.6 }]}
                onPress={handleSubmitQuiz}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#fff" />
                    <Text style={[styles.navButtonText, { color: '#fff' }]}>Verify Answers</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

     {/* Share Assessment Modal */}
      <ShareQuizModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        quizData={{
          ...quiz,
          id: quiz.id?.toString()
        }}
        onShareSuccess={handleShareSuccess}
      />

      {/* Share Options Modal */}
      {shareUrl && (
        <ShareOptionsModal
          visible={showShareOptionsModal}
          onClose={() => setShowShareOptionsModal(false)}
          shareUrl={shareUrl}
        />
      )}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: {
    flex: 1,
    width: '100%',
  },
  webContainer: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12 },
  topActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regenerateButton: {
    backgroundColor: '#4CAF50',
  },
  retakeButton: {
    backgroundColor: '#2196F3',
  },
  newButton: {
    backgroundColor: '#FF9800',
  },
  shareButton: {
    backgroundColor: '#9C27B0',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  inlineResultsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  performanceCard: {
    padding: 6,
    alignItems: 'center',
  },
  performanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  performanceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scoreCircle: {
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 11,
    marginTop: 1,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  statItem: {
    alignItems: 'center',
    gap: 1,
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  toggleExplanations: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  explanationContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsGridInline: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingBottom: 6,
    paddingTop: 4,
  },
  statCardInline: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  statCardCorrect: {
    backgroundColor: '#E8F5E9',
  },
  statCardIncorrect: {
    backgroundColor: '#FFEBEE',
  },
  statCardUnanswered: {
    backgroundColor: '#FFF3E0',
  },
  statNumberInline: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 1,
  },
  statLabelInline: {
    fontSize: 9,
    fontWeight: '600',
  },
  header: { padding: 8, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', flex: 1 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, gap: 4 },
  timerText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  progressSection: { gap: 8 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, textAlign: 'center' },
  scrollView: { flex: 1 },
  questionCard: { margin: 6, padding: 8, borderRadius: 12, elevation: 3 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  questionNumber: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  questionNumberText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  questionLabel: { fontSize: 14, fontWeight: '600' },
  questionText: { fontSize: 16, lineHeight: 24, marginBottom: 10, fontWeight: '500' },
  optionsContainer: { gap: 6 },
  optionCard: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 10, borderWidth: 1 },
  optionBullet: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  optionBulletText: { fontSize: 14, fontWeight: '600' },
  optionText: { flex: 1, fontSize: 15, lineHeight: 22 },
  footer: { padding: 8, borderTopWidth: 1 },
  footerButtons: { flexDirection: 'row', gap: 12 },
  navButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 6, borderWidth: 1 },
  navButtonDisabled: { opacity: 0.5 },
  nextButton: { borderWidth: 0 },
  submitButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 6 },
  navButtonText: { fontSize: 15, fontWeight: '600' },
  button: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  correctBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  wrongBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  questionNavigator: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  questionDotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  questionDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionDotAnswered: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  questionDotCurrent: {
    backgroundColor: '#5B21B6',
    borderColor: '#5B21B6',
  },
  questionDotCurrentHighlight: {
    borderWidth: 3,
    borderColor: '#215f27ff',
    transform: [{ scale: 1.1 }],
  },
  questionDotUnanswered: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  questionDotCorrectResult: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  questionDotWrongResult: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  questionDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  questionDotTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  questionDotTextUnanswered: {
    color: '#FF9800',
  },
});
