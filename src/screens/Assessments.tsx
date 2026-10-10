import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  TextInput,
  StatusBar,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTeacherDashboard } from '@core/hooks/useTeacherDashboard';
import { useTeacherTheme } from '../erp_schools/theme/useTeacherTheme';
import { useDashboardStore } from '@core/store/dashboard.store';
import { loadStudentDashboardQuizzes } from '@core/services/studentDashboardData.service';
import { useStudentAssignmentDashboardStore } from '@core/store/studentAssignmentDashboard.store';
import { useAuth } from '@core/hooks/useAuth';
import {
  isAssignedQuizRecoveryProbeError,
} from '@core/services/assignedQuizRecovery.service';
import {
  isAssignedQuizLoadError,
  navigateStudentToQuizTaking,
  resolveStudentAssignedQuizStart,
  executeStudentAssignedQuizViewResults,
} from '@core/services/assessmentQuizStart.service';
import { ClassroomFilter, DateRangeFilter, FilterSection } from '@components/FilterComponents';
import { isStudentQuizOngoing } from '../utils/quizFilters';
import {
  canStudentResumeAssignment,
  canStudentStartAssignment,
} from '../utils/studentAssignmentClassification';
import { DateFilterType } from '../utils/dateFilters';

type FilterTab = 'all' | 'active' | 'available_soon' | 'expired' | 'upcoming' | 'ongoing' | 'completed' | 'missed';

interface Props {
  navigation?: any;
  onNavigate?: (screen: string, params?: any) => void;
  userRole: 'instructor' | 'student';
  route?: {
    params?: {
      filter?: FilterTab;
      filterStatus?: string;
      classroomId?: string;
      classroomName?: string;
    };
  };
}

// Status badge color mapping — ERP Schools semantic colors
const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: string; bg: string; text: string }> = {
    active:         { color: '#22C55E', bg: '#E8F5E9', text: 'Active' },
    expired:        { color: '#EF4444', bg: '#FEE2E2', text: 'Expired' },
    available_soon: { color: '#0B5563', bg: '#E6F3F5', text: 'Upcoming' },
  };
  return configs[status] || { color: '#64748B', bg: '#F1F5F9', text: status };
};

// Student status badge color mapping — ERP Schools semantic colors
const getStudentStatusConfig = (status: string) => {
  const configs: Record<string, { color: string; bg: string; text: string }> = {
    pending:     { color: '#0B5563', bg: '#E6F3F5', text: 'Pending' },
    completed:   { color: '#22C55E', bg: '#E8F5E9', text: 'Completed' },
    missed:      { color: '#EF4444', bg: '#FEE2E2', text: 'Missed' },
    in_progress: { color: '#F59E0B', bg: '#FFF3E0', text: 'In Progress' },
  };
  return configs[status] || { color: '#64748B', bg: '#F1F5F9', text: status };
};

