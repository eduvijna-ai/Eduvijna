/**
 * Mobile Analytics Screen
 * ONLY renders UI - ALL logic comes from hooks
 */

import React, { Fragment, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, RefreshControl, TouchableOpacity } from 'react-native';
import { useAnalytics, useWeakTopics, useStudentPerformance, useAssessmentStatistics, useCurrentUser, usePercentageColor } from '@core/hooks/useAnalytics';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const user = useCurrentUser();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');

  const filters = {
    dateFrom: getDateFrom(dateRange),
    dateTo: new Date().toISOString(),
  };

  const { isLoading, error, refresh } = useAnalytics(filters);

  const handleRefresh = async () => {
    await refresh(filters);
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
      }
    >
      {/* Date Range Filter */}
      <View style={styles.filterContainer}>
        {(['week', 'month', 'year'] as const).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.filterButton,
              dateRange === range && styles.filterButtonActive,
            ]}
            onPress={() => setDateRange(range)}
          >
            <Text
              style={[
                styles.filterButtonText,
                dateRange === range && styles.filterButtonTextActive,
              ]}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {user?.role === 'instructor' ? (
        <TeacherAnalytics filters={filters} />
      ) : (
        <StudentAnalytics filters={filters} />
      )}
    </ScrollView>
  );
}

function TeacherAnalytics({ filters }: { filters: { dateFrom: string; dateTo: string } }) {
  const percentageColor = usePercentageColor();
  const { topPerformers, needsAttention, isLoading } = useStudentPerformance(filters);
  const { statistics, summary } = useAssessmentStatistics(filters);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <>
      {/* Summary Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.summaryGrid}>
          <SummaryCard title="Assessments" value={summary.totalAssessments.toString()} />
          <SummaryCard title="Total Attempts" value={summary.totalAttempts.toString()} />
          <SummaryCard
            title="Avg Score"
            value={`${summary.overallAverageScore.toFixed(1)}%`}
            color={percentageColor(summary.overallAverageScore)}
          />
          <SummaryCard
            title="Pass Rate"
            value={`${summary.overallPassRate.toFixed(1)}%`}
            color={percentageColor(summary.overallPassRate)}
          />
        </View>
      </View>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performers</Text>
          {topPerformers.map((student) => (
            <Fragment key={student.studentId}>
              <View style={styles.performanceCard}>
                <View style={styles.performanceHeader}>
                  <Text style={styles.studentName}>{student.studentName}</Text>
                  <Text style={[styles.scoreText, { color: percentageColor(student.averageScore) }]}>
                    {student.averageScore.toFixed(1)}%
                  </Text>
                </View>
                <Text style={styles.performanceMeta}>
                  {student.totalAssessments} assessments • Trend: {student.trend}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
      )}

      {/* Students Needing Attention */}
      {needsAttention.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Needs Attention</Text>
          {needsAttention.map((student) => (
            <Fragment key={student.studentId}>
              <View style={styles.performanceCard}>
                <View style={styles.performanceHeader}>
                  <Text style={styles.studentName}>{student.studentName}</Text>
                  <Text style={[styles.scoreText, { color: '#EF4444' }]}>
                    {student.averageScore.toFixed(1)}%
                  </Text>
                </View>
                <Text style={styles.performanceMeta}>
                  {student.totalAssessments} assessments • Trend: {student.trend}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
      )}

      {/* Assessment Statistics */}
      {statistics.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assessment Statistics</Text>
          {statistics.slice(0, 5).map((stat) => (
            <Fragment key={stat.assessmentId}>
              <View style={styles.statCard}>
                <Text style={styles.statTitle}>{stat.assessmentTitle}</Text>
                <View style={styles.statGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Attempts</Text>
                    <Text style={styles.statValue}>{stat.totalAttempts}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Avg Score</Text>
                    <Text style={[styles.statValue, { color: percentageColor(stat.averageScore) }]}>
                      {stat.averageScore.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Pass Rate</Text>
                    <Text style={[styles.statValue, { color: percentageColor(stat.passPercentage) }]}>
                      {stat.passPercentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            </Fragment>
          ))}
        </View>
      )}
    </>
  );
}

function StudentAnalytics({ filters }: { filters: { dateFrom: string; dateTo: string } }) {
  const percentageColor = usePercentageColor();
  const { weakTopics, isLoading: weakLoading } = useWeakTopics();
  const { data, isLoading: analyticsLoading } = useAnalytics(filters);

  const isLoading = weakLoading || analyticsLoading;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <>
      {/* Performance Summary */}
      {data && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Summary</Text>
          <View style={styles.performanceChart}>
            {data.topicAnalysis.slice(0, 5).map((topic) => (
              <Fragment key={topic.topic}>
                <View style={styles.topicRow}>
                  <Text style={styles.topicName}>{topic.topic}</Text>
                  <View style={styles.topicBarContainer}>
                    <View
                      style={[
                        styles.topicBar,
                        {
                          width: `${topic.averageScore}%`,
                          backgroundColor: percentageColor(topic.averageScore),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.topicScore}>{topic.averageScore.toFixed(0)}%</Text>
                </View>
              </Fragment>
            ))}
          </View>
        </View>
      )}

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Topics to Improve</Text>
          {weakTopics.map((topic, index) => (
            <Fragment key={index}>
              <View style={styles.weakTopicCard}>
                <View style={styles.weakTopicHeader}>
                  <Text style={styles.weakTopicName}>{topic.topic}</Text>
                  <Text style={styles.weakTopicScore}>{topic.averageScore}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${topic.averageScore}%` }]} />
                </View>
                <View style={styles.weakTopicFooter}>
                  <Text style={styles.weakTopicAttempts}>{topic.totalAttempts} attempts</Text>
                  <Text style={styles.weakTopicImprovement}>
                    Improve by {topic.improvementPercentage}%
                  </Text>
                </View>
              </View>
            </Fragment>
          ))}
        </View>
      )}

      {/* Recent Performance */}
      {data && data.studentPerformance.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Performance</Text>
          {data.studentPerformance.slice(0, 5).map((performance) => (
            <Fragment key={performance.studentId}>
              <View style={styles.performanceHistoryCard}>
                <Text style={styles.performanceText}>
                  {performance.totalAssessments} assessments completed
                </Text>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Average:</Text>
                  <Text style={[styles.scoreValue, { color: percentageColor(performance.averageScore) }]}>
                    {performance.averageScore.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Highest:</Text>
                  <Text style={styles.scoreValue}>{performance.highestScore}%</Text>
                </View>
                <Text style={styles.trendText}>Trend: {performance.trend}</Text>
              </View>
            </Fragment>
          ))}
        </View>
      )}
    </>
  );
}

function SummaryCard({ title, value, color }: { title: string; value: string; color?: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue} {...(color && { style: { color } })}>
        {value}
      </Text>
      <Text style={styles.summaryTitle}>{title}</Text>
    </View>
  );
}

function getDateFrom(range: 'week' | 'month' | 'year'): string {
  const now = new Date();
  switch (range) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
  }
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  performanceMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  performanceChart: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  topicName: {
    width: 100,
    fontSize: 13,
    color: '#111827',
  },
  topicBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  topicBar: {
    height: '100%',
  },
  topicScore: {
    width: 45,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  weakTopicScore: {
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
  weakTopicFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weakTopicAttempts: {
    fontSize: 12,
    color: '#6B7280',
  },
  weakTopicImprovement: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  performanceHistoryCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  performanceText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  trendText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
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
});
