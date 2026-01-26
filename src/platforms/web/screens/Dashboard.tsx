/**
 * Web Dashboard Screen
 * ONLY renders UI - ALL logic comes from hooks
 * Same hooks as mobile, different UI layout
 */

import React, { Fragment } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useDashboard, useCurrentUser } from '@core/hooks/useDashboard';
import type { TeacherDashboardStats, StudentDashboardStats } from '@core/types';

export default function DashboardScreen() {
  const user = useCurrentUser();
  const { data, isLoading, error, refresh } = useDashboard();

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data || isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {user?.role === 'instructor' ? (
          <TeacherDashboard data={data as TeacherDashboardStats} />
        ) : (
          <StudentDashboard data={data as StudentDashboardStats} />
        )}
      </View>
    </ScrollView>
  );
}

function TeacherDashboard({ data }: { data: TeacherDashboardStats }) {
  return (
    <>
      {/* Stats Grid - Wide layout for web */}
      <View style={styles.statsGrid}>
        <StatCard title="Total Students" value={data.totalStudents} color="#3B82F6" />
        <StatCard title="Total Classes" value={data.totalClasses} color="#10B981" />
        <StatCard title="Total Assessments" value={data.totalAssessments} color="#F59E0B" />
        <StatCard title="Active Assessments" value={data.activeAssessments} color="#EF4444" />
      </View>

      <View style={styles.row}>
        {/* Average Score */}
        <View style={[styles.card, styles.halfWidth]}>
          <Text style={styles.cardTitle}>Average Score</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.largeScore}>{data.averageScore.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Create Assessment */}
        <View style={[styles.card, styles.halfWidth]}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.createGrid}>
            {['Quiz', 'Exam', 'Assignment', 'Practice', 'Test', 'Survey'].map((type) => (
              <TouchableOpacity key={type} style={styles.actionButton}>
                <Text style={styles.actionButtonText}>+ {type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      {data.recentActivity && data.recentActivity.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            {data.recentActivity.map((activity) => (
              <Fragment key={activity.id}>
                <View style={styles.activityRow}>
                  <View style={styles.activityDot} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityMessage}>{activity.message}</Text>
                    <Text style={styles.activityTime}>
                      {new Date(activity.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </Fragment>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

function StudentDashboard({ data }: { data: StudentDashboardStats }) {
  return (
    <>
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard title="Upcoming Assessments" value={data.scheduledAssessments} color="#3B82F6" />
        <StatCard title="Completed Assessments" value={data.completedAssessments} color="#10B981" />
        <StatCard
          title="Average Score"
          value={`${data.averageScore.toFixed(1)}%`}
          color="#F59E0B"

        />
      </View>

      <View style={styles.row}>
        {/* Weak Topics */}
        {data.weakTopics && data.weakTopics.length > 0 && (
          <View style={[styles.card, styles.halfWidth]}>
            <Text style={styles.cardTitle}>Topics to Improve</Text>
            <View style={styles.topicsList}>
              {data.weakTopics.map((topic, index) => (
                <Fragment key={index}>
                  <View style={styles.topicItem}>
                    <View style={styles.topicHeader}>
                      <Text style={styles.topicName}>{topic.topic}</Text>
                      <Text style={styles.topicScore}>{topic.averageScore}%</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[styles.progressFill, { width: `${topic.averageScore}%` }]}
                      />
                    </View>
                    <Text style={styles.topicMeta}>
                      {topic.totalAttempts} attempts • Improve by {topic.improvementPercentage}%
                    </Text>
                  </View>
                </Fragment>
              ))}
            </View>
          </View>
        )}

        {/* Upcoming Assessments */}
        {data.upcomingAssessments && data.upcomingAssessments.length > 0 && (
          <View style={[styles.card, styles.halfWidth]}>
            <Text style={styles.cardTitle}>Upcoming Assessments</Text>
            <View style={styles.assessmentsList}>
              {data.upcomingAssessments.map((assessment) => (
                <Fragment key={assessment.id}>
                  <View style={styles.assessmentItem}>
                    <Text style={styles.assessmentTitle}>{assessment.title}</Text>
                    <Text style={styles.assessmentMeta}>
                      {assessment.duration} min • {assessment.totalMarks} marks
                    </Text>
                    {assessment.scheduledAt && (
                      <Text style={styles.assessmentDate}>
                        {new Date(assessment.scheduledAt).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </Fragment>
              ))}
            </View>
          </View>
        )}
      </View>
    </>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number | string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 32,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  halfWidth: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  largeScore: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  createGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  activityList: {
    gap: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginRight: 12,
    marginTop: 6,
  },
  activityContent: {
    flex: 1,
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
  topicsList: {
    gap: 16,
  },
  topicItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topicName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  topicScore: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EF4444',
  },
  topicMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  assessmentsList: {
    gap: 16,
  },
  assessmentItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  assessmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  assessmentMeta: {
    fontSize: 13,
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
    paddingHorizontal: 32,
    paddingVertical: 14,
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
