import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { useTeacherDashboard } from '@core/hooks/useTeacherDashboard';

interface Props {
  navigation?: any;
  onNavigate?: (screen: string, params?: any) => void;
}

export default function TeacherDashboard({ navigation, onNavigate }: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const {
    stats,
    weakStudents,
    recentAssessments,
    loading,
    error,
    refresh,
  } = useTeacherDashboard();

  const isWeb = width > 768;
  const isTablet = width > 600 && width <= 1024;

  const handleViewStudent = (studentId: number, studentName?: string) => {
    if (navigation) {
      navigation.navigate('StudentAnalytics', { studentId, studentName });
    } else if (onNavigate) {
      onNavigate('StudentAnalytics', { studentId, studentName });
    }
  };

  const handleViewQuiz = (quizId: number) => {
    if (navigation) {
      navigation.navigate('StudentList', { quizId });
    } else if (onNavigate) {
      onNavigate('StudentList', { quizId });
    }
  };

  if (loading && !stats) {
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
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      scrollEventThrottle={400}
      refreshControl={
        <RefreshControl 
          refreshing={loading} 
          onRefresh={refresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Summary Cards - 3 Tiles in One Row */}
      <View style={styles.summarySection}>
        <TouchableOpacity 
          style={[
            styles.summaryCard, 
            { backgroundColor: theme.colors.card },
          ]}
          onPress={() => {
            if (navigation) {
              navigation.navigate('ClassesList');
            } else if (onNavigate) {
              onNavigate('ClassesList');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="school" size={32} color="#F59E0B" />
          <Text style={[styles.summaryCardValue, { color: theme.colors.text }]}>
            {stats.total_classes}
          </Text>
          <Text style={[styles.summaryCardLabel, { color: theme.colors.textSecondary }]}>
            Total Classes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.summaryCard, 
            { backgroundColor: theme.colors.card },
          ]}
          onPress={() => {
            if (navigation) {
              navigation.navigate('Assessments', { filter: 'all' });
            } else if (onNavigate) {
              onNavigate('Assessments', { filter: 'all' });
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text" size={32} color="#3B82F6" />
          <Text style={[styles.summaryCardValue, { color: theme.colors.text }]}>
            {stats.total_assessments}
          </Text>
          <Text style={[styles.summaryCardLabel, { color: theme.colors.textSecondary }]}>
            Total Assessments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.summaryCard, 
            { backgroundColor: theme.colors.card },
          ]}
          onPress={() => {
            if (navigation) {
              navigation.navigate('Assessments', { filter: 'active' });
            } else if (onNavigate) {
              onNavigate('Assessments', { filter: 'active' });
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-done" size={32} color="#10B981" />
          <Text style={[styles.summaryCardValue, { color: theme.colors.text }]}>
            {stats.active_assessments}
          </Text>
          <Text style={[styles.summaryCardLabel, { color: theme.colors.textSecondary }]}>
            Ongoing Tests
          </Text>
        </TouchableOpacity>
      </View>

      {/* Two Column Layout for Web/Tablet */}
      <View style={[
        styles.bottomSection,
        (isWeb || isTablet) && styles.bottomSectionRow,
      ]}>
        {/* Weak Students */}
        <View style={[
          styles.section,
          (isWeb || isTablet) && styles.sectionHalf,
        ]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Weak Students
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {weakStudents.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No struggling students
                </Text>
              </View>
            ) : (
              weakStudents.slice(0, 5).map((student, index) => (
                <TouchableOpacity
                  key={student.student_id}
                  style={[
                    styles.listItem,
                    index < Math.min(weakStudents.length, 5) - 1 && { 
                      borderBottomWidth: 1, 
                      borderBottomColor: theme.colors.border 
                    },
                  ]}
                  onPress={() => handleViewStudent(student.student_id, student.student_fullname)}
                  activeOpacity={0.7}
                >
                  <View style={styles.studentInfo}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                      {student.avatar_url ? (
                        <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                          {student.student_fullname.charAt(0)}
                        </Text>
                      ) : (
                        <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                          {student.student_fullname.charAt(0)}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.studentName, { color: theme.colors.text }]}>
                      {student.student_fullname}
                    </Text>
                  </View>
                  <View style={styles.scoreContainer}>
                    <Text style={[styles.scoreText, { color: theme.colors.error }]}>
                      {student.average_score}%
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Recent Assessments */}
        <View style={[
          styles.section,
          (isWeb || isTablet) && styles.sectionHalf,
        ]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Recent Assessments
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {recentAssessments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No assessments yet
                </Text>
              </View>
            ) : (
              recentAssessments.slice(0, 5).map((quiz, index) => {
                const getStatusColor = () => {
                  if (quiz.availability_status === 'active') return '#10B981';
                  if (quiz.availability_status === 'expired') return '#EF4444';
                  return '#F59E0B';
                };
                
                const getStatusLabel = () => {
                  if (quiz.availability_status === 'active') return 'Active';
                  if (quiz.availability_status === 'expired') return 'Expired';
                  return 'Coming up';
                };
                
                return (
                  <TouchableOpacity
                    key={quiz.quiz_id}
                    style={[
                      styles.assessmentItem,
                      index < Math.min(recentAssessments.length, 5) - 1 && { 
                        borderBottomWidth: 1, 
                        borderBottomColor: theme.colors.border 
                      },
                    ]}
                    onPress={() => handleViewQuiz(quiz.quiz_id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.assessmentInfo}>
                      <View style={[styles.assessmentIcon, { backgroundColor: getStatusColor() + '20' }]}>
                        <Ionicons name="document-text" size={20} color={getStatusColor()} />
                      </View>
                      <Text style={[styles.assessmentName, { color: theme.colors.text }]} numberOfLines={1}>
                        {quiz.quiz_name}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor() + '20' }
                    ]}>
                      <Text style={[styles.statusText, { color: getStatusColor() }]}>
                        {getStatusLabel()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
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
    paddingVertical: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summarySection: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 100,
  },
  summaryCardLabel: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  summaryCardValue: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
  },
  section: {
    padding: 10,
  },
  sectionHalf: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  bottomSection: {
    gap: 0,
  },
  bottomSectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  card: {
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  assessmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  assessmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  assessmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  assessmentName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
