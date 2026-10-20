import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useErpRole } from '../erp/hooks/useErpRole';
import { formatDistanceToNow } from 'date-fns';
import { ParsedQuiz } from '@core/types/dashboard.types';
import { useTeacherDashboard } from '@core/hooks/useTeacherDashboard';
import { getQuizBySessionId, checkQuizAttempt } from '@core/services/sharedApi';
import { executeStudentAssignedQuizViewResults } from '@core/services/assessmentQuizStart.service';
import {
  canApplyPendingNotificationsResult,
  invalidatePendingStudentNotificationsLoads,
  loadPendingStudentNotifications,
  usesTeacherNotificationsPath,
  type PendingNotificationsScope,
} from '@core/services/pendingStudentNotificationsLoad';
import { useUserStore } from '@core/store/user.store';

interface Props {
  navigation?: any;
  route?: any;
  onNavigate?: (screen: string, params?: any) => void;
}

export default function Notifications({ navigation, onNavigate }: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();
  const { isTeacher: isErpTeacher, isAdmin: isErpAdmin } = useErpRole();
  const schoolId = useUserStore((s) => s.schoolId);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  // Canonical ERP helper: instructor | teacher → teacher path; admin → teacher submissions.
  const isTeacher = isErpTeacher || isErpAdmin || usesTeacherNotificationsPath(user?.role);

  // Teacher data from hook
  const teacherData = useTeacherDashboard();

  // Student state
  const [studentQuizzes, setStudentQuizzes] = useState<ParsedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classroomLookupWarning, setClassroomLookupWarning] = useState('');

  // Live scope refs — completion handlers read these, not values closed over at request start.
  const scopeRef = useRef<PendingNotificationsScope | null>(null);
  scopeRef.current = user
    ? { userId: String(user.id), schoolId, role: user.role }
    : null;
  const mountedRef = useRef(true);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Invalidate pending loads on logout / account / school / role change and unmount.
  useEffect(() => {
    mountedRef.current = true;
    invalidatePendingStudentNotificationsLoads();
    return () => {
      mountedRef.current = false;
      invalidatePendingStudentNotificationsLoads();
    };
  }, [user?.id, schoolId, user?.role]);

  // Fetch student pending quizzes via check-record endpoint.
  // status: null → pending (shown here)   |   status: "completed" → not shown
  // Classroom names: account/school-scoped lookup with failure ≠ empty map.
  // Note: do NOT depend on `refreshing` — that recreates the callback and duplicates loads.
  const fetchStudentQuizzes = useCallback(async () => {
    const scope = scopeRef.current;
    if (!scope?.userId || usesTeacherNotificationsPath(scope.role)) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setLoading(true);
    setClassroomLookupWarning('');

    const result = await loadPendingStudentNotifications(scope, {
      getCurrentScope: () => (mountedRef.current ? scopeRef.current : null),
    });

    if (!mountedRef.current) return;
    if (!canApplyPendingNotificationsResult(result, () => scopeRef.current)) {
      // Stale success/error must not update the new session. Clear spinner only when
      // no student scope remains (logout / role flip); a live student scope has a newer load.
      const live = scopeRef.current;
      if (!live?.userId || usesTeacherNotificationsPath(live.role)) {
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    if (result.kind === 'error') {
      console.error('Failed to load student quizzes:', result.error);
      Alert.alert('Error', 'Failed to load notifications');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (result.kind === 'ok') {
      const { lookupResult, quizzes } = result.data;
      if (lookupResult.status === 'failed') {
        setClassroomLookupWarning(
          lookupResult.priorMap?.size
            ? 'Classroom names may be outdated. Pull to refresh.'
            : 'Classroom names could not be loaded. Pull to refresh.',
        );
      }
      setStudentQuizzes(quizzes);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  // Load data when role path or teacher hook loading changes (student fetch is stable).
  useEffect(() => {
    if (isTeacher) {
      setStudentQuizzes([]);
      setClassroomLookupWarning('');
      setLoading(teacherData.loading);
    } else if (!user) {
      setStudentQuizzes([]);
      setLoading(false);
      setRefreshing(false);
    } else {
      void fetchStudentQuizzes();
    }
  }, [isTeacher, teacherData.loading, fetchStudentQuizzes, user?.id, schoolId, user]);

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
      
      // Extract questions from the nested structure, limited to question_count
      // (matches web OpenQuizPage which uses only the teacher-selected subset)
      let questions: any[] = [];
      if (fetchedQuiz.questions?.quizzes && Array.isArray(fetchedQuiz.questions.quizzes)) {
        const questionLimit = fetchedQuiz.question_count || fetchedQuiz.questions.quizzes.length;
        questions = fetchedQuiz.questions.quizzes.slice(0, questionLimit).map((q: any, index: number) => ({
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

      // Check if student already completed this quiz — prevent duplicate attempts.
      // Same guard as Assessments.tsx handleAction.
      if (user?.id) {
        const studentIdStr = user.id.toString();
        const attemptCheck = await checkQuizAttempt(
          fetchedQuiz.quiz_id || quiz.quiz_id,
          studentIdStr,
          sessionId,
        );
        if (attemptCheck.hasAttempted && attemptCheck.status === 'completed') {
          const classroomId = quiz.class_id || (quiz as any).classroom_id || '';
          await executeStudentAssignedQuizViewResults(
            {
              studentId: studentIdStr,
              quizId: fetchedQuiz.quiz_id || quiz.quiz_id,
              sessionId,
              classroomId: String(classroomId),
              attemptData: quiz as Record<string, unknown>,
              quizName: fetchedQuiz.topic || quiz.quiz_name,
            },
            { navigation, onNavigate },
          );
          return;
        }
      }

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

      {!isTeacher && !!classroomLookupWarning ? (
        <View style={styles.lookupWarning}>
          <Ionicons name="information-circle-outline" size={16} color="#B45309" />
          <Text style={styles.lookupWarningText}>{classroomLookupWarning}</Text>
        </View>
      ) : null}

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
  lookupWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#FCD34D',
  },
  lookupWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: '#92400E',
  },
});
