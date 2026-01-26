/**
 * StudentList Screen - Optimized for On-Demand Loading
 * 
 * Loads student data only when screen opens using loadStudentListForClass()
 * Uses cached data on subsequent visits
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
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { useTeacherDashboard } from '@core/hooks/useTeacherDashboard';

type Props = {
  navigation?: any;
  route?: any;
};

interface StudentData {
  student_id: number;
  student_fullname: string;
  student_username: string;
  quizzes_completed: number;
  average_score: number;
  total_quizzes: number;
}

export default function StudentList({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { loadStudentListForClass, classrooms } = useTeacherDashboard();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'completion'>('name');
  const [loadedClassrooms, setLoadedClassrooms] = useState<Set<string>>(new Set());

  const isWeb = width > 768;

  useEffect(() => {
    loadAllStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sortBy, students]);

  const loadAllStudents = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const allStudents: StudentData[] = [];
      
      // Load students from all classrooms
      for (const classroom of classrooms) {
        // Skip if already loaded (unless force refresh)
        if (!forceRefresh && loadedClassrooms.has(classroom.classroom_id)) {
          continue;
        }
        
        // Load from API
        const classroomStudents = await loadStudentListForClass(classroom.classroom_id);
        
        if (classroomStudents && classroomStudents.length > 0) {
          allStudents.push(...classroomStudents);
          setLoadedClassrooms(prev => new Set(prev).add(classroom.classroom_id));
        }
      }
      
      // Merge with existing students if not force refresh
      const allStudentsData = forceRefresh ? allStudents : [...students, ...allStudents];
      
      // Remove duplicates (students in multiple classrooms)
      const uniqueStudents = Array.from(
        new Map(allStudentsData.map(s => [s.student_id, s])).values()
      );
      
      setStudents(uniqueStudents);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
          return (b.average_score || 0) - (a.average_score || 0);
        case 'completion':
          return (b.quizzes_completed || 0) - (a.quizzes_completed || 0);
        default:
          return 0;
      }
    });
    
    setFilteredStudents(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setLoadedClassrooms(new Set()); // Clear cache
    await loadAllStudents(true); // Force refresh
  };

  const handleStudentPress = (student: StudentData) => {
    console.log('View student:', student.student_id);
    // TODO: Navigate to student analytics screen
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

  const renderStudentCard = ({ item }: { item: StudentData }) => {
    const performanceColor = getPerformanceColor(item.average_score || 0);
    
    return (
      <TouchableOpacity
        style={[
          styles.studentCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          isWeb && styles.studentCardWeb,
        ]}
        onPress={() => handleStudentPress(item)}
        activeOpacity={0.7}
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
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color={theme.colors.success} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {item.quizzes_completed || 0} completed
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <View style={[styles.scoreBadge, { backgroundColor: performanceColor + '20' }]}>
            <Text style={[styles.scoreText, { color: performanceColor }]}>
              {Math.round(item.average_score || 0)}%
            </Text>
          </View>
          <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>Avg Score</Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Student Count */}
        <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
          Showing {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
        </Text>
      </View>

      {/* Student List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
        <FlatList
          data={filteredStudents}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  countText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  studentInfo: {
    flex: 1,
    gap: 4,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  studentEmail: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
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
  scoreContainer: {
    alignItems: 'center',
    gap: 4,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 11,
  },
});
