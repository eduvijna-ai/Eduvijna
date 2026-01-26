/**
 * Web Analytics Screen
 * ONLY renders UI - ALL logic comes from hooks
 * Same hooks as mobile, but wide charts and detailed tables for web
 */

import React, { Fragment, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useAnalytics, useWeakTopics, useStudentPerformance, useAssessmentStatistics, useCurrentUser, usePercentageColor } from '@core/hooks/useAnalytics';

export default function AnalyticsScreen() {
  const user = useCurrentUser();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');

  const filters = {
    dateFrom: getDateFrom(dateRange),
    dateTo: new Date().toISOString(),
  };

  const { isLoading, error, refresh } = useAnalytics(filters);

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refresh(filters)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <View style={styles.filters}>
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
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : user?.role === 'instructor' ? (
          <TeacherAnalytics filters={filters} />
        ) : (
          <StudentAnalytics filters={filters} />
        )}
      </View>
    </ScrollView>
  );
}

function TeacherAnalytics({ filters }: { filters: { dateFrom: string; dateTo: string } }) {
  const percentageColor = usePercentageColor();
  const { topPerformers, needsAttention } = useStudentPerformance(filters);
  const { statistics, summary } = useAssessmentStatistics(filters);

  return (
    <>
      {/* Summary Cards */}
      <View style={styles.statsGrid}>
        <StatCard title="Total Assessments" value={summary.totalAssessments.toString()} />
        <StatCard title="Total Attempts" value={summary.totalAttempts.toString()} />
        <StatCard
          title="Average Score"
          value={`${summary.overallAverageScore.toFixed(1)}%`}
          color={percentageColor(summary.overallAverageScore)}
        />
        <StatCard
          title="Pass Rate"
          value={`${summary.overallPassRate.toFixed(1)}%`}
          color={percentageColor(summary.overallPassRate)}
        />
      </View>

      <View style={styles.row}>
        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <View style={[styles.card, styles.halfWidth]}>
            <Text style={styles.cardTitle}>Top Performers</Text>
            <View style={styles.table}>
              {topPerformers.map((student) => (
                <Fragment key={student.studentId}>
                  <View style={styles.performanceRow}>
                    <Text style={styles.studentName}>{student.studentName}</Text>
                    <Text style={[styles.scoreValue, { color: percentageColor(student.averageScore) }]}>
                      {student.averageScore.toFixed(1)}%
                    </Text>
                  </View>
                </Fragment>
              ))}
            </View>
          </View>
        )}

        {/* Needs Attention */}
        {needsAttention.length > 0 && (
          <View style={[styles.card, styles.halfWidth]}>
            <Text style={styles.cardTitle}>Needs Attention</Text>
            <View style={styles.table}>
              {needsAttention.map((student) => (
                <Fragment key={student.studentId}>
                  <View style={styles.performanceRow}>
                    <Text style={styles.studentName}>{student.studentName}</Text>
                    <Text style={[styles.scoreValue, { color: '#EF4444' }]}>
                      {student.averageScore.toFixed(1)}%
                    </Text>
                  </View>
                </Fragment>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Assessment Statistics Table */}
      {statistics.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assessment Statistics</Text>
          <View style={styles.wideTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 3 }]}>Assessment</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Attempts</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Avg Score</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Highest</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Lowest</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Pass Rate</Text>
            </View>
            {statistics.map((stat) => (
              <Fragment key={stat.assessmentId}>
                <View style={styles.tableRow}>
                  <Text style={[styles.cellText, { flex: 3 }]}>{stat.assessmentTitle}</Text>
                  <Text style={[styles.cellText, { flex: 1 }]}>{stat.totalAttempts}</Text>
                  <Text style={[styles.cellText, { flex: 1, color: percentageColor(stat.averageScore) }]}>
                    {stat.averageScore.toFixed(1)}%
                  </Text>
                  <Text style={[styles.cellText, { flex: 1 }]}>{stat.highestScore}%</Text>
                  <Text style={[styles.cellText, { flex: 1 }]}>{stat.lowestScore}%</Text>
                  <Text style={[styles.cellText, { flex: 1, color: percentageColor(stat.passPercentage) }]}>
                    {stat.passPercentage.toFixed(1)}%
                  </Text>
                </View>
              </Fragment>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

function StudentAnalytics({ filters }: { filters: { dateFrom: string; dateTo: string } }) {
  const percentageColor = usePercentageColor();
  const { weakTopics } = useWeakTopics();
  const { data } = useAnalytics(filters);

  return (
    <>
      {/* Topic Performance Chart */}
      {data && data.topicAnalysis.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Performance by Topic</Text>
          <View style={styles.chartContainer}>
            {data.topicAnalysis.map((topic) => (
              <Fragment key={topic.topic}>
                <View style={styles.topicBar}>
                  <Text style={styles.topicLabel}>{topic.topic}</Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          width: `${topic.averageScore}%`,
                          backgroundColor: percentageColor(topic.averageScore),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{topic.averageScore.toFixed(0)}%</Text>
                </View>
              </Fragment>
            ))}
          </View>
        </View>
      )}

      {/* Weak Topics Detailed */}
      {weakTopics.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Areas for Improvement</Text>
          <View style={styles.weakTopicsGrid}>
            {weakTopics.map((topic, index) => (
              <Fragment key={index}>
                <View style={styles.weakTopicCard}>
                  <Text style={styles.weakTopicName}>{topic.topic}</Text>
                  <View style={styles.scoreCircle}>
                    <Text style={styles.scoreCircleText}>{topic.averageScore}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${topic.averageScore}%` }]} />
                  </View>
                  <Text style={styles.weakTopicMeta}>
                    {topic.totalAttempts} attempts
                  </Text>
                  <Text style={styles.weakTopicGoal}>
                    Goal: Improve by {topic.improvementPercentage}%
                  </Text>
                </View>
              </Fragment>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  filters: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
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
    marginBottom: 24,
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
  table: {
    gap: 8,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  studentName: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  wideTable: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E5E7EB',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cellText: {
    fontSize: 14,
    color: '#111827',
  },
  chartContainer: {
    gap: 16,
  },
  topicBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topicLabel: {
    width: 150,
    fontSize: 14,
    color: '#111827',
  },
  barContainer: {
    flex: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
  },
  barValue: {
    width: 60,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  weakTopicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  weakTopicCard: {
    width: '30%',
    backgroundColor: '#FEF2F2',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  weakTopicName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 12,
  },
  scoreCircle: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreCircleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  weakTopicMeta: {
    fontSize: 12,
    color: '#991B1B',
    marginBottom: 4,
  },
  weakTopicGoal: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 60,
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
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
