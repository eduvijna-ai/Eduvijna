import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@core/hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchTeacherQuizzes } from '@core/services/dashboardApi';
import { useDashboardStore } from '@core/store/dashboard.store';
import { Classroom } from '@core/types/quiz.types';
import { useAssessmentClassrooms } from '@core/hooks/useAssessmentClassrooms';
import { 
  isStudentQuizActive, 
  isStudentQuizUpcoming,
  filterCompletedQuizzes,
  filterMissedQuizzes 
} from '../utils/quizFilters';

interface ClassData extends Classroom {
  studentCount?: number;
  quizCount?: number;
  activeQuizzes?: number;
  expiredQuizzes?: number;
  upcomingQuizzes?: number;
  completedQuizzes?: number;
  avgScore?: number | null; // Allow null for "N/A" when no attempts exist
  completionPercentage?: number | null; // Allow null for "N/A" when no attempts exist
}

interface Props {
  navigation?: any;
  onNavigate?: (screen: string, params?: any) => void;
}

export default function ClassesList({ navigation, onNavigate }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  
  // Get dashboard data from store (already loaded by StudentDashboard)
  const { quizzes: storedQuizzes } = useDashboardStore();
  const {
    classrooms: assessmentClassrooms,
    unavailable: classroomsUnavailable,
    error: classroomsError,
    refresh: refreshAssessmentClassrooms,
  } = useAssessmentClassrooms();
  
  // Determine if user is a student
  const isStudent = user?.role === 'student';
  const inventoryKey = assessmentClassrooms.map((c) => c.classroom_id).join(',');
  const teacherQuizzesCacheRef = React.useRef<any[] | null>(null);
  const loadGenerationRef = React.useRef(0);

  // Responsive layout detection
  const isWeb = width > 768;

  useEffect(() => {
    void loadClasses({ forceQuizzes: false });
    // inventoryKey: only re-enhance when classroom identity set changes (not array identity churn).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryKey, storedQuizzes, isStudent]);

  const loadClasses = async (opts?: { forceQuizzes?: boolean }) => {
    const generation = ++loadGenerationRef.current;
    const hasVisibleContent = classes.length > 0;
    // Keep rendered list during inventory/metrics refresh — only block when empty.
    if (!hasVisibleContent) {
      setLoading(true);
    }
    setListError(null);
    try {
      let fetchedClasses: any[] = [];
      let allQuizzes: any[] = [];
      
      // Shared authorized inventory (teacher: class_wise_students; student: classes).
      // Includes zero-assignment classrooms; never derive the list from quizzes alone.
      fetchedClasses = assessmentClassrooms.map((c) => ({ ...c }));

      if (classroomsUnavailable && fetchedClasses.length === 0) {
        setListError(classroomsError || 'Classroom list temporarily unavailable.');
        if (generation === loadGenerationRef.current) setLoading(false);
        return;
      }

      if (isStudent) {
        allQuizzes = storedQuizzes;
      } else if (!opts?.forceQuizzes && teacherQuizzesCacheRef.current) {
        allQuizzes = teacherQuizzesCacheRef.current;
      } else {
        // Get all quizzes for the instructor with complete attempt data
        // Use view_type='all' to get detailed student statuses (completed, pending, missed)
        const quizzesResult = await fetchTeacherQuizzes({
          view_type: 'all',
          limit: 1000,
        });
        if (generation !== loadGenerationRef.current) return;
        teacherQuizzesCacheRef.current = quizzesResult.data;
        allQuizzes = quizzesResult.data;
      }
      
      // Enhance classes with quiz counts
      const enhancedClasses = fetchedClasses.map((classItem: any) => {
        // Get student count (only for teachers, not students)
        let studentCount = 0;
        if (!isStudent) {
          studentCount = classItem.total_count || 0;
          
          // If total_count is not available, try parsing attempts
          if (!studentCount && classItem.attempts) {
            try {
              const attempts = typeof classItem.attempts === 'string' 
                ? JSON.parse(classItem.attempts) 
                : classItem.attempts;
              studentCount = Array.isArray(attempts) ? attempts.length : 0;
            } catch (e) {
              console.error('Error parsing attempts for student count:', e);
            }
          }
        }
        
        // Count quizzes for this class
        const classQuizzes = allQuizzes.filter(q => {
          const qClassId = q.classroom_id || q.class_id;
          return qClassId === classItem.classroom_id;
        });
        const quizCount = classQuizzes.length;
        
        // Count quizzes by availability status
        let activeQuizzes = 0;
        let expiredQuizzes = 0;
        let upcomingQuizzes = 0;
        let completedQuizzes = 0;
        
        if (isStudent) {
          // For students: Use common filter utilities for consistency
          activeQuizzes = classQuizzes.filter(isStudentQuizActive).length;
          upcomingQuizzes = classQuizzes.filter(isStudentQuizUpcoming).length;
          completedQuizzes = filterCompletedQuizzes(classQuizzes).length;
          expiredQuizzes = filterMissedQuizzes(classQuizzes).length;
        } else {
          // For teachers: count by availability status
          activeQuizzes = classQuizzes.filter(q => q.availability_status === 'active').length;
          expiredQuizzes = classQuizzes.filter(q => q.availability_status === 'expired').length;
          upcomingQuizzes = classQuizzes.filter(q => q.availability_status === 'available_soon').length;
        }
        
        // Calculate performance metrics
        let avgScore: number | null = 0;
        let completionPercentage: number | null = 0;
        
        if (isStudent) {
          // For students: calculate personal performance in this class
          const completedClassQuizzes = classQuizzes.filter(q => q.status === 'completed');
          
          // Completion percentage = completed quizzes / total quizzes * 100
          completionPercentage = quizCount > 0 
            ? parseFloat(((completedClassQuizzes.length / quizCount) * 100).toFixed(1))
            : 0;
          
          // Average score from completed quizzes
          if (completedClassQuizzes.length > 0) {
            const totalScore = completedClassQuizzes.reduce((sum, q) => {
              const score = typeof q.score === 'number' ? q.score : 0;
              return sum + score;
            }, 0);
            avgScore = parseFloat((totalScore / completedClassQuizzes.length).toFixed(1));
          }
        } else {
          // For teachers: calculate class-wide performance metrics
          // Parse attempts from each quiz to get individual student scores
          let totalScoreSum = 0; // Sum of all student quiz scores from completed attempts
          let completedAttempts = 0; // Count of completed attempts
          let totalPossibleAttempts = 0; // Total quizzes * total students
          
          classQuizzes.forEach((quiz) => {
            // Parse attempts array from JSON string
            let attempts = [];
            if (quiz.attempts) {
              try {
                attempts = typeof quiz.attempts === 'string' 
                  ? JSON.parse(quiz.attempts) 
                  : quiz.attempts;
              } catch (e) {
                console.error('Error parsing attempts for quiz:', quiz.quiz_id, e);
              }
            }
            
            const studentCountForQuiz = quiz.total_students || studentCount || 0;
            
            // Calculate total possible attempts (quizzes * students)
            totalPossibleAttempts += studentCountForQuiz;
            
            // Process each student attempt
            if (Array.isArray(attempts)) {
              attempts.forEach((attempt: any) => {
                // Only count completed attempts with status 'completed'
                if (attempt.status === 'completed' || attempt.completed_at) {
                  completedAttempts++;
                  
                  // Add score to sum (raw score value, no rounding)
                  const score = typeof attempt.score === 'number' ? attempt.score : 0;
                  totalScoreSum += score;
                }
              });
            }
          });
          
          // ✅ Calculate Classroom Average Score (CORRECTED FORMULA)
          // Formula: ∑(all students' quiz scores) / ∑(maximum scores of attempted quizzes) × 100
          // = (Sum of scores from completed attempts) / (Completed attempts × 100) × 100
          // Simplified: Average score per completed attempt
          // Only includes completed attempts - does NOT include unattempted quizzes as zero
          avgScore = completedAttempts > 0 
            ? (totalScoreSum / completedAttempts)
            : null;
          
          // ✅ Calculate Classroom Completion Rate (Already Correct)
          // Formula: (Total completed quiz attempts) / (Total assigned quiz attempts) × 100
          // Total assigned attempts = (Number of quizzes) × (Number of students)
          // Completed attempts = Count of attempts with status = 'completed'
          completionPercentage = totalPossibleAttempts > 0 
            ? (completedAttempts / totalPossibleAttempts) * 100
            : null;
        }

        return {
          ...classItem,
          studentCount,
          quizCount,
          activeQuizzes,
          expiredQuizzes,
          upcomingQuizzes,
          completedQuizzes,
          avgScore,
          completionPercentage,
        };
      });
      
      if (generation !== loadGenerationRef.current) return;
      setClasses(enhancedClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAssessmentClassrooms();
    await loadClasses({ forceQuizzes: true });
  };

  const handleClassPress = (classItem: ClassData) => {
    // Navigate to Assessments page with class details
    if (navigation) {
      navigation.navigate('Assessments', { 
        classroomId: classItem.classroom_id,
        classroomName: classItem.classroom_name,
      });
    } else if (onNavigate) {
      onNavigate('Assessments', { 
        classroomId: classItem.classroom_id,
        classroomName: classItem.classroom_name,
      });
    }
  };

  const handleStatusPress = (classItem: ClassData, status: string) => {
    // Navigate to Assessments page with filtered status
    if (navigation) {
      navigation.navigate('Assessments', { 
        classroomId: classItem.classroom_id,
        classroomName: classItem.classroom_name,
        filterStatus: status,
      });
    } else if (onNavigate) {
      onNavigate('Assessments', { 
        classroomId: classItem.classroom_id,
        classroomName: classItem.classroom_name,
        filterStatus: status,
      });
    }
  };

  const handleStudentCountPress = (classItem: ClassData) => {
    // Navigate to Students list page filtered by this classroom
    if (navigation) {
      navigation.navigate('StudentList', { 
        classroomId: classItem.classroom_id,
        classroomName: classItem.classroom_name,
      });
    } else if (onNavigate) {
      onNavigate('StudentList', { 
        classroomId: classItem.classroom_id,
        classroomName: classItem.classroom_name,
      });
    }
  };

  const renderClassCard = ({ item }: { item: ClassData }) => {
    return (
      <TouchableOpacity
        style={[
          styles.classCard,
          { backgroundColor: theme.colors.card },
          isWeb && styles.classCardWeb,
        ]}
        onPress={() => handleClassPress(item)}
        activeOpacity={0.8}
      >
        {/* Class Header */}
        <View style={styles.classHeader}>
          <View style={[styles.classIconContainer, { backgroundColor: '#E8D5FF' }]}>
            <Ionicons name="school" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.classTitleContainer}>
            <Text style={[styles.className, { color: theme.colors.text }]} numberOfLines={2}>
              {item.classroom_name}
            </Text>
            {item.instructor && (
              <Text style={[styles.classSubject, { color: theme.colors.textSecondary }]}>
                {item.instructor.instructor_fullname}
              </Text>
            )}
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.performanceMetrics}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Avg Score</Text>
            <Text style={[styles.metricValue, { color: (item.avgScore ?? 0) >= 75 ? '#10B981' : (item.avgScore ?? 0) >= 50 ? '#F59E0B' : '#EF4444' }]}> 
              {(item.avgScore === null || item.avgScore === undefined) ? 'N/A' : `${item.avgScore.toFixed(2)}%`}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Completion</Text>
            <Text style={[styles.metricValue, { color: (item.completionPercentage ?? 0) >= 75 ? '#10B981' : (item.completionPercentage ?? 0) >= 50 ? '#F59E0B' : '#EF4444' }]}> 
              {(item.completionPercentage === null || item.completionPercentage === undefined) ? 'N/A' : `${item.completionPercentage.toFixed(2)}%`}
            </Text>
          </View>
        </View>

        {/* Class Stats */}
        <View style={styles.statsContainer}>
          {!isStudent && (
            <TouchableOpacity 
              style={styles.statItem}
              onPress={(e) => {
                e.stopPropagation();
                handleStudentCountPress(item);
              }}
              activeOpacity={0.6}
            >
              <Ionicons name="people" size={16} color={theme.colors.primary} />
              <Text style={[styles.statText, { color: theme.colors.text }]}>
                {item.studentCount || 0} Student{item.studentCount !== 1 ? 's' : ''}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
          <View style={styles.statItem}>
            <Ionicons name="document-text" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.statText, { color: theme.colors.text }]}>
              {item.quizCount || 0} {isStudent ? 'Quiz' : 'Assignment'}{item.quizCount !== 1 ? (isStudent ? 'zes' : 's') : ''}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary} />
          </View>
        </View>
        
        {/* Quiz Status Counts */}
        <View style={styles.quizStatusContainer}>
          <TouchableOpacity 
            style={[styles.statusBadge, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}
            onPress={(e) => {
              e.stopPropagation();
              handleStatusPress(item, isStudent ? 'pending' : 'active');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="pulse" size={14} color="#10B981" />
            <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>
              {item.activeQuizzes || 0} {isStudent ? 'Pending' : 'Active'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statusBadge, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
            onPress={(e) => {
              e.stopPropagation();
              handleStatusPress(item, 'upcoming');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={14} color="#F59E0B" />
            <Text style={[styles.statusBadgeText, { color: '#F59E0B' }]}>
              {item.upcomingQuizzes || 0} Upcoming
            </Text>
          </TouchableOpacity>
          
          {isStudent && (
            <TouchableOpacity 
              style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}
              onPress={(e) => {
                e.stopPropagation();
                handleStatusPress(item, 'completed');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done" size={14} color={theme.colors.primary} />
              <Text style={[styles.statusBadgeText, { color: theme.colors.primary }]}>
                {item.completedQuizzes || 0} Completed
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.statusBadge, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}
            onPress={(e) => {
              e.stopPropagation();
              handleStatusPress(item, isStudent ? 'missed' : 'expired');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={14} color="#EF4444" />
            <Text style={[styles.statusBadgeText, { color: '#EF4444' }]}>
              {item.expiredQuizzes || 0} {isStudent ? 'Missed' : 'Expired'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={60} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="school-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No classes found</Text>
        </View>
      ) : isWeb ? (
        <ScrollView
          contentContainerStyle={styles.webGridContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          {classes.map((item) => renderClassCard({ item }))}
        </ScrollView>
      ) : (
        <FlatList
          data={classes}
          renderItem={renderClassCard}
          keyExtractor={(item) => item.classroom_id}
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
      )}
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
    padding: 12,
  },
  webGridContainer: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  classCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  classCardWeb: {
    flex: 1,
    minWidth: 300,
    maxWidth: 400,
    marginBottom: 0,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  classIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  classTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  classSubject: {
    fontSize: 13,
  },
  performanceMetrics: {
    flexDirection: 'row',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  statChevron: {
    marginLeft: 4,
  },
  quizStatusContainer: {
    flexDirection: 'row', // Ensure all items are in a single row
    flexWrap: 'nowrap', // Prevent wrapping to the next line
    gap: 6, // Maintain spacing between items
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
