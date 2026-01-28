import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { useTeacherDashboard } from '@core/hooks/useTeacherDashboard';
import { useDashboardStore } from '@core/store/dashboard.store';
import { useAuth } from '@core/hooks/useAuth';
import { ClassroomFilter, DateRangeFilter, FilterSection } from '@components/FilterComponents';
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

// Type icon and color mapping - matching UnifiedDashboard design
const getTypeConfig = (type: string) => {
  const configs: Record<string, { icon: string; color: string; bg: string }> = {
    ai: { icon: 'sparkles', color: '#0891B2', bg: '#CFFAFE' },
    pdf: { icon: 'document-text', color: '#DC2626', bg: '#FEE2E2' },
    image: { icon: 'camera', color: '#1B4F5C', bg: '#E8F4F8' },
    web: { icon: 'link', color: '#0284C7', bg: '#E0F2FE' },
    manual: { icon: 'create-outline', color: '#D97706', bg: '#FEF3C7' },
    quiz: { icon: 'help-circle', color: '#059669', bg: '#D1FAE5' },
  };
  return configs[type.toLowerCase()] || { icon: 'document', color: '#6B7280', bg: '#F3F4F6' };
};

// Status badge color mapping - matching UnifiedDashboard design (for teachers)
const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: string; bg: string; text: string }> = {
    active: { color: '#059669', bg: '#D1FAE5', text: 'Active' },
    expired: { color: '#DC2626', bg: '#FEE2E2', text: 'Expired' },
    available_soon: { color: '#1B4F5C', bg: '#E8F4F8', text: 'Upcoming' },
  };
  return configs[status] || { color: '#6B7280', bg: '#F3F4F6', text: status };
};

// Student status badge color mapping
const getStudentStatusConfig = (status: string) => {
  const configs: Record<string, { color: string; bg: string; text: string }> = {
    pending: { color: '#1B4F5C', bg: '#E8F4F8', text: 'Pending' },
    completed: { color: '#059669', bg: '#D1FAE5', text: 'Completed' },
    missed: { color: '#DC2626', bg: '#FEE2E2', text: 'Missed' },
    in_progress: { color: '#F59E0B', bg: '#FEF3C7', text: 'In Progress' },
  };
  return configs[status] || { color: '#6B7280', bg: '#F3F4F6', text: status };
};