export default function Assessments({ navigation, onNavigate, userRole, route }: Props) {
  const t = useTeacherTheme();
  const isDark = t.isDark;
  // Compat shim — maps old theme.colors.* names to ERP Schools tokens
  const theme = {
    colors: {
      background:    t.colors.background,
      card:          t.colors.surface,
      surface:       t.colors.surfaceAlt,
      text:          t.colors.textPrimary,
      textSecondary: t.colors.textSecondary,
      primary:       t.colors.primary,
      border:        t.colors.border,
      error:         t.colors.danger,
    },
  };
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  
  // Map filterStatus from ClassesList to filter tabs
  const mapFilterStatus = (status?: string): FilterTab => {
    if (!status) return 'all';
    const statusMap: Record<string, FilterTab> = {
      'pending': 'ongoing',
      'ongoing': 'ongoing',
      'completed': 'completed',
      'missed': 'missed',
      'active': 'active',
      'upcoming': 'upcoming',
      'expired': 'expired',
      'available_soon': 'available_soon',
    };
    return statusMap[status] || 'all';
  };
  
  // Get initial filter from route params, default to 'all'
  const filterStatus = route?.params?.filterStatus;
  const initialFilter = route?.params?.filter || mapFilterStatus(filterStatus);
  const classroomId = route?.params?.classroomId;
  const classroomName = route?.params?.classroomName;
  const [selectedTab, setSelectedTab] = useState<FilterTab>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCount, setDisplayCount] = useState(10);
  const [selectedClassroom, setSelectedClassroom] = useState<string>(classroomId || 'all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilterType>('all');
  const [dateRangeStart, setDateRangeStart] = useState<Date>(new Date());
  const [dateRangeEnd, setDateRangeEnd] = useState<Date>(new Date());
  const [loadingQuizId, setLoadingQuizId] = useState<number | null>(null);
  const [completedAttemptModal, setCompletedAttemptModal] = useState<{
    quizName: string;
    score: number | null;
    completedAt: string | null;
    quizId: number;
    attemptData: any;
  } | null>(null);

  const isWeb = width > 768;
  const isTeacher = userRole === 'instructor' || user?.role === 'instructor';
  const isStudent = user?.role === 'student';

  // Fetch data based on role
  const teacherData = useTeacherDashboard();
  const { quizzes: storedQuizzes, setQuizzes } = useDashboardStore();

  const {
    quizzes: teacherQuizzes = [],
    loading: teacherLoading,
    error: teacherError,
    refresh: teacherRefresh,
  } = isTeacher ? teacherData : { quizzes: [], loading: false, error: null, refresh: () => {} };

  // For students, use dashboard store data (already loaded by StudentDashboard)
  const [studentRefreshing, setStudentRefreshing] = useState(false);
  const studentClassified = useStudentAssignmentDashboardStore((s) => s.getClassifiedQuizzes());
  const setRawQuizzes = useStudentAssignmentDashboardStore((s) => s.setRawQuizzes);
  const studentQuizzes = isStudent
    ? (studentClassified.length > 0 ? studentClassified : storedQuizzes)
    : [];

  const studentRefresh = useCallback(async () => {
    if (!isStudent || !user?.id) return;
    setStudentRefreshing(true);
    try {
      const { quizzes } = await loadStudentDashboardQuizzes(String(user.id));
      setRawQuizzes(quizzes as any);
      const classified = useStudentAssignmentDashboardStore.getState().getClassifiedQuizzes();
      setQuizzes(classified as any, classified.length);
    } catch (refreshError) {
      console.error('Assessments student refresh failed:', refreshError);
    } finally {
      setStudentRefreshing(false);
    }
  }, [isStudent, user?.id, setQuizzes]);

  const loading = isTeacher ? teacherLoading : studentRefreshing;
  const error = isTeacher ? teacherError : null;
  const refresh = isTeacher ? teacherRefresh : studentRefresh;

  // Filter tabs based on role
  const teacherTabs: FilterTab[] = ['all', 'active', 'available_soon', 'expired'];
  const studentTabs: FilterTab[] = ['all', /*'upcoming', */ 'ongoing', 'completed', 'missed'];  
  const tabs = isTeacher ? teacherTabs : studentTabs;

  // Update selectedTab when route params change
  React.useEffect(() => {
    const newFilterStatus = route?.params?.filterStatus;
    const newFilter = route?.params?.filter;
    if (newFilter) {
      setSelectedTab(newFilter);
    } else if (newFilterStatus) {
      const mappedFilter = mapFilterStatus(newFilterStatus);
      setSelectedTab(mappedFilter);
    }
  }, [route?.params?.filterStatus, route?.params?.filter]);

  // Update selectedClassroom when route params change
  React.useEffect(() => {
    const newClassroomId = route?.params?.classroomId;
    // Update classroom filter when navigating with classroomId param
    if (newClassroomId !== undefined) {
      setSelectedClassroom(newClassroomId || 'all');
    }
  }, [route?.params?.classroomId]);

  // Reset display count when filters change
  React.useEffect(() => {
    setDisplayCount(10);
  }, [selectedTab, searchQuery, classroomId, selectedClassroom, selectedDateFilter, dateRangeStart, dateRangeEnd]);

  // Filter assessments - ensure we always have an array
  const allQuizzes = isTeacher ? (teacherQuizzes || []) : (studentQuizzes || []);
  
  // Extract unique classrooms for filter dropdown
  const uniqueClassrooms = React.useMemo(() => {
    const classroomMap = new Map<string, string>();
    allQuizzes.forEach((quiz: any) => {
      const classroomId = quiz.classroom_id || quiz.class_id;
      const classroomName = quiz.classroom_name || quiz.class_name;
      if (classroomId && classroomName && !classroomMap.has(classroomId)) {
        classroomMap.set(classroomId, classroomName);
      }
    });
    return Array.from(classroomMap.entries()).map(([classroom_id, classroom_name]) => ({ classroom_id, classroom_name }));
  }, [allQuizzes]);
  
  // First, apply classroom, date, and search filters (not tab filter yet)
  const baseFilteredQuizzes = React.useMemo(() => {
    return allQuizzes.filter((quiz: any) => {
      // Classroom filter
      if (selectedClassroom && selectedClassroom !== 'all') {
        const quizClassroomId = String(quiz.classroom_id || quiz.class_id || '');
        const filterClassroomId = String(selectedClassroom);
        
        if (quizClassroomId !== filterClassroomId) {
          return false;
        }
      }
    
      // Date range filter
      if (selectedDateFilter !== 'all') {
        const quizDateString = quiz.created_at || quiz.start_time || quiz.assigned_at;
        if (!quizDateString) {
          return true; // Skip date filtering if no date available
        }
        
        const quizDate = new Date(quizDateString);
        
        // Create new Date objects to avoid mutating the originals
        const start = new Date(dateRangeStart.getTime());
        const end = new Date(dateRangeEnd.getTime());
        
        // Set time to start/end of day for accurate comparison
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        const isInRange = quizDate >= start && quizDate <= end;
        
        if (!isInRange) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const quizName = quiz.quiz_name || '';
        const topic = quiz.topic || '';
        if (!quizName.toLowerCase().includes(searchLower) &&
            !topic.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [allQuizzes, selectedClassroom, selectedDateFilter, dateRangeStart, dateRangeEnd, searchQuery]);

  // Calculate tab counts from base filtered quizzes (after classroom, date, search filters)
  const tabCounts = React.useMemo(() => {
    if (isTeacher) {
      // Teacher tab counts based on availability_status
      const counts: Record<FilterTab, number> = {
        all: baseFilteredQuizzes.length,
        active: baseFilteredQuizzes.filter((q: any) => q.availability_status === 'active').length,
        available_soon: baseFilteredQuizzes.filter((q: any) => q.availability_status === 'coming soon').length,
        expired: baseFilteredQuizzes.filter((q: any) => q.availability_status === 'expired').length,
        // Student-only tabs (not used for teachers)
        ongoing: 0,
        upcoming: 0,
        completed: 0,
        missed: 0,
      };
      return counts;
    } else {
      // Student tab counts based on status field
      const counts: Record<FilterTab, number> = {
        all: baseFilteredQuizzes.length,
        upcoming: baseFilteredQuizzes.filter((q: any) => q.status === 'available_soon' || q.status === 'pending').length,
        ongoing: baseFilteredQuizzes.filter(isStudentQuizOngoing).length,
        completed: baseFilteredQuizzes.filter((q: any) => q.status === 'completed').length,
        missed: baseFilteredQuizzes.filter((q: any) => q.status === 'missed').length,
        // Teacher-only tabs (not used for students)
        active: 0,
        available_soon: 0,
        expired: 0,
      };
      return counts;
    }
  }, [baseFilteredQuizzes, isTeacher]);

  // Finally, apply tab filter to get final filtered quizzes
  const filteredQuizzes = React.useMemo(() => {
    return baseFilteredQuizzes.filter((quiz: any) => {
      // Tab filter for teachers
      if (isTeacher) {
        if (selectedTab === 'all') return true;
        if (selectedTab === 'active') return quiz.availability_status === 'active';
        if (selectedTab === 'available_soon') return quiz.availability_status === 'coming soon';
        if (selectedTab === 'expired') return quiz.availability_status === 'expired';
        return true;
      }
      
      // Tab filter for students
      if (selectedTab === 'all') return true;
      
      // Upcoming: not yet open (no Start)
      if (selectedTab === 'upcoming') {
        return quiz.status === 'upcoming';
      }
      
      // Ongoing: actionable pending / in-progress within active window
      if (selectedTab === 'ongoing') {
        return isStudentQuizOngoing(quiz);
      }
      
      // Completed: quizzes that have been completed
      if (selectedTab === 'completed') {
        return quiz.status === 'completed';
      }
      
      // Missed: quizzes that were missed (expired without attempt)
      if (selectedTab === 'missed') {
        return quiz.status === 'missed';
      }
      
      return true;
    });
  }, [baseFilteredQuizzes, selectedTab, isTeacher]);

  // const handleCreateAssessment = () => {
  //   console.log('Create new assessment');
  //   // TODO: Navigate to create assessment screen
  // };

  const handleAssessmentPress = (quizId: number) => {
    // Find the quiz data
    const quiz = filteredQuizzes.find((q: any) => q.quiz_id === quizId);
    
    if (navigation) {
      // Navigate to QuizPreviewScreen to see quiz details/questions
      navigation.navigate('QuizPreviewScreen', {
        quizId,
        quizData: quiz,
      });
    } else if (onNavigate) {
      onNavigate('QuizPreviewScreen', { quizId, quizData: quiz });
    }
  };

  const handleAction = async (action: string, quizId: number, attemptData?: any) => {
    // View quiz students (Teacher)
    if (isTeacher && action === 'view') {
      const quiz = filteredQuizzes.find((q: any) => q.quiz_id === quizId);
      if (navigation) {
        navigation.navigate('StudentList', {
          quizId,
          quizName: quiz?.quiz_name || 'Quiz',
        });
      } else if (onNavigate) {
        onNavigate('students', { quizId, quizName: quiz?.quiz_name });
      }
      return;
    }
    
    // Student-specific action: View assessment results (probe pending recovery first)
    if (!isTeacher && action === 'viewResults' && attemptData) {
      const correctQuizId = attemptData?.quiz_id || quizId;
      const correctSessionId = attemptData?.session_id || '';
      const correctClassroomId = attemptData?.classroom_id || attemptData?.class_id || '';
      const studentIdForApi =
        (attemptData?.student_id != null ? attemptData.student_id.toString() : null) ??
        user?.id?.toString() ??
        '';

      setLoadingQuizId(correctQuizId);
      try {
        await executeStudentAssignedQuizViewResults(
          {
            studentId: studentIdForApi,
            quizId: correctQuizId,
            sessionId: correctSessionId,
            classroomId: correctClassroomId,
            attemptData,
            quizName: attemptData?.quiz_name,
          },
          { navigation, onNavigate },
        );
      } catch (error) {
        if (isAssignedQuizRecoveryProbeError(error) || isAssignedQuizLoadError(error)) {
          Alert.alert(
            'Connection Error',
            'Could not verify your saved submission. Please check your connection and try again.',
          );
          return;
        }
        Alert.alert(
          'Connection Error',
          'Could not open results. Please check your connection and try again.',
        );
      } finally {
        setTimeout(() => setLoadingQuizId(null), 1000);
      }
      return;
    }
    
    // Student-specific action: Start or Resume quiz
    if (!isTeacher && (action === 'start' || action === 'resume')) {
      const correctQuizId = attemptData?.quiz_id || quizId;
      const correctSessionId = attemptData?.session_id || '';
      const correctClassroomId = attemptData?.classroom_id || attemptData?.class_id || '';
      
      setLoadingQuizId(correctQuizId);
      try {
        // Use student_id from the quiz record (numeric ID the API expects).
        // Falls back to user.id if student_id is not on the quiz object.
        const studentIdForApi =
          (attemptData?.student_id != null
            ? attemptData.student_id.toString()
            : null) ??
          user?.id?.toString() ??
          '';

        const startResult = await resolveStudentAssignedQuizStart({
          studentId: studentIdForApi,
          quizId: correctQuizId,
          sessionId: correctSessionId,
          classroomId: correctClassroomId,
          attemptData,
        });

        if (startResult.kind === 'lookup_failed') {
          Alert.alert(
            'Connection Error',
            'Could not verify your quiz status. Please check your connection and try again.',
          );
          return;
        }

        if (startResult.kind === 'already_completed') {
          setCompletedAttemptModal({
            quizName: startResult.quizName,
            score: startResult.score,
            completedAt: startResult.completedAt,
            quizId: Number(startResult.quizId),
            attemptData: startResult.attemptData,
          });
          return;
        }

        navigateStudentToQuizTaking(navigation, onNavigate, startResult.params);
      } catch (error) {
        if (isAssignedQuizRecoveryProbeError(error)) {
          Alert.alert(
            'Connection Error',
            'Could not verify your saved submission. Please check your connection and try again.',
          );
          return;
        }
        if (isAssignedQuizLoadError(error)) {
          Alert.alert(
            'Connection Error',
            'Could not load quiz questions. Please check your connection and try again.',
          );
          return;
        }
        Alert.alert(
          'Connection Error',
          'Could not start this assessment. Please check your connection and try again.',
        );
      } finally {
        setTimeout(() => setLoadingQuizId(null), 1000);
      }
      return;
    }
  };

  if (teacherLoading && filteredQuizzes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={60} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={refresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        {...(Platform.OS === 'ios' ? { backgroundColor: theme.colors.background } : {})}
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        {/* <View style={styles.headerTop}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {isTeacher ? 'Assessments' : 'My Assessments'}
          </Text>
        </View> */}

        {/* Classroom Filter Banner */}
        {((classroomId && classroomName) || (selectedClassroom && selectedClassroom !== 'all')) && (() => {
          // Get the display name for the currently selected classroom
          let displayName = classroomName;
          if (selectedClassroom && selectedClassroom !== 'all') {
            const classroom = uniqueClassrooms.find(c => c.classroom_id === selectedClassroom);
            displayName = classroom?.classroom_name || displayName;
          }
          
          return displayName ? (
            <View style={[styles.classroomBanner, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}>
              <Ionicons name="school" size={18} color={theme.colors.primary} />
              <Text style={[styles.classroomBannerText, { color: theme.colors.primary }]}>
                Showing quizzes for: {displayName}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  // Clear both route params and dropdown selection
                  setSelectedClassroom('all');
                  if (navigation) {
                    navigation.setParams({ classroomId: undefined, classroomName: undefined });
                  } else if (onNavigate) {
                    onNavigate('Assessments', { filter: selectedTab });
                  }
                }}
                style={styles.clearFilterButton}
              >
                <Ionicons name="close-circle" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          ) : null;
        })()}

        {/* Search Bar (Web only) */}
        {isWeb && (
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.background }]}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search"
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}

        {/* Filters Section */}
        <FilterSection defaultCollapsed={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ClassroomFilter
              classrooms={uniqueClassrooms}
              selectedClassroom={selectedClassroom}
              onSelect={setSelectedClassroom}
              style={{ flex: 1 }}
            />
            <DateRangeFilter
              selectedDateFilter={selectedDateFilter}
              onDateFilterChange={(filter, startDate, endDate) => {
                setSelectedDateFilter(filter);
                setDateRangeStart(startDate);
                setDateRangeEnd(endDate);
              }}
              style={{ flex: 1 }}
            />
          </View>
        </FilterSection>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {tabs.map((tab) => {
            const isActive = selectedTab === tab;
            const count = tabCounts[tab] || 0;
            const tabLabel = tab === 'available_soon' ? 'Upcoming' : tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ');
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  { backgroundColor: isActive ? theme.colors.primary : theme.colors.surface },
                  isActive && styles.tabActive,
                ]}
                onPress={() => setSelectedTab(tab)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? '#FFFFFF' : theme.colors.textSecondary },
                  ]}
                >
                  {tabLabel} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* My AI Content Quick Links — teachers only */}
      {isTeacher && navigation && (
        <View style={[styles.aiToolsBarWrapper, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.aiToolsBar}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={[styles.aiToolBtn, { backgroundColor: '#0F766E12', borderColor: '#0F766E30' }]}
              onPress={() => navigation.navigate('DocumentUploadHomeScreen')}
              activeOpacity={0.75}
            >
              <Ionicons name="folder-open-outline" size={16} color="#0F766E" />
              <Text style={[styles.aiToolBtnText, { color: '#0F766E' }]}>Document Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aiToolBtn, { backgroundColor: theme.colors.primary + '12', borderColor: theme.colors.primary + '30' }]}
              onPress={() => navigation.navigate('RecentAssessmentsScreen')}
              activeOpacity={0.75}
            >
              <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.aiToolBtnText, { color: theme.colors.primary }]}>Recent AI Quizzes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aiToolBtn, { backgroundColor: '#05996912', borderColor: '#05996930' }]}
              onPress={() => navigation.navigate('WorksheetScreen')}
              activeOpacity={0.75}
            >
              <Ionicons name="document-text-outline" size={16} color="#059669" />
              <Text style={[styles.aiToolBtnText, { color: '#059669' }]}>Worksheets</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        

        {filteredQuizzes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: t.colors.primary + '14' }]}>
              <Ionicons name="document-text-outline" size={44} color={t.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: t.colors.textPrimary }]}>
              No assessments found
            </Text>
            <Text style={[styles.emptySubtitle, { color: t.colors.textSecondary }]}>
              Try adjusting your filters or date range
            </Text>
          </View>
        ) : (
          // Card View (Mobile & Desktop)
          <View style={styles.cardsContainer}>
            {filteredQuizzes.slice(0, displayCount).map((quiz: any) => {
              // Use different status configs for teacher vs student
              const statusConfig = isTeacher 
                ? getStatusConfig(quiz.availability_status) 
                : getStudentStatusConfig(quiz.status);
              const hasAttempt = quiz.status === 'completed' || (quiz.score !== null && quiz.score !== undefined);
              
              // Calculate duration display
              const getDurationDisplay = () => {
                if (quiz.duration) {
                  const minutes = quiz.duration;
                  if (minutes >= 60) {
                    const hours = Math.floor(minutes / 60);
                    const mins = minutes % 60;
                    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                  }
                  return `${minutes}m`;
                }
                return 'No limit';
              };
              
              // Calculate time taken display
              const getTimeTakenDisplay = () => {
                if (quiz.time_spent_seconds) {
                  const totalSeconds = quiz.time_spent_seconds;
                  const hours = Math.floor(totalSeconds / 3600);
                  const minutes = Math.floor((totalSeconds % 3600) / 60);
                  const seconds = totalSeconds % 60;
                  
                  if (hours > 0) {
                    return `${hours}h ${minutes}m ${seconds}s`;
                  } else if (minutes > 0) {
                    return `${minutes}m ${seconds}s`;
                  } else {
                    return `${seconds}s`;
                  }
                }
                return null;
              };
              
              return (
                <View
                  key={quiz.quiz_id}
                  style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {quiz.quiz_name}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                        {statusConfig.text}
                      </Text>
                    </View>
                  </View>

                  {/* Card Content */}
                  <View style={styles.cardContent}>
                    {/* Classroom Info */}
                    <View style={styles.cardRow}>
                      <Ionicons name="school-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={[styles.cardDetail, { color: theme.colors.text, fontWeight: '600' }]}>
                        {quiz.classroom_name || 'N/A'}
                      </Text>
                    </View>

                    {/* Subject/Topic */}
                    {quiz.topic && (
                      <View style={styles.cardRow}>
                        <Ionicons name="book-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.cardDetail, { color: theme.colors.textSecondary }]}>
                          {quiz.topic}
                        </Text>
                      </View>
                    )}
                    
                    {/* Quiz Start & End Time */}
                    <View style={styles.cardRow}>
                      <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={[styles.cardDetail, { color: theme.colors.textSecondary }]}>
                        {quiz.start_time ? new Date(quiz.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'} - {quiz.end_time ? new Date(quiz.end_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </Text>
                    </View>
                    
                    {/* Quiz Duration & Total Questions */}
                    <View style={styles.cardRow}>
                      <Ionicons name="hourglass-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={[styles.cardDetail, { color: theme.colors.textSecondary }]}>
                        Duration: {getDurationDisplay()} • {quiz.question_count || 0} {quiz.question_count === 1 ? 'Question' : 'Questions'}
                      </Text>
                    </View>
                    
                    {/* If quiz attended - show time taken and score */}
                    {hasAttempt && (
                      <View style={styles.attemptInfoContainer}>
                        <View style={styles.attemptInfoRow}>
                          {getTimeTakenDisplay() && (
                            <View style={[styles.attemptInfoBadge, { backgroundColor: t.colors.primary + '18' }]}>
                              <Ionicons name="timer-outline" size={14} color={t.colors.primary} />
                              <Text style={[styles.attemptInfoText, { color: t.colors.primary }]}>
                                Took: {getTimeTakenDisplay()}
                              </Text>
                            </View>
                          )}
                          {(quiz.score !== null && quiz.score !== undefined) && (
                            <View style={[styles.attemptInfoBadge, { backgroundColor: quiz.score >= 70 ? '#E8F5E9' : '#FEE2E2' }]}>
                              <Ionicons name="trophy-outline" size={14} color={quiz.score >= 70 ? '#22C55E' : '#EF4444'} />
                              <Text style={[styles.attemptInfoText, { color: quiz.score >= 70 ? '#22C55E' : '#EF4444' }]}>
                                Score: {quiz.score}%
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {isTeacher && (
                      <>
                        <View style={styles.cardStats}>
                          <View style={styles.statItem}>
                            <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
                            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                              {quiz.attempted_students || 0} / {quiz.total_students || 0}
                            </Text>
                          </View>
                          <View style={styles.statItem}>
                            <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                              {quiz.start_time ? new Date(quiz.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'} - {quiz.end_time ? new Date(quiz.end_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={styles.cardRow}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleAction('view', quiz.quiz_id);
                          }}
                        >
                          <Ionicons name="people-outline" size={16} color={theme.colors.primary} />
                          <Text style={[styles.cardDetail, { color: theme.colors.primary, textDecorationLine: 'underline' }]}>
                            Total: {quiz.total_students || 0} | Completed: {quiz.completed_count || 0} | Pending: {quiz.pending_count || 0}
                          </Text>
                        </TouchableOpacity>
                        <View style={styles.cardRow}>
                          <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                          <Text style={[styles.cardDetail, { color: theme.colors.textSecondary }]}>
                            Created: {new Date(quiz.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Text>
                        </View>
                      </>
                    )}

                    {!isTeacher && quiz.due_date && (
                      <View style={styles.cardRow}>
                        <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.cardDetail, { color: theme.colors.textSecondary }]}>
                          Due: {new Date(quiz.due_date).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* View Details Button - Teacher */}
                  {isTeacher && (
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={[styles.smallButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleAssessmentPress(quiz.quiz_id)}
                      >
                        <Ionicons name="eye" size={14} color="#FFFFFF" />
                        <Text style={styles.smallButtonText}>Details</Text>
                      </TouchableOpacity>
                    </View>
                  )}


                  {/* Card Footer - Student-Only Action Buttons */}
                  {!isTeacher && (
                    <View style={styles.cardFooter}>
                      {/* STUDENT LOGIC: Pending quizzes - Start button */}
                      {canStudentStartAssignment(quiz) && (
                        <TouchableOpacity
                          style={[styles.smallButton, { backgroundColor: theme.colors.primary }, loadingQuizId === quiz.quiz_id && { opacity: 0.6 }]}
                          onPress={() => handleAction('start', quiz.quiz_id, quiz)}
                          disabled={loadingQuizId === quiz.quiz_id}
                        >
                          {loadingQuizId === quiz.quiz_id ? (
                            <LoadingSpinner size={14} />
                          ) : (
                            <Ionicons name="play" size={14} color="#FFFFFF" />
                          )}
                          <Text style={styles.smallButtonText}>{loadingQuizId === quiz.quiz_id ? 'Loading...' : 'Start'}</Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* STUDENT LOGIC: In-progress quizzes - Resume button */}
                      {canStudentResumeAssignment(quiz) && (
                        <TouchableOpacity
                          style={[styles.smallButton, { backgroundColor: '#06B6D4' }, loadingQuizId === quiz.quiz_id && { opacity: 0.6 }]}
                          onPress={() => handleAction('resume', quiz.quiz_id, quiz)}
                          disabled={loadingQuizId === quiz.quiz_id}
                        >
                          {loadingQuizId === quiz.quiz_id ? (
                            <LoadingSpinner size={14} />
                          ) : (
                            <Ionicons name="refresh" size={14} color="#FFFFFF" />
                          )}
                          <Text style={styles.smallButtonText}>{loadingQuizId === quiz.quiz_id ? 'Loading...' : 'Resume'}</Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* STUDENT LOGIC: Completed quizzes - View Results button */}
                      {quiz.status === 'completed' && (
                        <TouchableOpacity
                          style={[
                            styles.smallButton,
                            { backgroundColor: theme.colors.primary },
                            loadingQuizId === quiz.quiz_id && { opacity: 0.6 },
                          ]}
                          onPress={() => handleAction('viewResults', quiz.quiz_id, quiz)}
                          disabled={loadingQuizId === quiz.quiz_id}
                        >
                          {loadingQuizId === quiz.quiz_id ? (
                            <LoadingSpinner size={14} />
                          ) : (
                            <Ionicons name="document-text" size={14} color="#FFFFFF" />
                          )}
                          <Text style={styles.smallButtonText}>
                            {loadingQuizId === quiz.quiz_id ? 'Loading...' : 'Results'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* STUDENT LOGIC: Missed quizzes - View Quiz button */}
                      {quiz.status === 'missed' && (
                        <TouchableOpacity
                          style={[styles.smallButton, { backgroundColor: theme.colors.primary }]}
                          onPress={() => handleAssessmentPress(quiz.quiz_id)}
                        >
                          <Ionicons name="eye-outline" size={14} color="#FFFFFF" />
                          <Text style={styles.smallButtonText}>View</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Load More Button */}
        {displayCount < filteredQuizzes.length && (
          <View style={styles.loadMoreContainer}>
            <TouchableOpacity
              style={[styles.loadMoreButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setDisplayCount(prev => prev + 10)}
            >
              <Text style={styles.loadMoreButtonText}>
                Load More ({filteredQuizzes.length - displayCount} remaining)
              </Text>
              <Ionicons name="chevron-down" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      </View>

      {/* ── Already Completed Modal ───────────────────────────────────────── */}
      <Modal
        transparent
        animationType="fade"
        visible={completedAttemptModal !== null}
        onRequestClose={() => setCompletedAttemptModal(null)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.card, { backgroundColor: theme.colors.card }]}>
            {/* Icon */}
            <View style={modalStyles.iconCircle}>
              <Ionicons name="checkmark-circle" size={48} color="#059669" />
            </View>

            <Text style={[modalStyles.title, { color: theme.colors.text }]}>
              Already Completed
            </Text>
            <Text style={[modalStyles.quizName, { color: theme.colors.primary }]} numberOfLines={2}>
              {completedAttemptModal?.quizName}
            </Text>
            <Text style={[modalStyles.subtitle, { color: theme.colors.textSecondary }]}>
              You have already submitted this assessment.
            </Text>

            {/* Score row */}
            {completedAttemptModal?.score !== null && completedAttemptModal?.score !== undefined && (
              <View style={[modalStyles.infoRow, { backgroundColor: theme.colors.background }]}>
                <Ionicons name="trophy" size={18} color="#F59E0B" />
                <Text style={[modalStyles.infoLabel, { color: theme.colors.textSecondary }]}>Score</Text>
                <Text style={[modalStyles.infoValue, { color: theme.colors.text }]}>
                  {typeof completedAttemptModal.score === 'number'
                    ? `${completedAttemptModal.score.toFixed(1)}%`
                    : completedAttemptModal.score}
                </Text>
              </View>
            )}

            {/* Completed date row */}
            {completedAttemptModal?.completedAt && (
              <View style={[modalStyles.infoRow, { backgroundColor: theme.colors.background }]}>
                <Ionicons name="calendar" size={18} color={theme.colors.primary} />
                <Text style={[modalStyles.infoLabel, { color: theme.colors.textSecondary }]}>Completed</Text>
                <Text style={[modalStyles.infoValue, { color: theme.colors.text }]}>
                  {new Date(completedAttemptModal.completedAt).toLocaleDateString(undefined, {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            )}

            {/* Buttons */}
            <View style={modalStyles.buttonRow}>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnOutline, { borderColor: theme.colors.primary }]}
                onPress={() => setCompletedAttemptModal(null)}
              >
                <Text style={[modalStyles.btnOutlineText, { color: theme.colors.primary }]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnPrimary, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  const data = completedAttemptModal;
                  setCompletedAttemptModal(null);
                  if (data) handleAction('viewResults', data.quizId, data.attemptData);
                }}
              >
                <Ionicons name="document-text" size={16} color="#fff" />
                <Text style={modalStyles.btnPrimaryText}>View Results</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  quizName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnOutline: {
    borderWidth: 1.5,
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnPrimary: {},
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#0B5563',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  classroomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  classroomBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  clearFilterButton: {
    padding: 4,
  },
  tabsContainer: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabActive: {
    elevation: 3,
    shadowColor: '#0B5563',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  mobileCreateContainer: {
    padding: 16,
  },
  mobileCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  content: {
    flex: 1,
  },
  aiToolsBarWrapper: {
    borderBottomWidth: 1,
  },
  aiToolsBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  aiToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  aiToolBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  // Web Table Styles
  tableContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  colAssessment: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colType: {
    flex: 1.5,
  },
  colClass: {
    flex: 1.5,
  },
  colStatus: {
    flex: 1.5,
  },
  colAttempted: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
  },
  colDates: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  colCounts: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colCreated: {
    flex: 1,
  },
  colActions: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  assessmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assessmentInfo: {
    flex: 1,
  },
  assessmentName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  assessmentTopic: {
    fontSize: 13,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Card Styles (Mobile & Desktop)
  cardsContainer: {
    padding: 12,
    gap: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 0,
    borderWidth: 1,
    shadowColor: '#0B5563',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
    flexBasis: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  cardContent: {
    gap: 6,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDetail: {
    fontSize: 13,
    flex: 1,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  studentCompletedActions: {
    gap: 12,
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 4,
  },
  scoreBadgeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  completionInfo: {
    gap: 6,
  },
  completionText: {
    fontSize: 13,
    marginLeft: 4,
  },
  viewDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    marginTop: 4,
  },
  viewDetailsLinkText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  missedQuizInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  missedText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(11, 85, 99, 0.10)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 5,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    gap: 8,
  },
  loadMoreButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Quiz Generation Section Styles
  quizGenerationSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  quizOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  quizOptionCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quizOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quizOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  quizOptionSubtitle: {
    fontSize: 10,
    textAlign: 'center',
  },
  // Filters Section Styles
  filtersSection: {
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  filtersHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterColumn: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterDropdownText: {
    fontSize: 14,
    flex: 1,
  },
  dropdownList: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    maxHeight: 200,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dropdownOptionText: {
    fontSize: 14,
    flex: 1,
  },
  attemptInfoContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(11, 85, 99, 0.10)',
  },
  attemptInfoRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  attemptInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  attemptInfoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  generateAssessmentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  generateAssessmentTile: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    flex: 1,
    marginHorizontal: 4,
  },
  generateAssessmentLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#374151',
  },
});
