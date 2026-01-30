import React, { useState, useEffect } from 'react';
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
import { useTheme } from '@context/ThemeContext';
import { fetchTeacherDashboardSummary, fetchTeacherQuizzes } from '@core/services/dashboardApi';
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
  const { theme } = useTheme();
  const colors = theme.colors;
  
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
  
  // Initialize with current month's date range
  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  };
  
  const initialDateRange = getCurrentMonthRange();
  const [dateRangeStart, setDateRangeStart] = useState<Date>(initialDateRange.start);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date>(initialDateRange.end);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [classrooms, setClassrooms] = useState<Array<{ classroom_id: string; classroom_name: string }>>([]);
  const [displayCount, setDisplayCount] = useState(10);

  // Set initial classroom filter from navigation params
  useEffect(() => {
    if (classroomId) {
      setSelectedClassroom(classroomId);
    }
  }, [classroomId]);

  useEffect(() => {
    if (studentId) {
      loadAnalytics();
    }
  }, [studentId, dateFilter, selectedClassroom]);

  useEffect(() => {
    applyFilters();
  }, [quizAttempts, statusFilter, sortBy]);

  const applyFilters = () => {
    let filtered = [...quizAttempts];
    
    // Reset display count when filters change
    setDisplayCount(10);

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
  };

  const loadAnalytics = async () => {
    if (!studentId) return;
    
    try {
      setLoading(true);
      
      console.log('🔍 StudentAnalytics loadAnalytics - Current filters:', {
        studentId,
        selectedClassroom,
        dateFilter,
        dateRangeStart,
        dateRangeEnd,
        classroomIdFromRoute: classroomId,
      });
      
      // Use the same API call as StudentList when classroom is selected
      let response;
      if (selectedClassroom && selectedClassroom !== 'all') {
        console.log('📚 Fetching with classroom filter:', selectedClassroom);
        // Fetch quizzes with 'all' view type for specific classroom
        response = await fetchTeacherQuizzes({
          view_type: 'all',
          classroom_id: selectedClassroom,
          limit: 1000,
        });
      } else {
        console.log('📊 Fetching with summary view (all classrooms)');
        // Fetch all quizzes with summary view
        response = await fetchTeacherDashboardSummary({
          view_type: 'summary',
          limit: 1000,
          offset: 0,
        });
      }

      console.log('📊 Student Analytics - API Response:', response);
      console.log('📊 Student Analytics - Loaded quizzes:', response.data.length);
      
      // Log first item for debugging
      if (response.data.length > 0) {
        console.log('📋 Sample Quiz Data:', JSON.stringify(response.data[0], null, 2));
      }

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

      console.log('📚 Available Classrooms:', classroomsList.length, classroomsList);

      // Data is already filtered by classroom if we used fetchTeacherQuizzes
      let filteredData = response.data;

      // Apply date filter only when NOT viewing a specific classroom
      // When viewing classroom analytics, we want to see ALL quizzes for consistency with StudentList
      const isClassroomView = selectedClassroom && selectedClassroom !== 'all';
      
      console.log('🎯 Filtering logic:', {
        isClassroomView,
        dateFilter,
        totalQuizzes: response.data.length,
        willApplyDateFilter: !isClassroomView && dateFilter !== 'all',
      });
      
      if (!isClassroomView && dateFilter !== 'all') {
        console.log('📅 Applying date filter - Date range:', { start: dateRangeStart, end: dateRangeEnd });
        const beforeFilter = filteredData.length;
        filteredData = filteredData.filter((item: any) => {
          const quizDate = new Date(item.created_at || item.end_time);
          const inRange = quizDate >= dateRangeStart && quizDate <= dateRangeEnd;
          if (!inRange) {
            console.log('  ❌ Filtered out quiz:', item.quiz_name, 'Date:', quizDate);
          }
          return inRange;
        });
        console.log(`📅 After date filter (${dateFilter}): ${beforeFilter} -> ${filteredData.length} quizzes`);
      } else {
        console.log('⏭️  Skipping date filter (classroom view or filter set to "all")');
      }

      console.log('📊 Total quizzes after filtering:', filteredData.length);

      // Process quiz data - handle both 'summary' and 'all' view types
      const studentAttempts: QuizAttempt[] = [];
      
      console.log('🔄 Processing quizzes - Total to process:', filteredData.length);
      
      filteredData.forEach((quiz: any) => {
        // Check if this quiz has attempts (view_type: 'all') or student_status (view_type: 'summary')
        if (quiz.attempts) {
          console.log('📋 Processing quiz with attempts:', quiz.quiz_id, quiz.quiz_name);
          // Handle 'all' view type - same as StudentList
          const attempts = typeof quiz.attempts === 'string'
            ? JSON.parse(quiz.attempts)
            : quiz.attempts;
          
          console.log('  👥 Total attempts in quiz:', Array.isArray(attempts) ? attempts.length : 0);
          
          if (Array.isArray(attempts)) {
            // Find this student's attempt in the quiz
            const studentAttempt = attempts.find((attempt: any) => 
              String(attempt.student_id) === String(studentId)
            );
            
            // ONLY process quizzes where the student has an attempt record
            // This ensures we only count quizzes the student is actually assigned to
            if (studentAttempt) {
              console.log('  ✅ Student found in attempts - Adding to list');
              console.log('🎯 Found student attempt:', {
                quiz_id: quiz.quiz_id,
                quiz_name: quiz.quiz_name,
                attempt_id: studentAttempt.attempt_id,
                student_id: studentAttempt.student_id,
                score: studentAttempt.score,
                fullAttempt: studentAttempt,
              });
              
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
            } else {
              console.log('  ⏭️  Student NOT found in attempts - Skipping quiz');
            }
            // Note: We no longer create 'missed' entries for quizzes without student attempts
            // This ensures we only count quizzes the student is actually assigned to
          }
        } else if (quiz.student_status && quiz.student_status !== 'not_started') {
          console.log('📋 Processing quiz with student_status:', quiz.quiz_id, quiz.quiz_name, 'Status:', quiz.student_status);
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

      // Sort by created_at/end_time descending (newest first) by default
      studentAttempts.sort((a, b) => {
        const dateA = a.completed_at || a.started_at || a.end_time || '';
        const dateB = b.completed_at || b.started_at || b.end_time || '';
        return dateB.localeCompare(dateA); // DESC - newest first
      });
      
      setQuizAttempts(studentAttempts);
      
      console.log('✅ Total student attempts after mapping:', studentAttempts.length);
      console.log('📊 Status breakdown:', {
        completed: studentAttempts.filter(a => a.status === 'completed').length,
        missed: studentAttempts.filter(a => a.status === 'missed').length,
        pending: studentAttempts.filter(a => a.status === 'pending').length,
      });

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

      console.log('📊 Analytics Summary:', {
        totalQuizzes: studentAttempts.length,
        attempted: completed.length + inProgress,
        completed: completed.length,
        missed: missed,
        inProgress: inProgress,
        averageScore: avgScore.toFixed(1),
        topics: topicPerformance.length,
        topicList: topicPerformance.map(t => t.topic),
      });
      
      console.log('📝 Sample Attempts:', studentAttempts.slice(0, 3).map(a => ({
        quiz_id: a.quiz_id,
        name: a.quiz_name,
        topic: a.topic,
        status: a.status,
        score: a.score,
        classroom: a.classroom_name,
      })));

    } catch (error) {
      console.error('Error loading student analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const handleDateFilterChange = (filter: DateFilterType, startDate: Date, endDate: Date) => {
    setDateFilter(filter);
    setDateRangeStart(startDate);
    setDateRangeEnd(endDate);
  };

  const loadMoreQuizzes = () => {
    setDisplayCount(prev => prev + 10);
  };

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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={60} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading analytics...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerContent}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.studentName, { color: colors.text }]}>
              {studentName || 'Student'}
            </Text>
            <Text style={[styles.studentId, { color: colors.textSecondary }]}>
              ID: {studentId}
            </Text>
            {classroomName && (
              <View style={styles.classroomBadge}>
                <Ionicons name="school" size={14} color={colors.primary} />
                <Text style={[styles.classroomText, { color: colors.primary }]}>
                  {classroomName}
                </Text>
              </View>
            )}
          </View>
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

      {/* Student Summary Card */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="stats-chart" size={24} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Summary</Text>
        </View>

        <View style={styles.summaryGrid}>
          <TouchableOpacity 
            style={[styles.summaryItem, statusFilter === 'All' && styles.summaryItemActive]}
            onPress={() => setStatusFilter('All')}
            activeOpacity={0.7}
          >
            <Text style={[styles.summaryValue, { color: colors.text }]}>{summary.totalQuizzes}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Assigned</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.summaryItem, statusFilter === 'Completed' && styles.summaryItemActive]}
            onPress={() => setStatusFilter('Completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{summary.completedCount}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Completed</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.summaryItem, statusFilter === 'In Progress' && styles.summaryItemActive]}
            onPress={() => setStatusFilter('In Progress')}
            activeOpacity={0.7}
          >
            <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{summary.attemptedCount - summary.completedCount}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.summaryItem, statusFilter === 'Absent' && styles.summaryItemActive]}
            onPress={() => setStatusFilter('Absent')}
            activeOpacity={0.7}
          >
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{summary.missedCount}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Missed/Absent</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.scoreRow, { borderTopColor: colors.border }]}>
          <View style={styles.scoreItem}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Average</Text>
            <Text style={[styles.scoreValue, { color: colors.text }]}>{summary.averageScore.toFixed(1)}%</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Highest</Text>
            <Text style={[styles.scoreValue, { color: '#10B981' }]}>{summary.highestScore.toFixed(0)}%</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Lowest</Text>
            <Text style={[styles.scoreValue, { color: '#EF4444' }]}>{summary.lowestScore.toFixed(0)}%</Text>
          </View>
        </View>
      </View>

      {/* Strong Topics */}
      {strongTopics.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={24} color="#10B981" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Where Student is Good</Text>
          </View>
          {strongTopics.map((topic, index) => (
            <View key={index} style={[styles.topicCard, { borderColor: colors.border }]}>
              <View style={styles.topicInfo}>
                <Text style={[styles.topicName, { color: colors.text }]}>{topic.topic}</Text>
                <Text style={[styles.topicStats, { color: colors.textSecondary }]}>
                  {topic.completedCount}/{topic.quizCount} quizzes
                </Text>
              </View>
              <View style={[styles.topicScoreBadge, { backgroundColor: '#10B981' + '15' }]}>
                <Text style={[styles.topicScore, { color: '#10B981' }]}>
                  {topic.averageScore.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={24} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Where to Improve</Text>
          </View>
          {weakTopics.map((topic, index) => (
            <View key={index} style={[styles.topicCard, { borderColor: colors.border }]}>
              <View style={styles.topicInfo}>
                <Text style={[styles.topicName, { color: colors.text }]}>{topic.topic}</Text>
                <Text style={[styles.topicStats, { color: colors.textSecondary }]}>
                  {topic.completedCount}/{topic.quizCount} quizzes
                </Text>
              </View>
              <View style={[styles.topicScoreBadge, { backgroundColor: '#F59E0B' + '15' }]}>
                <Text style={[styles.topicScore, { color: '#F59E0B' }]}>
                  {topic.averageScore.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Teacher Suggestions */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb" size={24} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Teacher Suggestions</Text>
        </View>
        {getSuggestions().map((suggestion, index) => (
          <View key={index} style={styles.suggestionItem}>
            <Text style={[styles.suggestionText, { color: colors.text }]}>{suggestion}</Text>
          </View>
        ))}
      </View>

      {/* Quiz Filters */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="list" size={24} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Submitted Quizzes</Text>
        </View>

        {/* Sort Options */}
        <View style={styles.sortRow}>
          <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sort by:</Text>
          <TouchableOpacity
            style={[
              styles.sortButton,
              { borderColor: colors.border },
              sortBy === 'date' && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
            ]}
            onPress={() => setSortBy('date')}
          >
            <Text style={[styles.sortButtonText, { color: sortBy === 'date' ? colors.primary : colors.text }]}>
              Date
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              { borderColor: colors.border },
              sortBy === 'score' && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
            ]}
            onPress={() => setSortBy('score')}
          >
            <Text style={[styles.sortButtonText, { color: sortBy === 'score' ? colors.primary : colors.text }]}>
              Score
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quiz List */}
        {filteredAttempts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No quizzes found for selected filter
            </Text>
          </View>
        ) : (
          <>
          {filteredAttempts.slice(0, displayCount).map((attempt, index) => {
            const scorePercentage = attempt.score ?? 0;
            const scoreColor = scorePercentage >= 60 ? '#F59E0B' : scorePercentage > 0 ? '#EF4444' : '#9CA3AF';
            const progressBarColor = scorePercentage >= 60 ? '#F59E0B' : '#EF4444';
            
            // Calculate time spent in minutes
            let timeText = 'Not started';
            if (attempt.completed_at && attempt.started_at) {
              const start = new Date(attempt.started_at);
              const end = new Date(attempt.completed_at);
              const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
              timeText = `Avg ${minutes} min`;
            }
            
            const handleQuizPress = () => {
              // Only navigate if quiz has been attempted (has attempt_id or completed_at)
              if (!attempt.attempt_id && !attempt.completed_at) {
                console.log('⚠️ Quiz not attempted yet');
                return;
              }

              console.log('📊 Opening quiz result for:', {
                quizId: attempt.quiz_id,
                attemptId: attempt.attempt_id,
                studentId,
                studentName,
                attempt: attempt,
              });

              // If no attempt_id, we need to fetch it from the API
              // For now, show a warning if attempt_id is missing for completed quizzes
              if (!attempt.attempt_id && attempt.completed_at) {
                console.warn('⚠️ Missing attempt_id for completed quiz. This may cause issues loading the results.');
              }

              const params = {
                quizId: attempt.quiz_id,
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
            
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.quizListItem, { backgroundColor: colors.background }]}
                onPress={handleQuizPress}
                activeOpacity={0.7}
                disabled={!attempt.attempt_id && !attempt.completed_at}
              >
                <View style={styles.quizListContent}>
                  <View style={styles.quizListLeft}>
                    <Text style={[styles.quizListTitle, { color: colors.text }]} numberOfLines={1}>
                      {attempt.topic}
                    </Text>
                    <Text style={[styles.quizListSubtitle, { color: colors.textSecondary }]}>
                      {attempt.quiz_name.match(/\((\d+)\s*Qs?\)/)?.[0] || '1 quiz'} • {timeText}
                    </Text>
                  </View>
                  
                  <View style={styles.quizListRight}>
                    <Text style={[styles.quizListScore, { color: scoreColor }]}>
                      {scorePercentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
                
                {/* Progress Bar */}
                <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        backgroundColor: progressBarColor,
                        width: `${Math.min(scorePercentage, 100)}%`
                      }
                    ]} 
                  />
                </View>
                
                {/* Status indicator */}
                {attempt.status?.toLowerCase() === 'missed' && (
                  <View style={styles.quizStatusBadge}>
                    <Ionicons name="close-circle" size={12} color="#EF4444" />
                    <Text style={[styles.quizStatusText, { color: '#EF4444' }]}>Missed</Text>
                  </View>
                )}
                
                {/* Click indicator for completed quizzes */}
                {(attempt.attempt_id || attempt.completed_at) && (
                  <View style={styles.clickIndicator}>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          
          {/* Load More Button */}
          {displayCount < filteredAttempts.length && (
            <TouchableOpacity
              style={[styles.loadMoreButton, { backgroundColor: colors.primary }]}
              onPress={loadMoreQuizzes}
            >
              <Text style={styles.loadMoreText}>Load More ({filteredAttempts.length - displayCount} remaining)</Text>
              <Ionicons name="chevron-down" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          </>
        )}
      </View>
    </ScrollView>
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
    fontSize: 14,
  },
  header: {
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  studentName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  studentId: {
    fontSize: 14,
  },
  classroomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(91, 33, 182, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  classroomText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterHalf: {
    flex: 1,
  },
  section: {
    marginHorizontal: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 6,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  summaryItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  summaryItemActive: {
    backgroundColor: 'rgba(91, 33, 182, 0.08)',
    transform: [{ scale: 1.02 }],
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  topicCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  topicInfo: {
    flex: 1,
  },
  topicName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  topicStats: {
    fontSize: 12,
  },
  topicScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topicScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  suggestionItem: {
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  filterChips: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sortLabel: {
    fontSize: 14,
    marginRight: 6,
  },
  sortButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  quizListItem: {
    marginBottom: 8,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  quizListContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quizListLeft: {
    flex: 1,
    marginRight: 10,
  },
  quizListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  quizListSubtitle: {
    fontSize: 13,
  },
  quizListRight: {
    alignItems: 'flex-end',
  },
  quizListScore: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  quizStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  quizStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
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
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
