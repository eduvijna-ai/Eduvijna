import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@core/hooks/useAuth';
import { apiClient } from '@core/api/config';
import { useDashboardStore } from '@core/store/dashboard.store';
import {
  QuizAttempt,
  ParsedQuiz,
  DashboardStats,
  parseQuizAttempt,
} from '@core/types/dashboard.types';

interface Props {
  navigation?: any;
}

export default function StudentDashboard({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { user, isAuthenticated, isLoading } = useAuth();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  // Dashboard store for sharing data with ClassesList
  const { setQuizzes } = useDashboardStore();

  // Debug authentication state
  console.log('🔍 StudentDashboard Auth State:', {
    isAuthenticated,
    isLoading,
    user: user ? { id: user.id, role: user.role, name: user.name } : null
  });
  const width = dimensions.width;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    total_quizzes: 0,
    completed_count: 0,
    pending_count: 0,
    missed_count: 0,
    average_score: 0,
    total_time_spent: 0,
    total_questions_attempted: 0,
    total_classes: 0,
  });
  const [allQuizzes, setAllQuizzes] = useState<ParsedQuiz[]>([]);
  const [selectedClassroom] = useState<string>('ALL');

  const isWeb = width >= 768;
  const isTablet = width >= 600 && width < 1024;

  // Dimension listener
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Fetch student dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.log('⚠️ User not authenticated, skipping dashboard fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Build query params - classroom filter optional
      const params = new URLSearchParams({
        view_type: 'student_total_details',
        limit: '100',
        offset: '0',
      });

      if (selectedClassroom && selectedClassroom !== 'ALL') {
        params.append('classroom_id', selectedClassroom);
      }

      const url = `/api/v1/dashboard/quizzes?${params.toString()}`;

      const response = await apiClient.get(url);

      const data = response.data.data || [];

      if (data.length > 0) {
        // Process quizzes similar to teacher dashboard
        const parsed: ParsedQuiz[] = [];
        let allAttempts: QuizAttempt[] = [];

        for (const quiz of data) {
          // Parse attempts for this quiz
          let attempts: QuizAttempt[] = [];
          if (quiz.attempts) {
            try {
              attempts = typeof quiz.attempts === 'string' 
                ? JSON.parse(quiz.attempts) 
                : quiz.attempts;
            } catch (e) {
              console.error('Error parsing attempts for quiz:', quiz.quiz_id, e);
              attempts = [];
            }
          }

          // Add to all attempts for stats calculation
          allAttempts = allAttempts.concat(attempts);

          // Create parsed quiz entry
          const attempt = attempts.find(a => a.status === 'completed') || 
                         attempts.find(a => a.status === 'pending') || 
                         attempts[0];

          if (attempt) {
            const parsedAttempt = parseQuizAttempt(attempt, quiz.classroom_name, quiz.quiz_name);
            // Override with quiz data
            parsedAttempt.question_count = quiz.question_count;
            parsedAttempt.quiz_id = quiz.quiz_id;
            parsedAttempt.class_id = quiz.classroom_id;
            // Add all missing quiz fields
            (parsedAttempt as any).attempt_id = attempt.attempt_id;
            (parsedAttempt as any).log_data = (attempt as any).log_data || (attempt as any).submission?.log_data;
            (parsedAttempt as any).questions = attempt.questions;
            (parsedAttempt as any).availability_status = quiz.availability_status;
            (parsedAttempt as any).duration = quiz.duration;
            (parsedAttempt as any).start_time = quiz.start_time;
            (parsedAttempt as any).end_time = quiz.end_time;
            (parsedAttempt as any).topic = quiz.topic;
            (parsedAttempt as any).subject = quiz.subject;
            (parsedAttempt as any).due_date = quiz.due_date;
            (parsedAttempt as any).assigned_at = quiz.assigned_at;
            (parsedAttempt as any).quiz_type = quiz.quiz_type;
            (parsedAttempt as any).has_time_limit = quiz.has_time_limit;
            (parsedAttempt as any).attempts_allowed = quiz.attempts_allowed;
            parsed.push(parsedAttempt);
          } else {
            // Create quiz entry for quizzes without attempts
            parsed.push({
              quiz_id: quiz.quiz_id,
              class_id: quiz.classroom_id,
              classroom_name: quiz.classroom_name,
              quiz_name: quiz.quiz_name,
              status: quiz.student_status as 'pending' | 'completed' | 'missed',
              score: null,
              correct_answers: 0,
              question_count: quiz.question_count,
              time_spent_seconds: null,
              completed_at: null,
              started_at: null,
              end_time: quiz.end_time,
              created_at: quiz.created_at,
              attempt_number: null,
              is_overdue: false,
              availability_status: quiz.availability_status,
              duration: quiz.duration,
              start_time: quiz.start_time,
              topic: quiz.topic,
              subject: quiz.subject,
              due_date: quiz.due_date,
              assigned_at: quiz.assigned_at,
              quiz_type: quiz.quiz_type,
              has_time_limit: quiz.has_time_limit,
              attempts_allowed: quiz.attempts_allowed,
            } as any);
          }
        }

        // Calculate stats from all attempts
        const completed = allAttempts.filter(a => a.status === 'completed');
        const pending = allAttempts.filter(a => a.status === 'pending');
        const missed = allAttempts.filter(a => a.status === 'missed');

        const scores = completed.filter(a => a.score !== null).map(a => a.score!);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        const totalTime = completed.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);

        // Calculate total unique classes
        const uniqueClasses = new Set(parsed.map(q => q.class_id).filter(id => id));
        const totalClasses = uniqueClasses.size;

        setStats({
          total_quizzes: data.length,
          completed_count: completed.length,
          pending_count: pending.length,
          missed_count: missed.length,
          average_score: Math.round(avgScore),
          total_time_spent: totalTime,
          total_questions_attempted: parsed.reduce((sum, q) => sum + q.question_count, 0),
          total_classes: totalClasses,
        });

        setAllQuizzes(parsed);
        
        // Store parsed quizzes in dashboard store for ClassesList to reuse
        setQuizzes(parsed as any, data.length);
        console.log('✅ Stored', parsed.length, 'quizzes in dashboard store');
      } else {
        // No data
        setStats({
          total_quizzes: 0,
          completed_count: 0,
          pending_count: 0,
          missed_count: 0,
          average_score: 0,
          total_time_spent: 0,
          total_questions_attempted: 0,
          total_classes: 0,
        });
        setAllQuizzes([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching student dashboard:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
      });
      if (!refreshing) {
        Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedClassroom, refreshing]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Time ago formatter
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Format time spent in readable format
  const formatTimeSpent = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Filter quizzes by status
  const pendingQuizzes = allQuizzes.filter(q => q.status === 'pending');
  const upcomingQuizzes = allQuizzes.filter(q => (q as any).availability_status === 'available_soon');
  const completedQuizzes = allQuizzes
    .filter(q => q.status === 'completed')
    .sort((a, b) => {
      // Sort by completion date, most recent first
      const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return dateB - dateA;
    });

  // Authentication check - show message if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="log-in-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Please log in to view your dashboard
          </Text>
        </View>
      </View>
    );
  }

  // Loading state
  if (loading && allQuizzes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        isWeb && styles.scrollContentWeb,
      ]}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Pending Quiz Banner */}
      {pendingQuizzes.length > 0 && (
        <View style={styles.bannerContainer}>
          <View style={[styles.banner, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}>
            <View style={styles.bannerContent}>
              <View style={[styles.bannerIcon, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="time" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: '#2563EB' }]}>
                  {pendingQuizzes.length} Pending Quiz{pendingQuizzes.length > 1 ? 'zes' : ''}!
                </Text>
                <Text style={[styles.bannerSubtitle, { color: colors.text }]}>
                  Available to take now
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.bannerButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                // Find the first pending quiz to start
                // const firstPendingQuiz = pendingQuizzes[0];
                // if (firstPendingQuiz) {
                //   navigation?.navigate('QuizTaking', { 
                //     quizId: firstPendingQuiz.quiz_id,
                //     quizName: firstPendingQuiz.quiz_name,
                //     sessionId: firstPendingQuiz.session_id 
                //   });
                // } else {
                  navigation?.navigate('Assessments', { filterStatus: 'ongoing' });
                //}
              }}
            >
              <Text style={styles.bannerButtonText}>Start</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats Overview - 4 Tiles in One Row */}
      <View style={styles.quizStatusSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
        <View style={styles.statsRowContainer}>
          <TouchableOpacity
            style={[styles.statTile, { backgroundColor: colors.card }]}
            onPress={() => navigation?.navigate('ClassesList')}
            activeOpacity={0.7}
          >
            <View style={[styles.tileIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="school" size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Classes</Text>
            <Text style={[styles.tileDescription, { color: colors.textSecondary }]}>
              {stats.total_classes || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statTile, { backgroundColor: colors.card }]}
            onPress={() => navigation?.navigate('Assessments', { filterStatus: 'all' })}
            activeOpacity={0.7}
          >
            <View style={[styles.tileIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="document-text" size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Quizzes</Text>
            <Text style={[styles.tileDescription, { color: colors.textSecondary }]}>
              {stats.total_quizzes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statTile, { backgroundColor: colors.card }]}
            onPress={() => navigation?.navigate('Assessments', { filterStatus: 'completed' })}
            activeOpacity={0.7}
          >
            <View style={[styles.tileIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-done" size={24} color="#059669" />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Completed</Text>
            <Text style={[styles.tileDescription, { color: colors.textSecondary }]}>
              {stats.completed_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statTile, { backgroundColor: colors.card }]}
            onPress={() => navigation?.navigate('Assessments', { filterStatus: 'completed' })}
            activeOpacity={0.7}
          >
            <View style={[styles.tileIcon, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="trophy" size={24} color="#A855F7" />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Avg Score</Text>
            <Text style={[styles.tileDescription, { color: colors.textSecondary }]}>
              {stats.average_score}%
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Practice & Learn Section */}
      {/* <QuizGenerationGrid
        navigation={navigation}
        theme={theme}
        showTitle={true}
      /> */}

      {/* Two Column Layout for Web/Tablet */}
      <View style={[
        styles.bottomSection,
        (isWeb || isTablet) && styles.bottomSectionRow,
      ]}>
        {/* Recent Completions */}
        <View style={[
          styles.section,
          (isWeb || isTablet) && styles.sectionHalf,
        ]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Completions
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {completedQuizzes.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No completed quizzes yet
                </Text>
              </View>
            ) : (
              completedQuizzes.slice(0, 5).map((quiz, index) => {
                const scoreColor = quiz.score && quiz.score >= 70 ? '#4CAF50' : quiz.score && quiz.score >= 50 ? '#FF9800' : '#F44336';
                const scoreText = quiz.score !== null ? `${quiz.score}%` : 'N/A';
                const correctText = quiz.correct_answers !== undefined ? `${quiz.correct_answers}/${quiz.question_count}` : '';
                
                return (
                  <TouchableOpacity 
                    key={`${quiz.quiz_id}-${index}`}
                    style={[
                      styles.activityItem,
                      index < completedQuizzes.length - 1 && { 
                        borderBottomWidth: 1, 
                        borderBottomColor: colors.border 
                      },
                    ]}
                    onPress={() => {
                      // Navigate to QuizResultsScreen in student view mode
                      // QuizResultsScreen will fetch the full quiz data including questions and answers
                      navigation?.navigate('QuizResultsScreen', { 
                        quizId: quiz.quiz_id,
                        quizName: quiz.quiz_name,
                        isTeacherView: true, // Use teacher view mode to fetch full data
                        // attemptId will be fetched from quiz attempts in QuizResultsScreen
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.activityInfo}>
                      <View style={styles.activityHeader}>
                        <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                        <Text style={[styles.activityTitle, { color: colors.text }]}>
                          {quiz.quiz_name || `Quiz #${quiz.quiz_id}`}
                        </Text>
                      </View>
                      <View style={styles.quizDetailsRow}>
                        <View style={styles.detailItem}>
                          <Ionicons name="document-text" size={12} color={colors.textSecondary} />
                          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                            {quiz.question_count} Questions {correctText && `(${correctText} correct)`}
                          </Text>
                        </View>
                        {quiz.time_spent_seconds && quiz.time_spent_seconds > 0 && (
                          <View style={styles.detailItem}>
                            <Ionicons name="timer" size={12} color={colors.textSecondary} />
                            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                              {formatTimeSpent(quiz.time_spent_seconds)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                        {quiz.classroom_name} • {quiz.completed_at ? formatTimeAgo(quiz.completed_at) : 'Recently'}
                      </Text>
                    </View>
                    <View style={[
                      styles.scoreCircle,
                      { backgroundColor: `${scoreColor}20`, borderColor: scoreColor }
                    ]}>
                      <Text style={[styles.scoreText, { color: scoreColor }]}>
                        {scoreText}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        {/* Upcoming Assessments */}
        {upcomingQuizzes.length > 0 && (
          <View style={[
            styles.section,
            (isWeb || isTablet) && styles.sectionHalf,
          ]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Upcoming Assessments
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {upcomingQuizzes.slice(0, 5).map((quiz, index) => {
                return (
                  <View
                    key={`${quiz.quiz_id}-${index}`}
                    style={[
                      styles.topicItem,
                      index < upcomingQuizzes.length - 1 && { 
                        borderBottomWidth: 1, 
                        borderBottomColor: colors.border 
                      },
                    ]}
                  >
                    <View style={styles.topicInfo}>
                      <View style={styles.activityHeader}>
                        <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                        <Text style={[styles.topicName, { color: colors.text }]}>
                          {quiz.quiz_name || `Quiz #${quiz.quiz_id}`}
                        </Text>
                      </View>
                      <Text style={[styles.topicScore, { color: colors.textSecondary }]}>
                        {quiz.classroom_name} • {quiz.question_count} Questions
                      </Text>
                    </View>
                    <View style={[styles.upcomingBadge, { backgroundColor: '#EDE9FE' }]}>
                      <Text style={[styles.upcomingText, { color: theme.colors.primary }]}>Coming Soon</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
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
  scrollContent: {
    paddingBottom: 8,
  },
  scrollContentWeb: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bannerContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  banner: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  bannerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  summarySection: {
    padding: 16,
    gap: 12,
  },
  summarySectionWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCardWeb: {
    flex: 1,
    minWidth: 180,
    margin: 6,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardContent: {
    flex: 1,
  },
  summaryCardLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  quizStatusSection: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statsRowContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  statTile: {
    flex: 1,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 80,
  },
  section: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sectionHalf: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  tilesContainerWeb: {
    gap: 12,
  },
  tile: {
    width: '30%',
    minWidth: 80,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tileWeb: {
    width: 'auto',
    flex: 1,
    minWidth: 100,
    maxWidth: 120,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 1,
  },
  tileDescription: {
    fontSize: 10,
    textAlign: 'center',
  },
  bottomSection: {
    gap: 0,
  },
  bottomSectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  card: {
    borderRadius: 10,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 8,
  },
  quizItem: {
    borderRadius: 10,
    padding: 12,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  quizDate: {
    fontSize: 11,
  },
  quizTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  quizFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quizMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quizTopic: {
    fontSize: 12,
  },
  quizDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  activityInfo: {
    flex: 1,
    gap: 4,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 11,
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  topicInfo: {
    flex: 1,
    gap: 4,
  },
  topicName: {
    fontSize: 14,
    fontWeight: '600',
  },
  topicScore: {
    fontSize: 12,
  },
  missedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  missedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  upcomingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  upcomingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quizCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDetail: {
    fontSize: 14,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  cardButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
