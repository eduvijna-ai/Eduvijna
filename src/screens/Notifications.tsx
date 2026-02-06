import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@core/hooks/useAuth';
import { apiClient } from '@core/api/config';
import { formatDistanceToNow } from 'date-fns';
import { ParsedQuiz, parseQuizAttempt, QuizAttempt } from '@core/types/dashboard.types';
import { useTeacherDashboard } from '@core/hooks/useTeacherDashboard';
import { getQuizBySessionId } from '@core/services/sharedApi';
import { isStudentQuizActive } from '../utils/quizFilters';

interface Props {
  navigation?: any;
  route?: any;
  onNavigate?: (screen: string, params?: any) => void;
}

export default function Notifications({ navigation, onNavigate }: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  const isTeacher = user?.role === 'instructor' || user?.role === 'admin';
  
  // Teacher data from hook
  const teacherData = useTeacherDashboard();
  
  // Student state
  const [studentQuizzes, setStudentQuizzes] = useState<ParsedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Fetch student quizzes (active + pending)
  const fetchStudentQuizzes = useCallback(async () => {
    if (!user || isTeacher) return;
    
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        view_type: 'student_total_details',
        limit: '100',
        offset: '0',
      });

      const url = `/api/v1/dashboard/quizzes?${params.toString()}`;
      const response = await apiClient.get(url);
      const data = response.data.data || [];

      // Process quizzes
      const parsed: ParsedQuiz[] = [];
      
      for (const quiz of data) {
        let attempts: QuizAttempt[] = [];
        if (quiz.attempts) {
          try {
            attempts = typeof quiz.attempts === 'string' 
              ? JSON.parse(quiz.attempts) 
              : quiz.attempts;
          } catch (e) {
            console.error('Error parsing attempts:', e);
            attempts = [];
          }
        }

        const attempt = attempts.find(a => a.status === 'completed') || 
                       attempts.find(a => a.status === 'pending') || 
                       attempts[0];

        const parsedQuiz: any = attempt 
          ? parseQuizAttempt(attempt, quiz.classroom_name, quiz.quiz_name)
          : {
              quiz_id: quiz.quiz_id,
              class_id: quiz.classroom_id,
              classroom_name: quiz.classroom_name,
              quiz_name: quiz.quiz_name,
              status: quiz.student_status,
              score: null,
              correct_answers: 0,
              question_count: quiz.question_count,
              time_spent_seconds: null,
              completed_at: null,
              started_at: null,
              end_time: quiz.end_time,
              created_at: quiz.created_at,
            };

        // Add quiz metadata
        parsedQuiz.quiz_id = quiz.quiz_id;
        parsedQuiz.class_id = quiz.classroom_id;
        parsedQuiz.availability_status = quiz.availability_status;
        parsedQuiz.session_id = quiz.session_id;
        parsedQuiz.assigned_at = quiz.assigned_at;
        parsedQuiz.due_date = quiz.due_date;
        parsedQuiz.start_time = quiz.start_time;
        parsedQuiz.end_time = quiz.end_time;

        // Filter using common utility: active availability + pending status + time window check
        // Only show quizzes that are currently active and available
        if (isStudentQuizActive(parsedQuiz)) {
          parsed.push(parsedQuiz);
        }
      }

      // Sort by assigned_at (newest first)
      parsed.sort((a, b) => {
        const dateA = new Date((a as any).assigned_at || a.created_at).getTime();
        const dateB = new Date((b as any).assigned_at || b.created_at).getTime();
        return dateB - dateA;
      });

      setStudentQuizzes(parsed);
    } catch (error) {
      console.error('Failed to load student quizzes:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isTeacher]);

  // Load data on mount
  useEffect(() => {
    if (isTeacher) {
      // Teacher uses hook data, just set loading false
      setLoading(teacherData.loading);
    } else {
      fetchStudentQuizzes();
    }
  }, [isTeacher, teacherData.loading, fetchStudentQuizzes]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (isTeacher) {
      await teacherData.refresh();
      setRefreshing(false);
    } else {
      await fetchStudentQuizzes();
    }
  };

  // Get submitted quizzes for teacher (completed quizzes)
  const getTeacherSubmissions = () => {
    if (!isTeacher) return [];
    
    // Filter quizzes where completed_count > 0
    return teacherData.quizzes
      .filter((quiz: any) => quiz.completed_count && quiz.completed_count > 0)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50); // Show last 50 submissions
  };

  const handleStudentQuizPress = async (quiz: ParsedQuiz) => {
    const sessionId = (quiz as any).session_id;
    
    if (!sessionId) {
      Alert.alert('Error', 'Unable to load quiz. Missing session ID.');
      return;
    }

    try {
      // Fetch complete quiz data with questions
      const response = await getQuizBySessionId(sessionId);
      //console.log('Fetched quiz data from sessionId:', sessionId, response);
      if (!response.success || !response.quiz_data) {
        Alert.alert('Error', 'Unable to load quiz details.');
        return;
      }

      const fetchedQuiz = response.quiz_data;
      
      // Extract questions from the nested structure
      let questions: any[] = [];
      if (fetchedQuiz.questions?.quizzes && Array.isArray(fetchedQuiz.questions.quizzes)) {
        questions = fetchedQuiz.questions.quizzes.map((q: any, index: number) => ({
          id: `q-${index}`,
          question: q.quiz.question,
          options: q.quiz.options,
          correctAnswer: q.quiz.answer,
          answer: q.answer,
          explanation: null,
        }));
      }

      // Prepare complete quiz data
      const quizData = {
        id: fetchedQuiz.quiz_id || quiz.quiz_id,
        quiz_id: fetchedQuiz.quiz_id || quiz.quiz_id,
        session_id: sessionId,
        classroom_id: quiz.class_id,
        title: fetchedQuiz.topic || quiz.quiz_name || 'Assessment',
        subject: fetchedQuiz.summary,
        duration: fetchedQuiz.duration || 30,
        has_time_limit: fetchedQuiz.has_time_limit ?? true,
        is_public: fetchedQuiz.is_public ?? false,
        questions: questions,
      };

      // Navigate with complete quiz data
      if (navigation) {
        navigation.navigate('QuizTakingScreen', {
          quizId: quiz.quiz_id,
          sessionId: sessionId,
          classroomId: quiz.class_id,
          quizData: quizData,
        });
      } else if (onNavigate) {
        onNavigate('QuizTakingScreen', {
          quizId: quiz.quiz_id,
          sessionId: sessionId,
          classroomId: quiz.class_id,
          quizData: quizData,
        });
      }
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
      Alert.alert('Error', 'Failed to load quiz. Please try again.');
    }
  };

  const handleTeacherQuizPress = (quiz: any) => {
    if (navigation) {
      navigation.navigate('StudentList', {
        quizId: quiz.quiz_id,
        quizName: quiz.quiz_name || quiz.topic,
      });
    } else if (onNavigate) {
      onNavigate('StudentList', {
        quizId: quiz.quiz_id,
        quizName: quiz.quiz_name || quiz.topic,
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner size={60} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading notifications...</Text>
      </View>
    );
  }

  const notifications = isTeacher ? getTeacherSubmissions() : studentQuizzes;
  const unreadCount = notifications.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with unread count */}
      <View style={[styles.headerContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="notifications" size={14} color="#fff" />
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {isTeacher ? 'New submissions' : 'Pending quizzes'}
            </Text>
          </View>
        </View>
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {isTeacher ? 'No new submissions' : 'No pending quizzes'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            dimensions.width >= 768 && styles.scrollContentWeb,
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {notifications.map((item: any, index) => {
            if (isTeacher) {
              // Teacher view - show quiz submissions
              return (
                <TouchableOpacity
                  key={`${item.quiz_id}_${index}`}
                  style={[
                    styles.notificationCard,
                    dimensions.width >= 768 && styles.notificationCardWeb,
                    { 
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }
                  ]}
                  onPress={() => handleTeacherQuizPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.notificationLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                      <Ionicons 
                        name="people" 
                        size={24} 
                        color={colors.primary} 
                      />
                    </View>
                  </View>
                  
                  <View style={styles.notificationContent}>
                    <Text style={[styles.quizTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.quiz_name || item.topic}
                    </Text>
                    <Text style={[styles.classroomName, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.classroom_name}
                    </Text>
                    <View style={styles.statsRow}>
                      <Text style={[styles.statText, { color: colors.textSecondary }]}>
                        {item.completed_count || 0} completed
                      </Text>
                      <Text style={[styles.statText, { color: colors.textSecondary }]}>
                        • {item.pending_count || 0} pending
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.notificationRight}>
                    <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                      {formatTimeAgo(item.created_at)}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginTop: 4 }} />
                  </View>
                </TouchableOpacity>
              );
            } else {
              // Student view - show pending quizzes
              return (
                <TouchableOpacity
                  key={`${item.quiz_id}_${item.session_id}`}
                  style={[
                    styles.notificationCard,
                    dimensions.width >= 768 && styles.notificationCardWeb,
                    { 
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }
                  ]}
                  onPress={() => handleStudentQuizPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.notificationLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                      <Ionicons 
                        name="document-text" 
                        size={24} 
                        color={colors.primary} 
                      />
                    </View>
                  </View>
                  
                  <View style={styles.notificationContent}>
                    <Text style={[styles.quizTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.quiz_name}
                    </Text>
                    <Text style={[styles.classroomName, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.classroom_name}
                    </Text>
                    {(item as any).due_date && (
                      <View style={styles.dueRow}>
                        <Ionicons name="time-outline" size={14} color={colors.error} />
                        <Text style={[styles.dueText, { color: colors.error }]}>
                          Due {formatTimeAgo((item as any).due_date)}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.notificationRight}>
                    <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                      {formatTimeAgo((item as any).assigned_at || item.created_at)}
                    </Text>
                    <View style={[styles.pendingBadge, { backgroundColor: `${colors.primary}20` }]}>
                      <Text style={[styles.pendingText, { color: colors.primary }]}>Start</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({
      web: {
        maxWidth: 1400,
        width: '100%',
        alignSelf: 'center',
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  scrollContentWeb: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  notificationCardWeb: {
    marginHorizontal: 0,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        ':hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
        },
      },
    }),
  },
  notificationLeft: {
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    ...Platform.select({
      web: {
        fontSize: 17,
      },
    }),
  },
  classroomName: {
    fontSize: 14,
    marginBottom: 2,
    ...Platform.select({
      web: {
        fontSize: 15,
      },
    }),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  statText: {
    fontSize: 13,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dueText: {
    fontSize: 12,
    fontWeight: '500',
  },
  notificationRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
  },
  timeText: {
    fontSize: 12,
    marginBottom: 4,
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
