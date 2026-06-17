/**
 * Mobile Analytics Screen
 * ONLY renders UI - ALL logic comes from hooks
 */

import React, { Fragment, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAnalytics,
  useWeakTopics,
  useStudentPerformance,
  useAssessmentStatistics,
  useCurrentUser,
  usePercentageColor,
} from '@core/hooks/useAnalytics';
import { useTeacherTheme } from '../../../erp_schools/theme/useTeacherTheme';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const theme = useTeacherTheme();
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
      <View style={[styles.fill, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <View style={[styles.errorIconWrap, { backgroundColor: theme.colors.tintRed }]}>
            <Ionicons name="alert-circle-outline" size={36} color={theme.colors.danger} />
          </View>
          <Text style={[styles.errorTitle, { color: theme.colors.textPrimary }]}>Unable to Load</Text>
          <Text style={[styles.errorMsg, { color: theme.colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleRefresh}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Ionicons name="refresh-outline" size={16} color={theme.colors.textInverse} />
            <Text style={[styles.retryBtnText, { color: theme.colors.textInverse }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Date Range Filter */}
      <View
        style={[
          styles.filterBar,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
        ]}
      >
        {(['week', 'month', 'year'] as const).map((range) => {
          const active = dateRange === range;
          return (
            <TouchableOpacity
              key={range}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setDateRange(range)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={range}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? theme.colors.textInverse : theme.colors.textSecondary },
                ]}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {user?.role === 'instructor' ? (
        <TeacherAnalytics filters={filters} />
      ) : (
        <StudentAnalytics filters={filters} />
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function TeacherAnalytics({ filters }: { filters: { dateFrom: string; dateTo: string } }) {
  const theme = useTeacherTheme();
  const percentageColor = usePercentageColor();
  const { topPerformers, needsAttention, isLoading } = useStudentPerformance(filters);
  const { statistics, summary } = useAssessmentStatistics(filters);

  if (isLoading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.loadingIconWrap, { backgroundColor: theme.colors.tintTeal }]}>
          <Ionicons name="analytics-outline" size={32} color={theme.colors.primary} />
        </View>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading analytics…</Text>
      </View>
    );
  }

  return (
    <>
      {/* Overview Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="bar-chart-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Overview</Text>
        </View>
        <View style={styles.summaryGrid}>
          {[
            { label: 'Assessments', value: summary.totalAssessments.toString(), accent: 'teal' as const },
            { label: 'Total Attempts', value: summary.totalAttempts.toString(), accent: 'blue' as const },
            { label: 'Avg Score', value: `${summary.overallAverageScore.toFixed(1)}%`, accent: 'green' as const },
            { label: 'Pass Rate', value: `${summary.overallPassRate.toFixed(1)}%`, accent: 'orange' as const },
          ].map((item) => (
            <SummaryCard
              key={item.label}
              title={item.label}
              value={item.value}
              color={percentageColor(parseFloat(item.value))}
            />
          ))}
        </View>
      </View>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="trophy-outline" size={18} color={theme.colors.warning} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Top Performers</Text>
          </View>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            {topPerformers.map((student, index) => (
              <Fragment key={student.studentId}>
                <View
                  style={[
                    styles.performanceRow,
                    index < topPerformers.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={[styles.rankBadge, { backgroundColor: theme.colors.tintOrange }]}>
                    <Text style={[styles.rankText, { color: theme.colors.onTintOrange }]}>#{index + 1}</Text>
                  </View>
                  <View style={styles.performanceInfo}>
                    <Text style={[styles.performanceName, { color: theme.colors.textPrimary }]}>
                      {student.studentName}
                    </Text>
                    <Text style={[styles.performanceMeta, { color: theme.colors.textSecondary }]}>
                      {student.totalAssessments} assessments · {student.trend}
                    </Text>
                  </View>
                  <Text style={[styles.performanceScore, { color: percentageColor(student.averageScore) }]}>
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
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="warning-outline" size={18} color={theme.colors.danger} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Needs Attention</Text>
          </View>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            {needsAttention.map((student, index) => (
              <Fragment key={student.studentId}>
                <View
                  style={[
                    styles.performanceRow,
                    index < needsAttention.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={[styles.rankBadge, { backgroundColor: theme.colors.tintRed }]}>
                    <Ionicons name="alert-outline" size={14} color={theme.colors.danger} />
                  </View>
                  <View style={styles.performanceInfo}>
                    <Text style={[styles.performanceName, { color: theme.colors.textPrimary }]}>
                      {student.studentName}
                    </Text>
                    <Text style={[styles.performanceMeta, { color: theme.colors.textSecondary }]}>
                      {student.totalAssessments} assessments · {student.trend}
                    </Text>
                  </View>
                  <Text style={[styles.performanceScore, { color: theme.colors.danger }]}>
                    {student.averageScore.toFixed(1)}%
                  </Text>
                </View>
              </Fragment>
            ))}
          </View>
        </View>
      )}

      {/* Assessment Statistics */}
      {statistics.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Assessment Stats</Text>
          </View>
          {statistics.slice(0, 5).map((stat) => (
            <Fragment key={stat.assessmentId}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.statCardTitle, { color: theme.colors.textPrimary }]}>
                  {stat.assessmentTitle}
                </Text>
                <View style={styles.statRow}>
                  {[
                    { label: 'Attempts', value: stat.totalAttempts.toString(), color: undefined },
                    { label: 'Avg Score', value: `${stat.averageScore.toFixed(1)}%`, color: percentageColor(stat.averageScore) },
                    { label: 'Pass Rate', value: `${stat.passPercentage.toFixed(1)}%`, color: percentageColor(stat.passPercentage) },
                  ].map((metric) => (
                    <View key={metric.label} style={styles.statMetric}>
                      <Text style={[styles.statMetricLabel, { color: theme.colors.textSecondary }]}>
                        {metric.label}
                      </Text>
                      <Text
                        style={[
                          styles.statMetricValue,
                          { color: metric.color ?? theme.colors.textPrimary },
                        ]}
                      >
                        {metric.value}
                      </Text>
                    </View>
                  ))}
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
  const theme = useTeacherTheme();
  const percentageColor = usePercentageColor();
  const { weakTopics, isLoading: weakLoading } = useWeakTopics();
  const { data, isLoading: analyticsLoading } = useAnalytics(filters);

  const isLoading = weakLoading || analyticsLoading;

  if (isLoading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.loadingIconWrap, { backgroundColor: theme.colors.tintTeal }]}>
          <Ionicons name="analytics-outline" size={32} color={theme.colors.primary} />
        </View>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading analytics…</Text>
      </View>
    );
  }

  return (
    <>
      {/* Topic Performance */}
      {data && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="podium-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Topic Performance</Text>
          </View>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            {data.topicAnalysis.slice(0, 5).map((topic) => (
              <Fragment key={topic.topic}>
                <View style={styles.topicRow}>
                  <Text style={[styles.topicName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {topic.topic}
                  </Text>
                  <View style={[styles.topicBarTrack, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <View
                      style={[
                        styles.topicBarFill,
                        {
                          width: `${topic.averageScore}%` as `${number}%`,
                          backgroundColor: percentageColor(topic.averageScore),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.topicScore, { color: percentageColor(topic.averageScore) }]}>
                    {topic.averageScore.toFixed(0)}%
                  </Text>
                </View>
              </Fragment>
            ))}
          </View>
        </View>
      )}

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="trending-down-outline" size={18} color={theme.colors.danger} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Topics to Improve</Text>
          </View>
          {weakTopics.map((topic, index) => (
            <Fragment key={index}>
              <View
                style={[
                  styles.weakTopicCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.weakTopicHeader}>
                  <Text style={[styles.weakTopicName, { color: theme.colors.textPrimary }]}>{topic.topic}</Text>
                  <View style={[styles.weakScorePill, { backgroundColor: theme.colors.tintRed }]}>
                    <Text style={[styles.weakScorePillText, { color: theme.colors.danger }]}>
                      {topic.averageScore}%
                    </Text>
                  </View>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: theme.colors.tintRed }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${topic.averageScore}%` as `${number}%`, backgroundColor: theme.colors.danger },
                    ]}
                  />
                </View>
                <View style={styles.weakTopicFooter}>
                  <Text style={[styles.weakTopicMeta, { color: theme.colors.textSecondary }]}>
                    {topic.totalAttempts} attempts
                  </Text>
                  <Text style={[styles.weakTopicImprove, { color: theme.colors.warning }]}>
                    +{topic.improvementPercentage}% to improve
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
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="analytics-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Recent Performance</Text>
          </View>
          {data.studentPerformance.slice(0, 5).map((performance) => (
            <Fragment key={performance.studentId}>
              <View
                style={[
                  styles.perfHistCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.perfHistText, { color: theme.colors.textSecondary }]}>
                  {performance.totalAssessments} assessments completed
                </Text>
                {[
                  { label: 'Average', value: `${performance.averageScore.toFixed(1)}%`, color: percentageColor(performance.averageScore) },
                  { label: 'Highest', value: `${performance.highestScore}%`, color: undefined },
                ].map((row) => (
                  <View key={row.label} style={styles.perfHistRow}>
                    <Text style={[styles.perfHistLabel, { color: theme.colors.textSecondary }]}>{row.label}</Text>
                    <Text style={[styles.perfHistValue, { color: row.color ?? theme.colors.textPrimary }]}>{row.value}</Text>
                  </View>
                ))}
                <View style={[styles.trendPill, { backgroundColor: theme.colors.surfaceAlt }]}>
                  <Ionicons
                    name={performance.trend === 'up' ? 'trending-up-outline' : performance.trend === 'down' ? 'trending-down-outline' : 'remove-outline'}
                    size={13}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.trendPillText, { color: theme.colors.textSecondary }]}>
                    Trend: {performance.trend}
                  </Text>
                </View>
              </View>
            </Fragment>
          ))}
        </View>
      )}
    </>
  );
}

function SummaryCard({ title, value, color }: { title: string; value: string; color?: string }) {
  const theme = useTeacherTheme();
  return (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.summaryValue, { color: color ?? theme.colors.primary }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{title}</Text>
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
  fill: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  errorMsg: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { fontSize: 15, fontWeight: '600' },

  filterBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: (width - 42) / 2,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryValue: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center' },

  performanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rankBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '700' },
  performanceInfo: { flex: 1 },
  performanceName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  performanceMeta: { fontSize: 12, lineHeight: 16 },
  performanceScore: { fontSize: 16, fontWeight: '800' },

  statCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  statRow: { flexDirection: 'row', gap: 16 },
  statMetric: { flex: 1 },
  statMetricLabel: { fontSize: 11, marginBottom: 3 },
  statMetricValue: { fontSize: 15, fontWeight: '700' },

  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  topicName: { width: 100, fontSize: 13, fontWeight: '500' },
  topicBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  topicBarFill: { height: '100%', borderRadius: 4 },
  topicScore: { width: 40, fontSize: 13, fontWeight: '700', textAlign: 'right' },

  weakTopicCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weakTopicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  weakTopicName: { fontSize: 14, fontWeight: '700', flex: 1 },
  weakScorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  weakScorePillText: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  weakTopicFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  weakTopicMeta: { fontSize: 12 },
  weakTopicImprove: { fontSize: 12, fontWeight: '600' },

  perfHistCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  perfHistText: { fontSize: 13, marginBottom: 8 },
  perfHistRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  perfHistLabel: { fontSize: 13 },
  perfHistValue: { fontSize: 13, fontWeight: '700' },
  trendPill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  trendPillText: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },

  loadingWrap: { padding: 48, alignItems: 'center', gap: 12 },
  loadingIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, fontWeight: '500' },
});