export default function Assessments({ navigation, onNavigate, userRole, route }: Props) {
  const { theme, isDark } = useTheme();
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

  const isWeb = width > 768;
  const isTeacher = userRole === 'instructor' || user?.role === 'instructor';
  const isStudent = user?.role === 'student';

  // Fetch data based on role
  const teacherData = useTeacherDashboard();
  const { quizzes: storedQuizzes } = useDashboardStore();

  const {
    quizzes: teacherQuizzes = [],
    loading: teacherLoading,
    error: teacherError,
    refresh: teacherRefresh,
  } = isTeacher ? teacherData : { quizzes: [], loading: false, error: null, refresh: () => {} };

  // For students, use dashboard store data (already loaded by StudentDashboard)
  const studentQuizzes = isStudent ? storedQuizzes : [];
  const studentLoading = false;
  const studentError = null;
  const studentRefresh = () => {
    console.log('Student data refreshed from dashboard store');
  };

  const loading = isTeacher ? teacherLoading : studentLoading;
  const error = isTeacher ? teacherError : studentError;
  const refresh = isTeacher ? teacherRefresh : studentRefresh;

  // Filter tabs based on role
  const teacherTabs: FilterTab[] = ['all', 'active', 'available_soon', 'expired'];
  const studentTabs: FilterTab[] = ['all', /* 'upcoming', */ 'ongoing', 'completed', 'missed'];
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
  
  // Debug: Log quiz data to find missing fields
  console.log('📊 Assessments Screen - Raw Data:', {
    totalQuizzes: allQuizzes.length,
    isTeacher,
    firstQuizAllFields: allQuizzes[0],
    fieldNames: allQuizzes[0] ? Object.keys(allQuizzes[0]) : [],
    quizNames: allQuizzes.slice(0, 5).map((q: any) => ({
      id: q.quiz_id || q.id,
      name: q.quiz_name || q.name || q.title || q.quiz_title || 'NO NAME FIELD',
      allKeys: Object.keys(q),
    })),
  });

  // Debug: Log filter state
  console.log('🎯 Filter State:', {
    selectedTab,
    classroomId,
    selectedClassroom,
    selectedDateFilter,
    searchQuery,
    dateRangeStart: dateRangeStart.toISOString(),
    dateRangeEnd: dateRangeEnd.toISOString(),
  });
  
  const filteredQuizzes = React.useMemo(() => {
    console.log('🔄 Recalculating filtered quizzes...');
    return allQuizzes.filter((quiz: any) => {
      // Classroom filter - use selectedClassroom from state (which may have been initialized from route params)
      if (selectedClassroom && selectedClassroom !== 'all') {
        // Check both classroom_id and class_id for compatibility
        // Convert to strings for comparison to handle type mismatches
        const quizClassroomId = String(quiz.classroom_id || quiz.class_id || '');
        const filterClassroomId = String(selectedClassroom);
        
        console.log('🏫 Classroom comparison:', {
          quizId: quiz.quiz_id,
          quizClassroomId,
          filterClassroomId,
          match: quizClassroomId === filterClassroomId,
        });
        
        if (quizClassroomId !== filterClassroomId) {
          return false;
        }
      }
    
      // Date range filter - DateRangeFilter component already provides proper date range
      if (selectedDateFilter !== 'all') {
        const quizDateString = quiz.created_at || quiz.start_time || quiz.assigned_at;
        if (!quizDateString) {
          return true; // Skip date filtering if no date available
        }
        
        const quizDate = new Date(quizDateString);
        
        // Create new Date objects to avoid mutating the originals
        const start = new Date(dateRangeStart.getTime());
        const end = new Date(dateRangeEnd.getTime());
        
        // Set time to start/end of day for accurate comparison (on copies, not originals)
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        const isInRange = quizDate >= start && quizDate <= end;
        
        if (!isInRange) {
          console.log('📅 Date filter:', {
            quizId: quiz.quiz_id,
            quizDate: quizDate.toISOString(),
            start: start.toISOString(),
            end: end.toISOString(),
            filterType: selectedDateFilter,
            isInRange,
          });
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

    // Tab filter for teachers
    if (isTeacher) {
      if (selectedTab === 'all') return true;
      if (selectedTab === 'active') return quiz.availability_status === 'active';
      if (selectedTab === 'available_soon') return quiz.availability_status === 'available_soon';
      if (selectedTab === 'expired') return quiz.availability_status === 'expired';
      return true;
    }
    
    // Tab filter for students - use status field from ParsedQuiz
    if (selectedTab === 'all') return true;
    
    // Upcoming: pending quizzes (not started yet) that are available or coming soon
    if (selectedTab === 'upcoming') {
      return quiz.status === 'available_soon' || quiz.status === 'pending';
    }
    
    // Ongoing: quizzes that are in progress (started but not completed)
    if (selectedTab === 'ongoing') {
      return quiz.status === 'pending';
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
  }, [allQuizzes, classroomId, selectedClassroom, selectedDateFilter, dateRangeStart, dateRangeEnd, searchQuery, selectedTab, isTeacher]);

  // Debug: Log filtered results
  console.log('🔍 Filtered Results:', {
    selectedTab,
    activeClassroomFilter: classroomId || (selectedClassroom !== 'all' ? selectedClassroom : 'none'),
    activeDateFilter: selectedDateFilter,
    searchQuery: searchQuery || 'none',
    totalQuizzes: allQuizzes.length,
    filteredCount: filteredQuizzes.length,
    filtered: filteredQuizzes.map((q: any) => ({
      id: q.quiz_id,
      name: q.quiz_name,
      status: q.status,
      availability: q.availability_status,
      classroom_id: q.classroom_id || q.class_id,
      classroom_name: q.classroom_name || q.class_name,
    })),
  });

  // Calculate tab counts (with classroom and search filters applied)
  const getTabCount = (tab: FilterTab): number => {
    return allQuizzes.filter((quiz: any) => {
      // Apply classroom filter - use selectedClassroom from state (which may have been initialized from route params)
      if (selectedClassroom && selectedClassroom !== 'all') {
        // Convert to strings for comparison to handle type mismatches
        const quizClassroomId = String(quiz.classroom_id || quiz.class_id || '');
        const filterClassroomId = String(selectedClassroom);
        
        if (quizClassroomId !== filterClassroomId) {
          return false;
        }
      }

      // Apply date range filter
      if (selectedDateFilter !== 'all' && selectedDateFilter !== 'custom') {
        const quizDate = new Date(quiz.created_at || quiz.start_time || quiz.assigned_at);
        const start = new Date(dateRangeStart);
        const end = new Date(dateRangeEnd);
        
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        if (quizDate < start || quizDate > end) {
          return false;
        }
      } else if (selectedDateFilter === 'custom') {
        const quizDate = new Date(quiz.created_at || quiz.start_time || quiz.assigned_at);
        const start = new Date(dateRangeStart);
        const end = new Date(dateRangeEnd);
        
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        if (quizDate < start || quizDate > end) {
          return false;
        }
      }

      // Apply search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const quizName = quiz.quiz_name || '';
        const topic = quiz.topic || '';
        if (!quizName.toLowerCase().includes(searchLower) &&
            !topic.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Apply tab-specific filter
      if (isTeacher) {
        if (tab === 'all') return true;
        if (tab === 'active') return quiz.availability_status === 'active';
        if (tab === 'available_soon') return quiz.availability_status === 'available_soon';
        if (tab === 'expired') return quiz.availability_status === 'expired';
        return true;
      } else {
        if (tab === 'all') return true;
        if (tab === 'upcoming') return quiz.status === 'pending';
        if (tab === 'ongoing') return quiz.status === 'pending';
        if (tab === 'completed') return quiz.status === 'completed';
        if (tab === 'missed') return quiz.status === 'missed';
        return true;
      }
    }).length;
  };

  const tabCounts = {
    all: getTabCount('all'),
    active: getTabCount('active'),
    available_soon: getTabCount('available_soon'),
    expired: getTabCount('expired'),
    upcoming: getTabCount('upcoming'),
    ongoing: getTabCount('ongoing'),
    completed: getTabCount('completed'),
    missed: getTabCount('missed'),
  };

  // const handleCreateAssessment = () => {
  //   console.log('Create new assessment');
  //   // TODO: Navigate to create assessment screen
  // };

  const handleAssessmentPress = (quizId: number) => {
    console.log('📋 Opening quiz preview for quiz:', quizId);
    
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
    } else {
      console.log('Navigate to quiz view');
    }
  };

  const handleAction = (action: string, quizId: number, attemptData?: any) => {
    console.log(`Action ${action} on assessment ${quizId}`, attemptData);
    
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
    
    // Student-specific action: View assessment results
    if (!isTeacher && action === 'viewResults' && attemptData) {
      console.log('📊 Opening assessment results for student:', {
        quizId,
        attemptId: attemptData.attempt_id,
        score: attemptData.score,
        status: attemptData.status,
      });
      
      // Navigate to Quiz Result screen - same pattern as StudentDashboard
      // Use isTeacherView: true to fetch full quiz data in QuizResultsScreen
      if (onNavigate) {
        onNavigate('QuizResultsScreen', {
          quizId,
          quizName: attemptData.quiz_name,
          isTeacherView: true,
        });
      } else if (navigation) {
        navigation.navigate('QuizResultsScreen', {
          quizId,
          quizName: attemptData.quiz_name,
          isTeacherView: true,
        });
      }
      return;
    }
    
    // Student-specific action: Start or Resume quiz
    if (!isTeacher && (action === 'start' || action === 'resume')) {
      console.log('🎯 Starting/Resuming quiz:', {
        quizId,
        action,
        quizName: attemptData?.quiz_name,
        classId: attemptData?.class_id,
      });
      
      if (navigation) {
        navigation.navigate('QuizTakingScreen', {
          quizId,
          sessionId: attemptData?.class_id, // Use class_id as sessionId for assigned quizzes
          classroomId: attemptData?.class_id, // Use class_id as classroomId
          quizData: attemptData,
        });
      } else if (onNavigate) {
        onNavigate('QuizTakingScreen', {
          quizId,
          sessionId: attemptData?.class_id, // Use class_id as sessionId for assigned quizzes
          classroomId: attemptData?.class_id, // Use class_id as classroomId
          quizData: attemptData,
        });
      }
      return;
    }
  };

  if (teacherLoading && filteredQuizzes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
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
            <Ionicons name="document-text-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No assessments found
            </Text>
          </View>
        ) : isWeb ? (
          // Web Table View
          <View style={[styles.tableContainer, { backgroundColor: theme.colors.card }]}>
            {/* Table Header */}
            <View style={[styles.tableHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.tableHeaderText, styles.colAssessment, { color: theme.colors.text }]}>
                Assessment
              </Text>
              <Text style={[styles.tableHeaderText, styles.colType, { color: theme.colors.text }]}>
                Type
              </Text>
              <Text style={[styles.tableHeaderText, styles.colClass, { color: theme.colors.text }]}>
                Class
              </Text>
              <Text style={[styles.tableHeaderText, styles.colStatus, { color: theme.colors.text }]}>
                Status
              </Text>
              {isTeacher && (
                <>
                  <Text style={[styles.tableHeaderText, styles.colAttempted, { color: theme.colors.text }]}>
                    Students
                  </Text>
                  <Text style={[styles.tableHeaderText, styles.colDates, { color: theme.colors.text }]}>
                    Start - End
                  </Text>
                  <Text style={[styles.tableHeaderText, styles.colCounts, { color: theme.colors.text }]}>
                    A/C/P
                  </Text>
                </>
              )}
              <Text style={[styles.tableHeaderText, styles.colCreated, { color: theme.colors.text }]}>
                Created
              </Text>
              <Text style={[styles.tableHeaderText, styles.colActions, { color: theme.colors.text }]}>
                Actions
              </Text>
            </View>

            {/* Table Rows */}
            {filteredQuizzes.map((quiz: any, index: number) => {
              const typeConfig = getTypeConfig(quiz.quiz_type || 'manual');
              // Use different status configs for teacher vs student
              const statusConfig = isTeacher 
                ? getStatusConfig(quiz.availability_status) 
                : getStudentStatusConfig(quiz.status);
              
              return (
                <View
                  key={quiz.quiz_id}
                  style={[
                    styles.tableRow,
                    { borderBottomColor: theme.colors.border },
                    index === filteredQuizzes.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  {/* Assessment Name */}
                  <View style={styles.colAssessment}>
                    <View style={[styles.assessmentIcon, { backgroundColor: typeConfig.bg }]}>
                      <Ionicons name={typeConfig.icon as any} size={20} color={typeConfig.color} />
                    </View>
                    <View style={styles.assessmentInfo}>
                      <Text style={[styles.assessmentName, { color: theme.colors.text }]} numberOfLines={1}>
                        {quiz.quiz_name}
                      </Text>
                      <Text style={[styles.assessmentTopic, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {quiz.topic}
                      </Text>
                    </View>
                  </View>

                  {/* Type */}
                  <View style={styles.colType}>
                    <View style={[styles.typeBadge, { backgroundColor: typeConfig.bg }]}>
                      <Ionicons name={typeConfig.icon as any} size={14} color={typeConfig.color} />
                      <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
                        {(quiz.quiz_type || 'Manual').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Class */}
                  <Text style={[styles.colClass, { color: theme.colors.text }]} numberOfLines={1}>
                    {quiz.classroom_name || 'N/A'}
                  </Text>

                  {/* Status */}
                  <View style={styles.colStatus}>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                        {statusConfig.text}
                      </Text>
                    </View>
                  </View>

                  {/* Students (Teacher only) */}
                  {isTeacher && (
                    <TouchableOpacity 
                      style={styles.colAttempted}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleAction('view', quiz.quiz_id);
                      }}
                    >
                      <Text style={[{ color: theme.colors.primary, textDecorationLine: 'underline' }]}>
                        {quiz.attempted_students || 0} / {quiz.total_students || 0}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Start - End Dates (Teacher only) */}
                  {isTeacher && (
                    <View style={styles.colDates}>
                      <Text style={[styles.dateText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {quiz.start_time ? new Date(quiz.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                      </Text>
                      <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>-</Text>
                      <Text style={[styles.dateText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {quiz.end_time ? new Date(quiz.end_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                      </Text>
                    </View>
                  )}

                  {/* Assigned/Completed/Pending Counts (Teacher only) */}
                  {isTeacher && (
                    <View style={styles.colCounts}>
                      <Text style={[styles.countText, { color: theme.colors.primary }]}>{quiz.total_students || 0}</Text>
                      <Text style={[styles.countText, { color: '#10B981' }]}>{quiz.completed_count || 0}</Text>
                      <Text style={[styles.countText, { color: '#F59E0B' }]}>{quiz.pending_count || 0}</Text>
                    </View>
                  )}

                  {/* Created */}
                  <Text style={[styles.colCreated, { color: theme.colors.textSecondary }]}>
                    {new Date(quiz.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>

                  {/* Actions */}
                  <View style={styles.colActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20' }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleAction('view', quiz.quiz_id);
                      }}
                    >
                      <Ionicons name="eye" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                    {isTeacher && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20' }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleAction('edit', quiz.quiz_id);
                          }}
                        >
                          <Ionicons name="pencil" size={18} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#10B98120' }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleAction('more', quiz.quiz_id);
                          }}
                        >
                          <Ionicons name="ellipsis-horizontal" size={18} color="#10B981" />
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20' }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleAction('navigate', quiz.quiz_id);
                      }}
                    >
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          // Mobile Card View
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
                  style={[styles.card, { backgroundColor: theme.colors.card }]}
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
                            <View style={[styles.attemptInfoBadge, { backgroundColor: '#DBEAFE' }]}>
                              <Ionicons name="timer-outline" size={14} color={theme.colors.primary} />
                              <Text style={[styles.attemptInfoText, { color: theme.colors.primary }]}>
                                Took: {getTimeTakenDisplay()}
                              </Text>
                            </View>
                          )}
                          {(quiz.score !== null && quiz.score !== undefined) && (
                            <View style={[styles.attemptInfoBadge, { backgroundColor: quiz.score >= 70 ? '#D1FAE5' : '#FEE2E2' }]}>
                              <Ionicons name="trophy-outline" size={14} color={quiz.score >= 70 ? '#059669' : '#DC2626'} />
                              <Text style={[styles.attemptInfoText, { color: quiz.score >= 70 ? '#059669' : '#DC2626' }]}>
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
                      {quiz.status === 'pending' && (
                        <TouchableOpacity
                          style={[styles.smallButton, { backgroundColor: theme.colors.primary }]}
                          onPress={() => handleAction('start', quiz.quiz_id, quiz)}
                        >
                          <Ionicons name="play" size={14} color="#FFFFFF" />
                          <Text style={styles.smallButtonText}>Start</Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* STUDENT LOGIC: In-progress quizzes - Resume button */}
                      {quiz.status === 'in_progress' && (
                        <TouchableOpacity
                          style={[styles.smallButton, { backgroundColor: '#06B6D4' }]}
                          onPress={() => handleAction('resume', quiz.quiz_id, quiz)}
                        >
                          <Ionicons name="refresh" size={14} color="#FFFFFF" />
                          <Text style={styles.smallButtonText}>Resume</Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* STUDENT LOGIC: Completed quizzes - View Results button */}
                      {quiz.status === 'completed' && (
                        <TouchableOpacity
                          style={[styles.smallButton, { backgroundColor: theme.colors.primary }]}
                          onPress={() => handleAction('viewResults', quiz.quiz_id, quiz)}
                        >
                          <Ionicons name="document-text" size={14} color="#FFFFFF" />
                          <Text style={styles.smallButtonText}>Results</Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* STUDENT LOGIC: Missed quizzes - View Quiz button */}
                      {quiz.status === 'missed' && (
                        <TouchableOpacity
                          style={[styles.smallButton, { backgroundColor: '#1B4F5C' }]}
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
    </SafeAreaView>
  );
}

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
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    paddingRight: 12,
    paddingLeft: 12,
    gap: 1,
    paddingVertical: 2,
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    marginRight: 0,
    alignItems: 'center',
  },
  tabActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mobile Card Styles
  cardsContainer: {
    padding: 6,
    gap: 6,
  },
  card: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  cardContent: {
    gap: 5,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
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
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  attemptInfoText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
