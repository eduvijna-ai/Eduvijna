import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchTeacherDashboardSummary, fetchTeacherQuizzes } from '@core/services/dashboardApi';
import { useTeacherTheme } from '../erp_schools/theme/useTeacherTheme';
import { DateRangeFilter, FilterSection, ClassroomFilter } from '../components/FilterComponents';
import { DateFilterType } from '../utils/dateFilters';

interface Props {
  route: any;
  navigation?: any;
  onNavigate?: (screen: string, params?: any) => void;
}

interface QuizAttempt {
  quiz_id: number;
  quiz_name: string;
  topic: string;
  classroom_id: string;
  classroom_name?: string;
  status: string;
  score: number | null;
  attempt_number: number | null;
  attempt_id?: number | null;
  started_at: string | null;
  completed_at: string | null;
  end_time: string;
  questions?: any;
  log_data?: any;
  time_spent_seconds?: number | null;
}

interface TopicPerformance {
  topic: string;
  averageScore: number;
  quizCount: number;
  completedCount: number;
}

interface QuizOption {
  quiz_id: number;
  quiz_name: string;
}

interface StudentSummary {
  totalQuizzes: number;
  attemptedCount: number;
  completedCount: number;
  missedCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

export default function StudentAnalyticsScreen({ route, navigation, onNavigate }: Props) {
  const { studentId, studentName, classroomId, classroomName } = route.params || {};
  
  const theme = useTeacherTheme();
  const colors = {
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.textPrimary,
    textSecondary: theme.colors.textSecondary,
    primary: theme.colors.primary,
    border: theme.colors.border,
    error: theme.colors.danger,
    success: theme.colors.success,
    inputBackground: theme.colors.surfaceAlt,
  };
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Student Summary
  const [summary, setSummary] = useState<StudentSummary>({
    totalQuizzes: 0,
    attemptedCount: 0,
    completedCount: 0,
    missedCount: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
  });
  
  // Quiz Attempts
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [filteredAttempts, setFilteredAttempts] = useState<QuizAttempt[]>([]);
  
  // Topic Analysis
  const [strongTopics, setStrongTopics] = useState<TopicPerformance[]>([]);
  const [weakTopics, setWeakTopics] = useState<TopicPerformance[]>([]);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Absent' | 'In Progress'>('All');
  const [sortBy, setSortBy] = useState<'score' | 'date'>('date');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('this_month');
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<QuizOption[]>([]);
  
  // Initialize with current month's date range - use function to ensure it only runs once
  const [dateRangeStart, setDateRangeStart] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dateRangeEnd, setDateRangeEnd] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  });
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [classrooms, setClassrooms] = useState<Array<{ classroom_id: string; classroom_name: string }>>([]);
  const [displayCount, setDisplayCount] = useState(10);

  // Set initial classroom filter from navigation params
  useEffect(() => {
    if (classroomId) {
      setSelectedClassroom(classroomId);
    }
  }, [classroomId]);

  // Calculate filter counts based on quiz filter (before status filter)
  const filterCounts = useMemo(() => {
    // First apply quiz filter if selected
    let baseFiltered = [...quizAttempts];
    if (selectedQuiz) {
      baseFiltered = baseFiltered.filter(attempt => attempt.quiz_id === selectedQuiz);
    }

    // Calculate counts from quiz-filtered data
    const completed = baseFiltered.filter(a => a.status?.toLowerCase() === 'completed');
    const missed = baseFiltered.filter(a => {
      const s = a.status?.toLowerCase() || '';
      return s === 'missed' || s === 'absent';
    });
    const inProgress = baseFiltered.filter(a => {
      const s = a.status?.toLowerCase() || '';
      return s === 'pending' || s === 'in_progress';
    });

    const scores = completed.map(a => a.score).filter(s => s !== null) as number[];
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowScore = scores.length > 0 ? Math.min(...scores) : 0;

    return {
      total: baseFiltered.length,
      completed: completed.length,
      inProgress: inProgress.length,
      missed: missed.length,
      averageScore: avgScore,
      highestScore: highScore,
      lowestScore: lowScore,
    };
  }, [quizAttempts, selectedQuiz]);

  // Apply filters and sorting - moved setDisplayCount to filter change handlers
  useEffect(() => {
    let filtered = [...quizAttempts];

    // Apply quiz filter
    if (selectedQuiz) {
      filtered = filtered.filter(attempt => attempt.quiz_id === selectedQuiz);
    }

    // Apply status filter (summary view uses different status values)
    if (statusFilter !== 'All') {
      filtered = filtered.filter(attempt => {
        const status = attempt.status?.toLowerCase() || '';
        if (statusFilter === 'Completed') return status === 'completed';
        if (statusFilter === 'Absent') return status === 'missed' || status === 'absent';
        if (statusFilter === 'In Progress') return status === 'pending' || status === 'in_progress';
        return true;
      });
    }

    // Only re-sort if user explicitly selected score sorting
    // Data is already sorted by date from API response
    if (sortBy === 'score') {
      filtered.sort((a, b) => {
        const scoreA = a.score ?? -1;
        const scoreB = b.score ?? -1;
        return scoreB - scoreA; // DESC - highest first
      });
    }
    // If sortBy is 'date', keep the existing order from API (already sorted by date)

    setFilteredAttempts(filtered);
  }, [quizAttempts, selectedQuiz, statusFilter, sortBy]);

  const loadAnalytics = useCallback(async () => {
    if (!studentId) {
      console.log('❌ StudentAnalytics: No studentId provided');
      return;
    }
    
    try {
      setLoading(true);
      
      // Always fetch ALL quizzes first to build complete classroom list
      const response = await fetchTeacherDashboardSummary({
        view_type: 'all',
        limit: 1000,
        offset: 0,
      });

      // Extract ALL unique classrooms from the complete dataset (before filtering)
      const uniqueClassrooms = new Map<string, string>();
      response.data.forEach((item: any) => {
        if (item.classroom_id) {
          const classroomName = item.classroom_name || `Class ${item.classroom_id.replace('class_', '').toUpperCase()}`;
          uniqueClassrooms.set(item.classroom_id, classroomName);
        }
      });

      const classroomsList = Array.from(uniqueClassrooms.entries()).map(([id, name]) => ({
        classroom_id: id,
        classroom_name: name,
      }));
      setClassrooms(classroomsList);

      // Extract unique quizzes from the complete dataset for quiz filter dropdown
      const uniqueQuizzes = new Map<number, string>();
      response.data.forEach((item: any) => {
        if (item.quiz_id && item.quiz_name) {
          uniqueQuizzes.set(item.quiz_id, item.quiz_name);
        }
      });

      const quizzesList = Array.from(uniqueQuizzes.entries()).map(([id, name]) => ({
        quiz_id: id,
        quiz_name: name,
      }));
      setAvailableQuizzes(quizzesList);

      // Apply classroom filter first
      let filteredData = response.data;
      if (selectedClassroom && selectedClassroom !== 'all') {
        filteredData = filteredData.filter((item: any) => item.classroom_id === selectedClassroom);
      }

      // Apply date filter
      if (dateFilter !== 'all') {
        filteredData = filteredData.filter((item: any) => {
          const quizDate = new Date(item.created_at || item.end_time);
          return quizDate >= dateRangeStart && quizDate <= dateRangeEnd;
        });
      }

      // Process quiz data - handle both 'summary' and 'all' view types
      const studentAttempts: QuizAttempt[] = [];
      
      filteredData.forEach((quiz: any) => {
        // Check if this quiz has attempts (view_type: 'all') or student_status (view_type: 'summary')
        if (quiz.attempts) {
          // console.log('📋 Processing quiz with attempts:', quiz.quiz_id, quiz.quiz_name);
          // Handle 'all' view type - same as StudentList
          const attempts = typeof quiz.attempts === 'string'
            ? JSON.parse(quiz.attempts)
            : quiz.attempts;
          
          // console.log('  👥 Total attempts in quiz:', Array.isArray(attempts) ? attempts.length : 0);
          
          if (Array.isArray(attempts)) {
            // Find this student's attempt in the quiz
            const studentAttempt = attempts.find((attempt: any) => 
              String(attempt.student_id) === String(studentId)
            );
            
            // ONLY process quizzes where the student has an attempt record
            // This ensures we only count quizzes the student is actually assigned to
            if (studentAttempt) {
              
              // Parse subject JSON to get question count
              let questionCount = quiz.question_count || 0;
              try {
                if (quiz.subject && typeof quiz.subject === 'string') {
                  const subjectData = JSON.parse(quiz.subject);
                  questionCount = subjectData.quizzes?.length || questionCount;
                }
              } catch (e) {
                console.warn('Failed to parse subject JSON:', e);
              }
              
              const quizName = `${quiz.quiz_name || `Quiz ${quiz.quiz_id}`} (${questionCount} Qs)`;
              
              // Determine status from attempt
              let status = 'missed';
              if (studentAttempt.score !== null && studentAttempt.score !== undefined) {
                status = 'completed';
              } else if (studentAttempt.status) {
                status = studentAttempt.status;
              }
              
              studentAttempts.push({
                quiz_id: quiz.quiz_id,
                quiz_name: quizName,
                topic: quiz.topic || 'General',
                classroom_id: quiz.classroom_id || 'unknown',
                classroom_name: quiz.classroom_name || `Class ${quiz.classroom_id}`,
                status: status,
                score: studentAttempt.score !== null ? Number(studentAttempt.score) : null,
                attempt_number: studentAttempt.attempt_number || null,
                attempt_id: studentAttempt.attempt_id || null,
                started_at: studentAttempt.started_at || null,
                completed_at: studentAttempt.completed_at || null,
                end_time: quiz.end_time || quiz.due_date,
                questions: studentAttempt.questions || quiz.questions || null,
                log_data: studentAttempt.log_data || null,
                time_spent_seconds: studentAttempt.time_spent_seconds || null,
              });
            }
            // Note: We no longer create 'missed' entries for quizzes without student attempts
            // This ensures we only count quizzes the student is actually assigned to
          }
        } else if (quiz.student_status && quiz.student_status !== 'not_started') {
          // Handle 'summary' view type - original logic
          let topic = quiz.topic || 'General';
          
          let questionCount = quiz.question_count || 0;
          try {
            if (quiz.subject && typeof quiz.subject === 'string') {
              const subjectData = JSON.parse(quiz.subject);
              questionCount = subjectData.quizzes?.length || questionCount;
            }
          } catch (e) {
            console.warn('Failed to parse subject JSON:', e);
          }
          
          const quizName = `${quiz.quiz_name || `Quiz ${quiz.quiz_id}`} (${questionCount} Qs)`;
          
          studentAttempts.push({
            quiz_id: quiz.quiz_id,
            quiz_name: quizName,
            topic: topic,
            classroom_id: quiz.classroom_id || 'unknown',
            classroom_name: quiz.classroom_name || `Class ${quiz.classroom_id}`,
            status: quiz.student_status || 'missed',
            score: typeof quiz.score === 'number' ? quiz.score : null,
            attempt_number: quiz.attempt_number || null,
            attempt_id: quiz.attempt_id || null,
            started_at: quiz.started_at || null,
            completed_at: quiz.completed_at || null,
            end_time: quiz.end_time || quiz.due_date,
            questions: quiz.questions || null,
            log_data: quiz.log_data || null,
            time_spent_seconds: quiz.time_spent_seconds || null,
          });
        }
      });
      // Sort by quiz end time (end_time) descending (newest quiz first) by default
      studentAttempts.sort((a, b) => {
        const dateA = a.completed_at || a.end_time || '';
        const dateB = b.completed_at || b.end_time || '';
        return dateB.localeCompare(dateA); // DESC - newest quiz first
      });
      
      setQuizAttempts(studentAttempts);

      // Calculate summary metrics
      const completed = studentAttempts.filter(a => a.status?.toLowerCase() === 'completed');
      const missed = studentAttempts.filter(a => {
        const s = a.status?.toLowerCase() || '';
        return s === 'missed' || s === 'absent';
      }).length;
      const inProgress = studentAttempts.filter(a => {
        const s = a.status?.toLowerCase() || '';
        return s === 'pending' || s === 'in_progress';
      }).length;

      const scores = completed.map(a => a.score).filter(s => s !== null) as number[];
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const highScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowScore = scores.length > 0 ? Math.min(...scores) : 0;

      setSummary({
        totalQuizzes: studentAttempts.length,
        attemptedCount: completed.length + inProgress,
        completedCount: completed.length,
        missedCount: missed,
        averageScore: avgScore,
        highestScore: highScore,
        lowestScore: lowScore,
      });

      // Calculate topic-wise performance
      const topicMap = new Map<string, { scores: number[]; total: number; completed: number }>();

      studentAttempts.forEach(attempt => {
        const topic = attempt.topic || 'General';
        if (!topicMap.has(topic)) {
          topicMap.set(topic, { scores: [], total: 0, completed: 0 });
        }
        const topicData = topicMap.get(topic)!;
        topicData.total++;
        const status = attempt.status?.toLowerCase() || '';
        if (status === 'completed' && attempt.score !== null) {
          topicData.scores.push(attempt.score);
          topicData.completed++;
        }
      });

      const topicPerformance: TopicPerformance[] = Array.from(topicMap.entries())
        .filter(([_, data]) => data.scores.length > 0)
        .map(([topic, data]) => ({
          topic,
          averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
          quizCount: data.total,
          completedCount: data.completed,
        }));

      // Sort and get top 3 and bottom 3
      const sorted = [...topicPerformance].sort((a, b) => b.averageScore - a.averageScore);
      setStrongTopics(sorted.slice(0, 3));
      setWeakTopics(sorted.slice(-3).reverse());

      // console.log('📊 Analytics Summary:', {
      //   totalQuizzes: studentAttempts.length,
      //   attempted: completed.length + inProgress,
      //   completed: completed.length,
      //   missed: missed,
      //   inProgress: inProgress,
      //   averageScore: avgScore.toFixed(1),
      //   topics: topicPerformance.length,
      //   topicList: topicPerformance.map(t => t.topic),
      // });
      
      // console.log('📝 Sample Attempts:', studentAttempts.slice(0, 3).map(a => ({
      //   quiz_id: a.quiz_id,
      //   name: a.quiz_name,
      //   topic: a.topic,
      //   status: a.status,
      //   score: a.score,
      //   classroom: a.classroom_name,
      // })));

    } catch (error) {
      console.error('❌ StudentAnalytics: Error loading analytics:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId, selectedClassroom, dateFilter, dateRangeStart.getTime(), dateRangeEnd.getTime(), classroomId]);

  // Load analytics when dependencies change
  useEffect(() => {
    if (studentId) {
      loadAnalytics();
    } else {
      console.warn('⚠️ StudentAnalytics: No studentId, skipping loadAnalytics');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, selectedClassroom, dateFilter, dateRangeStart.getTime(), dateRangeEnd.getTime()]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setDisplayCount(10);
    loadAnalytics();
  }, [loadAnalytics]);

  const handleDateFilterChange = useCallback((filter: DateFilterType, startDate: Date, endDate: Date) => {
    setDateFilter(filter);
    setDateRangeStart(startDate);
    setDateRangeEnd(endDate);
    setDisplayCount(10);
  }, []);

  const loadMoreQuizzes = useCallback(() => {
    setDisplayCount(prev => prev + 10);
  }, []);

  // Filter change handlers that reset display count
  const handleStatusFilterChange = useCallback((filter: 'All' | 'Completed' | 'Absent' | 'In Progress') => {
    setStatusFilter(filter);
    setDisplayCount(10);
  }, []);

  const handleSortChange = useCallback((sort: 'score' | 'date') => {
    setSortBy(sort);
    setDisplayCount(10);
  }, []);

  const handleQuizFilterChange = useCallback((quizId: number | null) => {
    setSelectedQuiz(quizId);
    setDisplayCount(10);
  }, []);

  const getSuggestions = (): string[] => {
    const suggestions: string[] = [];

    if (summary.missedCount > 0) {
      suggestions.push(`📌 Follow up on ${summary.missedCount} missed quiz${summary.missedCount > 1 ? 'zes' : ''} - send reminders to complete assignments.`);
    }

    if (summary.averageScore < 50 && summary.completedCount > 0) {
      suggestions.push('📚 Consider remedial sessions - average score below 50% indicates need for concept revision.');
    }

    const inProgressCount = quizAttempts.filter(a => {
      const s = a.status?.toLowerCase() || '';
      return s === 'pending' || s === 'in_progress';
    }).length;
    if (inProgressCount > 3) {
      suggestions.push('⏰ High number of pending quizzes - student may need time management coaching.');
    }

    if (strongTopics.length > 0 && strongTopics[0].averageScore > 80) {
      suggestions.push(`🌟 Strong performance in ${strongTopics[0].topic} - consider advanced practice or enrichment activities.`);
    }

    if (weakTopics.length > 0 && weakTopics[0].averageScore < 60) {
      suggestions.push(`⚠️ Focus on ${weakTopics[0].topic} - lowest average score indicates need for targeted support.`);
    }

    if (summary.completedCount === 0 && summary.totalQuizzes > 0) {
      suggestions.push('❗ No completed quizzes - immediate intervention required to engage student.');
    }

    if (suggestions.length === 0) {
      suggestions.push('✅ Student is performing well overall - continue monitoring progress.');
    }

    return suggestions;
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingIconWrap, { backgroundColor: theme.colors.tintTeal }]}>
            <LoadingSpinner size={36} />
          </View>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading analytics…
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Student identity header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.20)' }]}>
          <Ionicons name="person" size={32} color={theme.colors.textInverse} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.studentNameText, { color: theme.colors.textInverse }]}>
            {studentName || 'Student'}
          </Text>
          <Text style={[styles.studentIdText, { color: 'rgba(255,255,255,0.75)' }]}>
            ID: {studentId}
          </Text>
          {classroomName && (
            <View style={[styles.classroomBadge, { backgroundColor: 'rgba(255,255,255,0.20)' }]}>
              <Ionicons name="school-outline" size={13} color={theme.colors.textInverse} />
              <Text style={[styles.classroomText, { color: theme.colors.textInverse }]}>
                {classroomName}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Date Range Filter */}
      <FilterSection>
        <View style={styles.filtersRow}>
          <ClassroomFilter
            classrooms={classrooms}
            selectedClassroom={selectedClassroom}
            onSelect={setSelectedClassroom}
            style={styles.filterHalf}
          />
          <DateRangeFilter
            selectedDateFilter={dateFilter}
            onDateFilterChange={handleDateFilterChange}
            style={styles.filterHalf}
          />
        </View>
      </FilterSection>

      {/* Performance Summary */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="stats-chart-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Performance Summary</Text>
        </View>

        <View style={styles.summaryGrid}>
          {[
            { label: `Total${selectedQuiz ? ' in Quiz' : ' Assigned'}`, value: filterCounts.total, filterKey: 'All' as const, color: theme.colors.textPrimary },
            { label: 'Completed', value: filterCounts.completed, filterKey: 'Completed' as const, color: theme.colors.success },
            { label: 'In Progress', value: filterCounts.inProgress, filterKey: 'In Progress' as const, color: theme.colors.warning },
            { label: 'Missed', value: filterCounts.missed, filterKey: 'Absent' as const, color: theme.colors.danger },
          ].map(({ label, value, filterKey, color }) => (
            <TouchableOpacity
              key={filterKey}
              style={[
                styles.summaryItem,
                { borderColor: theme.colors.border },
                statusFilter === filterKey && { borderColor: theme.colors.primary, backgroundColor: theme.colors.tintTeal },
              ]}
              onPress={() => handleStatusFilterChange(filterKey)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: statusFilter === filterKey }}
            >
              <Text style={[styles.summaryValue, { color }]}>{value}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.scoreRow, { borderTopColor: theme.colors.border }]}>
          {[
            { label: 'Average', value: `${filterCounts.averageScore.toFixed(1)}%`, color: theme.colors.primary },
            { label: 'Highest', value: `${filterCounts.highestScore.toFixed(0)}%`, color: theme.colors.success },
            { label: 'Lowest', value: `${filterCounts.lowestScore.toFixed(0)}%`, color: theme.colors.danger },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.scoreItem}>
              <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
              <Text style={[styles.scoreValue, { color }]}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Strong Topics */}
      {strongTopics.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy-outline" size={20} color={theme.colors.success} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Strong Topics</Text>
          </View>
          {strongTopics.map((topic, index) => (
            <View
              key={index}
              style={[styles.topicCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}
            >
              <View style={styles.topicInfo}>
                <Text style={[styles.topicName, { color: theme.colors.textPrimary }]}>{topic.topic}</Text>
                <Text style={[styles.topicStats, { color: theme.colors.textSecondary }]}>
                  {topic.completedCount}/{topic.quizCount} quizzes
                </Text>
              </View>
              <View style={[styles.topicScoreBadge, { backgroundColor: theme.colors.tintGreen }]}>
                <Text style={[styles.topicScore, { color: theme.colors.success }]}>
                  {topic.averageScore.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Topics to Improve</Text>
          </View>
          {weakTopics.map((topic, index) => (
            <View
              key={index}
              style={[styles.topicCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}
            >
              <View style={styles.topicInfo}>
                <Text style={[styles.topicName, { color: theme.colors.textPrimary }]}>{topic.topic}</Text>
                <Text style={[styles.topicStats, { color: theme.colors.textSecondary }]}>
                  {topic.completedCount}/{topic.quizCount} quizzes
                </Text>
              </View>
              <View style={[styles.topicScoreBadge, { backgroundColor: theme.colors.tintOrange }]}>
                <Text style={[styles.topicScore, { color: theme.colors.warning }]}>
                  {topic.averageScore.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Teacher Suggestions */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>AI Suggestions</Text>
        </View>
        {getSuggestions().map((suggestion, index) => (
          <View
            key={index}
            style={[styles.suggestionItem, { borderLeftColor: theme.colors.primary }]}
          >
            <Text style={[styles.suggestionText, { color: theme.colors.textPrimary }]}>{suggestion}</Text>
          </View>
        ))}
      </View>

      {/* Quiz List */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="list-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Submitted Quizzes</Text>
        </View>

        {/* Sort Options */}
        <View style={[styles.sortRow, { borderColor: theme.colors.border }]}>
          <Text style={[styles.sortLabel, { color: theme.colors.textSecondary }]}>Sort by:</Text>
          {(['date', 'score'] as const).map((sort) => (
            <TouchableOpacity
              key={sort}
              style={[
                styles.sortButton,
                { borderColor: sortBy === sort ? theme.colors.primary : theme.colors.border },
                sortBy === sort && { backgroundColor: theme.colors.tintTeal },
              ]}
              onPress={() => handleSortChange(sort)}
              accessibilityRole="button"
              accessibilityState={{ selected: sortBy === sort }}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  { color: sortBy === sort ? theme.colors.primary : theme.colors.textSecondary },
                ]}
              >
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filter by available quiz (kept as state, no UI change needed) */}
        {availableQuizzes.length > 1 && selectedQuiz !== null && (
          <View style={styles.quizFilterSection}>
            <TouchableOpacity
              style={[styles.clearFilterBtn, { backgroundColor: theme.colors.tintRed }]}
              onPress={() => handleQuizFilterChange(null)}
            >
              <Ionicons name="close-circle" size={14} color={theme.colors.danger} />
              <Text style={[styles.clearFilterText, { color: theme.colors.danger }]}>Clear quiz filter</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quiz items */}
        {filteredAttempts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.tintTeal }]}>
              <Ionicons name="document-text-outline" size={32} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emptyText, { color: theme.colors.textPrimary }]}>No quizzes found</Text>
            <Text style={[styles.emptySubText, { color: theme.colors.textSecondary }]}>Try adjusting the selected filter.</Text>
          </View>
        ) : (
          <>
            {filteredAttempts.slice(0, displayCount).map((attempt, index) => {
              const scorePercentage = attempt.score ?? 0;
              const scoreColor = scorePercentage >= 75
                ? theme.colors.success
                : scorePercentage >= 40
                  ? theme.colors.warning
                  : scorePercentage > 0
                    ? theme.colors.danger
                    : theme.colors.textSecondary;
              const barColor = scorePercentage >= 75
                ? theme.colors.success
                : scorePercentage >= 40
                  ? theme.colors.warning
                  : theme.colors.danger;

              let timeText = 'Not started';
              if (attempt.completed_at && attempt.started_at) {
                const start = new Date(attempt.started_at);
                const end = new Date(attempt.completed_at);
                const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
                timeText = `${minutes} min`;
              }

              const handleQuizPress = () => {
                if (!attempt.attempt_id && !attempt.completed_at) return;
                if (!attempt.attempt_id && attempt.completed_at) {
                  console.warn('⚠️ Missing attempt_id for completed quiz.');
                }
                const params = {
                  quizId: attempt.quiz_id,
                  sessionId: (attempt as { session_id?: string }).session_id,
                  attemptId: attempt.attempt_id,
                  studentId: studentId,
                  studentName: studentName,
                  quizName: attempt.quiz_name,
                  attemptData: attempt,
                  questions: attempt.questions,
                  submission: attempt.log_data,
                  score: attempt.score,
                  timeSpent: attempt.time_spent_seconds,
                  completedAt: attempt.completed_at,
                  isTeacherView: true,
                };
                if (navigation) {
                  navigation.navigate('QuizResultsScreen', params);
                } else if (onNavigate) {
                  onNavigate('QuizResultsScreen', params);
                }
              };

              const isTappable = !!(attempt.attempt_id || attempt.completed_at);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.quizListItem,
                    { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
                  ]}
                  onPress={handleQuizPress}
                  activeOpacity={isTappable ? 0.7 : 1}
                  disabled={!isTappable}
                  accessibilityRole={isTappable ? 'button' : 'none'}
                  accessibilityLabel={`${attempt.topic}, ${scorePercentage.toFixed(0)}%`}
                >
                  <View style={styles.quizListContent}>
                    <View style={styles.quizListLeft}>
                      <Text style={[styles.quizListTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {attempt.topic}
                      </Text>
                      <Text style={[styles.quizListSubtitle, { color: theme.colors.textSecondary }]}>
                        {attempt.quiz_name.match(/\((\d+)\s*Qs?\)/)?.[0] ?? '—'} · {timeText}
                      </Text>
                      {attempt.completed_at && (
                        <Text style={[styles.quizCompletedDate, { color: theme.colors.textSecondary }]}>
                          {new Date(attempt.completed_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </Text>
                      )}
                    </View>
                    <View style={styles.quizListRight}>
                      <Text style={[styles.quizListScore, { color: scoreColor }]}>
                        {scorePercentage.toFixed(0)}%
                      </Text>
                      {attempt.status?.toLowerCase() === 'missed' && (
                        <View style={[styles.missedBadge, { backgroundColor: theme.colors.tintRed }]}>
                          <Text style={[styles.missedBadgeText, { color: theme.colors.danger }]}>Missed</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { backgroundColor: barColor, width: `${Math.min(scorePercentage, 100)}%` as `${number}%` },
                      ]}
                    />
                  </View>
                  {isTappable && (
                    <View style={styles.clickIndicator}>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {displayCount < filteredAttempts.length && (
              <TouchableOpacity
                style={[styles.loadMoreButton, { backgroundColor: theme.colors.primary }]}
                onPress={loadMoreQuizzes}
                accessibilityRole="button"
                accessibilityLabel={`Load ${filteredAttempts.length - displayCount} more quizzes`}
              >
                <Text style={[styles.loadMoreText, { color: theme.colors.textInverse }]}>
                  Load More ({filteredAttempts.length - displayCount} remaining)
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textInverse} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  loadingIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, fontWeight: '500' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1 },
  studentNameText: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  studentIdText: { fontSize: 13 },
  classroomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  classroomText: { fontSize: 12, fontWeight: '600' },

  filtersRow: { flexDirection: 'row', gap: 8 },
  filterHalf: { flex: 1 },

  section: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  summaryItem: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  summaryValue: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { fontSize: 12, textAlign: 'center' },

  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  scoreItem: { alignItems: 'center' },
  scoreLabel: { fontSize: 12, marginBottom: 3 },
  scoreValue: { fontSize: 18, fontWeight: '700' },

  topicCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  topicInfo: { flex: 1 },
  topicName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  topicStats: { fontSize: 12 },
  topicScoreBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  topicScore: { fontSize: 14, fontWeight: '700' },

  suggestionItem: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 10,
  },
  suggestionText: { fontSize: 13, lineHeight: 20 },

  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortLabel: { fontSize: 13 },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  sortButtonText: { fontSize: 13, fontWeight: '600' },

  quizFilterSection: { marginBottom: 8 },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  clearFilterText: { fontSize: 12, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, fontWeight: '700' },
  emptySubText: { fontSize: 13, textAlign: 'center' },

  quizListItem: {
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  quizListContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quizListLeft: { flex: 1, marginRight: 10 },
  quizListTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  quizListSubtitle: { fontSize: 12, lineHeight: 16 },
  quizCompletedDate: { fontSize: 11, marginTop: 2 },
  quizListRight: { alignItems: 'flex-end', gap: 4 },
  quizListScore: { fontSize: 20, fontWeight: '800' },
  missedBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  missedBadgeText: { fontSize: 10, fontWeight: '700' },

  progressBarContainer: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressBarFill: { height: '100%', borderRadius: 3 },

  clickIndicator: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -8 }],
  },

  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
    gap: 6,
  },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
});
