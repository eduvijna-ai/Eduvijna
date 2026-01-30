/**
 * StudentList Screen - Displays Students for Specific Quiz
 * 
 * Fetches quiz data with attempts from API
 * Shows students who attempted the quiz with their scores
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '@context/ThemeContext';
import { fetchTeacherQuizzes } from '@core/services/dashboardApi';

interface Props {
  navigation?: any;
  route?: any;
  onNavigate?: (screen: string, params?: any) => void;
}

interface QuizAttempt {
  student_id: string;
  student_fullname: string;
  student_username?: string;
  score: number | null;
  status: string | null;
  attempt_id: number | null;
  avatar_url?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  time_spent_seconds?: number | null;
  average_score?: number | null;
  total_quizzes?: number;
  completed_quizzes?: number;
}

export default function StudentList({ navigation, route, onNavigate }: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<QuizAttempt[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<QuizAttempt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'completion'>('name');
  const [displayCount, setDisplayCount] = useState(10);

  const isWeb = width > 768;
  
  // Get params from route
  const quizId = route?.params?.quizId;
  const quizName = route?.params?.quizName;
  const classroomId = route?.params?.classroomId;
  const classroomName = route?.params?.classroomName;

  // Fetch quiz data with attempts on mount
  useEffect(() => {
    if (quizId) {
      fetchQuizStudents();
    } else if (classroomId) {
      fetchClassroomStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, classroomId]);

  // Apply filters when search or sort changes
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sortBy, students]);

  const fetchQuizStudents = async () => {
    try {
      setLoading(true);
      console.log('📚 Fetching quiz students for quizId:', quizId);
      
      // Fetch quiz data with attempts
      const response = await fetchTeacherQuizzes({
        view_type: 'all',
        quiz_id: quizId,
      });
      
      console.log('✅ Quiz data response:', response);
      
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        const quiz = response.data[0];
        console.log('📝 Quiz:', quiz);
        
        if (quiz.attempts) {
          const attempts = typeof quiz.attempts === 'string'
            ? JSON.parse(quiz.attempts)
            : quiz.attempts;
          
          console.log('👥 Attempts:', attempts);
          
          if (Array.isArray(attempts)) {
            // Filter to only show students who have attempted (score is not null)
            // Or show all students with pending status
            setStudents(attempts);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching quiz students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassroomStudents = async () => {
    try {
      setLoading(true);
      console.log('🏫 Fetching classroom students for classroomId:', classroomId);
      
      // Fetch all quizzes for this classroom with all attempts
      const response = await fetchTeacherQuizzes({
        view_type: 'all',
        classroom_id: classroomId,
        limit: 1000,
      });
      
      console.log('✅ Classroom quizzes response:', response);
      
      if (response?.data && Array.isArray(response.data)) {
        // Map to store student performance across all quizzes
        const studentPerformanceMap = new Map<string, {
          student_id: string;
          student_fullname: string;
          student_username?: string;
          avatar_url?: string | null;
          scores: number[];
          total_quizzes: number;
        }>();
        
        const totalQuizzes = response.data.length;
        
        // Process all quizzes and their attempts
        response.data.forEach((quiz: any) => {
          if (quiz.attempts) {
            const attempts = typeof quiz.attempts === 'string'
              ? JSON.parse(quiz.attempts)
              : quiz.attempts;
            
            if (Array.isArray(attempts)) {
              attempts.forEach((attempt: any) => {
                const studentId = attempt.student_id;
                
                if (!studentPerformanceMap.has(studentId)) {
                  studentPerformanceMap.set(studentId, {
                    student_id: studentId,
                    student_fullname: attempt.student_fullname,
                    student_username: attempt.student_username,
                    avatar_url: attempt.avatar_url,
                    scores: [],
                    total_quizzes: totalQuizzes,
                  });
                }
                
                const studentData = studentPerformanceMap.get(studentId)!;
                
                // Only count completed attempts (with valid score)
                if (attempt.score !== null && attempt.score !== undefined) {
                  studentData.scores.push(Number(attempt.score));
                }
              });
            }
          }
        });
        
        console.log('👥 Total unique students found:', studentPerformanceMap.size);
        
        // Convert map to array and calculate averages
        const studentsWithPerformance: QuizAttempt[] = Array.from(studentPerformanceMap.values()).map(student => {
          const completed_quizzes = student.scores.length;
          const average_score = completed_quizzes > 0
            ? student.scores.reduce((sum, score) => sum + score, 0) / completed_quizzes
            : null;
          
          return {
            student_id: student.student_id,
            student_fullname: student.student_fullname,
            student_username: student.student_username,
            avatar_url: student.avatar_url,
            score: average_score, // Use average as the main score for sorting
            status: completed_quizzes > 0 ? 'completed' : null,
            attempt_id: null, // Not applicable for classroom view
            average_score: average_score,
            total_quizzes: student.total_quizzes,
            completed_quizzes: completed_quizzes,
          };
        });
        
        setStudents(studentsWithPerformance);
      }
    } catch (error) {
      console.error('❌ Error fetching classroom students:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...students];
    
    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(student =>
        student.student_fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.student_fullname.localeCompare(b.student_fullname);
        case 'score':
          return (b.score || 0) - (a.score || 0);
        default:
          return 0;
      }
    });
    
    setFilteredStudents(filtered);
    setDisplayCount(10); // Reset to show first 10
  };

  const loadMoreStudents = () => {
    setDisplayCount(prev => prev + 10);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (quizId) {
      await fetchQuizStudents();
    } else if (classroomId) {
      await fetchClassroomStudents();
    }
    setRefreshing(false);
  };

  const handleStudentPress = (student: QuizAttempt) => {
    console.log('📊 Opening student details for:', student.student_id);
    
    // Check if this is classroom view - navigate to student analytics
    if (classroomId) {
      console.log('📈 Navigating to student analytics');
      if (navigation) {
        navigation.navigate('StudentAnalytics', {
          studentId: student.student_id,
          studentName: student.student_fullname,
          classroomId: classroomId,
          classroomName: classroomName,
        });
      } else if (onNavigate) {
        onNavigate('StudentAnalytics', {
          studentId: student.student_id,
          studentName: student.student_fullname,
          classroomId: classroomId,
          classroomName: classroomName,
        });
      }
      return;
    }
    
    // Quiz view - navigate to quiz results if student has completed
    if (!student.attempt_id) {
      console.log('⚠️ Student has not attempted the quiz yet');
      return;
    }
    
    // Navigate to quiz results screen to show student's answers
    if (navigation) {
      navigation.navigate('QuizResultsScreen', {
        quizId: quizId,
        attemptId: student.attempt_id,
        studentId: student.student_id,
        studentName: student.student_fullname,
        score: student.score,
        quizName: quizName,
        isTeacherView: true, // Flag to indicate teacher viewing student attempt
      });
    } else if (onNavigate) {
      onNavigate('QuizResultsScreen', {
        quizId: quizId,
        attemptId: student.attempt_id,
        studentId: student.student_id,
        studentName: student.student_fullname,
        score: student.score,
        quizName: quizName,
        isTeacherView: true,
      });
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderStudentCard = ({ item }: { item: QuizAttempt }) => {
    // Score is already a percentage or null for pending
    const score = item.score ?? 0;
    const isPending = item.score === null || item.status === null;
    const performanceColor = isPending ? theme.colors.textSecondary : getPerformanceColor(score);
    
    // Check if this is classroom view with performance data
    const isClassroomView = classroomId && item.total_quizzes !== undefined;
    
    return (
      <TouchableOpacity
        style={[
          styles.studentCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          isWeb && styles.studentCardWeb,
          isPending && !isClassroomView && { opacity: 0.6 },
        ]}
        onPress={() => handleStudentPress(item)}
        activeOpacity={0.7}
        disabled={!isClassroomView && isPending}
      >
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
            {getInitials(item.student_fullname)}
          </Text>
        </View>

        <View style={styles.studentInfo}>
          <Text style={[styles.studentName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.student_fullname}
          </Text>
          {item.student_username && (
            <Text style={[styles.studentEmail, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              @{item.student_username}
            </Text>
          )}
          <View style={styles.statsRow}>
            {isClassroomView ? (
              <>
                <View style={styles.statItem}>
                  <Ionicons 
                    name="trophy-outline" 
                    size={14} 
                    color={isPending ? theme.colors.warning : theme.colors.primary} 
                  />
                  <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                    {isPending ? 'No attempts' : `Avg: ${Math.round(score)}%`}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons 
                    name="document-text-outline" 
                    size={14} 
                    color={theme.colors.textSecondary} 
                  />
                  <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                    {item.completed_quizzes}/{item.total_quizzes} quizzes
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.statItem}>
                <Ionicons 
                  name={isPending ? "time-outline" : "trophy-outline"} 
                  size={14} 
                  color={isPending ? theme.colors.warning : theme.colors.primary} 
                />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {isPending ? 'Not attempted' : `Score: ${score}%`}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <View style={[styles.scoreBadge, { backgroundColor: performanceColor + '20' }]}>
            <Text style={[styles.scoreText, { color: performanceColor }]}>
              {isPending ? '—' : `${Math.round(score)}%`}
            </Text>
          </View>
          <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
            {isPending ? 'Pending' : (isClassroomView ? 'Average' : 'Score')}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      {(quizId && quizName) || (classroomId && classroomName) ? (
        <View style={[styles.quizHeader, { backgroundColor: theme.colors.primary + '20', borderBottomColor: theme.colors.border }]}>
          <Ionicons 
            name={quizId ? "document-text" : "school"} 
            size={20} 
            color={theme.colors.primary} 
          />
          <Text style={[styles.quizHeaderText, { color: theme.colors.text }]}>
            {quizId ? `Students for: ${quizName}` : `Students in: ${classroomName}`}
          </Text>
        </View>
      ) : null}

      {/* Filter Section */}
      <View style={[styles.filterSection, { backgroundColor: theme.colors.card }]}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search students..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort Buttons */}
        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={[
              styles.sortButton, 
              { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
              sortBy === 'name' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
            ]}
            onPress={() => setSortBy('name')}
          >
            <Ionicons 
              name="person-outline" 
              size={16} 
              color={sortBy === 'name' ? '#FFF' : theme.colors.text} 
            />
            <Text style={[
              styles.sortButtonText,
              { color: sortBy === 'name' ? '#FFF' : theme.colors.text }
            ]}>
              Name
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.sortButton,
              { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
              sortBy === 'score' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
            ]}
            onPress={() => setSortBy('score')}
          >
            <Ionicons 
              name="trophy-outline" 
              size={16} 
              color={sortBy === 'score' ? '#FFF' : theme.colors.text} 
            />
            <Text style={[
              styles.sortButtonText,
              { color: sortBy === 'score' ? '#FFF' : theme.colors.text }
            ]}>
              Score
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.sortButton,
              { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
              sortBy === 'completion' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
            ]}
            onPress={() => setSortBy('completion')}
          >
            <Ionicons 
              name="stats-chart-outline" 
              size={16} 
              color={sortBy === 'completion' ? '#FFF' : theme.colors.text} 
            />
            <Text style={[
              styles.sortButtonText,
              { color: sortBy === 'completion' ? '#FFF' : theme.colors.text }
            ]}>
              Rate
            </Text>
          </TouchableOpacity>
        </View>

        {/* Student Count */}
        <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
          Showing {Math.min(displayCount, filteredStudents.length)} of {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
        </Text>
      </View>

      {/* Student List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={60} />
        </View>
      ) : filteredStudents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name={searchQuery ? "search-outline" : "people-outline"} 
            size={64} 
            color={theme.colors.disabled} 
          />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {searchQuery ? 'No students found' : 'No students yet'}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filteredStudents.slice(0, displayCount)}
            renderItem={renderStudentCard}
            keyExtractor={(item) => String(item.student_id)}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        />
        
        {/* Load More Button */}
        {displayCount < filteredStudents.length && (
          <TouchableOpacity
            style={[styles.loadMoreButton, { backgroundColor: theme.colors.primary }]}
            onPress={loadMoreStudents}
            activeOpacity={0.8}
          >
            <Text style={styles.loadMoreText}>
              Load More ({filteredStudents.length - displayCount} remaining)
            </Text>
            <Ionicons name="chevron-down" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  quizHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  filterSection: {
    paddingHorizontal: 12,
    paddingTop: 10,

    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  countText: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 10,
  },
  listContainer: {
    padding: 10,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentCardWeb: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 12,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  scoreContainer: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  loadingMoreContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginTop: 6,
    fontSize: 14,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    margin: 10,
    gap: 6,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
