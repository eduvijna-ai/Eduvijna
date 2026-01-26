/**
 * Mobile Dashboard Screen
 * ONLY renders UI - ALL logic comes from hooks
 */

import React, { Fragment } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useDashboard, useCurrentUser } from '@core/hooks/useDashboard';
import type { TeacherDashboardStats, StudentDashboardStats } from '@core/types';

export default function DashboardScreen() {
  const user = useCurrentUser();
  const { data, isLoading, error, refresh } = useDashboard();

  const handleRefresh = async () => {
    await refresh();
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.name}</Text>
      </View>

      {user?.role === 'instructor' ? (
        <TeacherDashboard data={data as TeacherDashboardStats} />
      ) : (
        <StudentDashboard data={data as StudentDashboardStats} />
      )}
    </ScrollView>
  );
}

function TeacherDashboard({ data }: { data: TeacherDashboardStats }) {
  return (
    <>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <StatCard title="Total Students" value={data.totalStudents.toString()} color="#3B82F6" />
        <StatCard title="Total Classes" value={data.totalClasses.toString()} color="#10B981" />
      </View>
      
      <View style={styles.statsContainer}>
        <StatCard title="Total Assessments" value={data.totalAssessments.toString()} color="#F59E0B" />
        <StatCard title="Active Now" value={data.activeAssessments.toString()} color="#EF4444" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Average Score</Text>
        <View style={styles.averageScoreCard}>
          <Text style={styles.averageScore}>{data.averageScore.toFixed(1)}%</Text>
        </View>
      </View>

      {/* Create Assessment Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create Assessment</Text>
        <View style={styles.createGrid}>
          {['Quiz', 'Exam', 'Assignment', 'Practice', 'Test', 'Survey'].map((type) => (
            <TouchableOpacity key={type} style={styles.createTile}>
              <Text style={styles.createTileText}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      {data.recentActivity && data.recentActivity.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {data.recentActivity.map((activity) => (
            <Fragment key={activity.id}>
              <View style={styles.activityItem}>
                <Text style={styles.activityMessage}>{activity.message}</Text>
                <Text style={styles.activityTime}>
                  {new Date(activity.timestamp).toLocaleString()}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
      )}
    </>
  );
}

function StudentDashboard({ data }: { data: StudentDashboardStats }) {
  return (
    <>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <StatCard title="Upcoming" value={data.scheduledAssessments.toString()} color="#3B82F6" />
        <StatCard title="Completed" value={data.completedAssessments.toString()} color="#10B981" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Average Score</Text>
        <View style={styles.averageScoreCard}>
          <Text style={styles.averageScore}>{data.averageScore.toFixed(1)}%</Text>
        </View>
      </View>

      {/* Weak Topics */}
      {data.weakTopics && data.weakTopics.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Topics to Improve</Text>
          {data.weakTopics.map((topic, index) => (
            <Fragment key={index}>
              <View style={styles.weakTopicCard}>
                <View style={styles.weakTopicHeader}>
                  <Text style={styles.weakTopicName}>{topic.topic}</Text>
                  <Text style={styles.weakTopicScore}>{topic.averageScore}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[styles.progressFill, { width: `${topic.averageScore}%` }]} 
                  />
                </View>
                <Text style={styles.weakTopicImprovement}>
                  Focus here to improve by {topic.improvementPercentage}%
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
      )}

      {/* Upcoming Assessments */}
      {data.upcomingAssessments && data.upcomingAssessments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Assessments</Text>
          {data.upcomingAssessments.map((assessment) => (
            <Fragment key={assessment.id}>
              <View style={styles.assessmentCard}>
                <Text style={styles.assessmentTitle}>{assessment.title}</Text>
                <Text style={styles.assessmentMeta}>
                  {assessment.duration} min • {assessment.totalMarks} marks
                </Text>
                {assessment.scheduledAt && (
                  <Text style={styles.assessmentDate}>
                    Starts: {new Date(assessment.scheduledAt).toLocaleString()}
                  </Text>
                )}
              </View>
            </Fragment>
          ))}
        </View>
      )}
    </>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  statTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  averageScoreCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  averageScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  createGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  createTile: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  createTileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  activityItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityMessage: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  weakTopicCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  weakTopicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weakTopicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  weakTopicScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EF4444',
  },
  weakTopicImprovement: {
    fontSize: 12,
    color: '#6B7280',
  },
  assessmentCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  assessmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  assessmentMeta: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  assessmentDate: {
    fontSize: 12,
    color: '#3B82F6',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
