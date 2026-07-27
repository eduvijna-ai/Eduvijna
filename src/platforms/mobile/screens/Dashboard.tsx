/**
 * Mobile Dashboard Screen
 * ONLY renders UI - ALL logic comes from hooks
 */

import React, { Fragment } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard, useCurrentUser } from '@core/hooks/useDashboard';
import type { TeacherDashboardStats, StudentDashboardStats } from '@core/types';
import { getDisplayName } from '@core/types';
import { useTeacherTheme } from '../../../erp_schools/theme/useTeacherTheme';

export default function DashboardScreen() {
  const theme = useTeacherTheme();
  const user = useCurrentUser();
  const { data, isLoading, error, refresh } = useDashboard();

  const handleRefresh = async () => {
    await refresh();
  };

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.errorIconWrap, { backgroundColor: theme.colors.tintRed }]}>
          <Ionicons name="alert-circle-outline" size={32} color={theme.colors.danger} />
        </View>
        <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handleRefresh}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={[styles.retryBtnText, { color: theme.colors.textInverse }]}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.loadingIconWrap, { backgroundColor: theme.colors.tintTeal }]}>
          <Ionicons name="analytics-outline" size={32} color={theme.colors.primary} />
        </View>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading dashboard…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.greeting, { color: 'rgba(255,255,255,0.80)' }]}>Welcome back,</Text>
        <Text style={[styles.userName, { color: theme.colors.textInverse }]}>
          {getDisplayName(user)} 👋
        </Text>
      </View>

      {user?.role === 'instructor' ? (
        <TeacherDashboard data={data as TeacherDashboardStats} />
      ) : (
        <StudentDashboard data={data as StudentDashboardStats} />
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function TeacherDashboard({ data }: { data: TeacherDashboardStats }) {
  const theme = useTeacherTheme();
  return (
    <>
      <View style={styles.statsGrid}>
        {[
          { title: 'Students', value: data.totalStudents.toString(), icon: 'people-outline' as const, accent: 'teal' as const },
          { title: 'Classes', value: data.totalClasses.toString(), icon: 'book-outline' as const, accent: 'blue' as const },
          { title: 'Assessments', value: data.totalAssessments.toString(), icon: 'document-text-outline' as const, accent: 'orange' as const },
          { title: 'Active Now', value: data.activeAssessments.toString(), icon: 'checkmark-done-outline' as const, accent: 'green' as const },
        ].map((item) => (
          <StatCard
            key={item.title}
            title={item.title}
            value={item.value}
            icon={item.icon}
            accent={item.accent}
          />
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="podium-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Average Score</Text>
        </View>
        <View
          style={[
            styles.bigScoreCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.bigScore, { color: theme.colors.primary }]}>{data.averageScore.toFixed(1)}%</Text>
          <Text style={[styles.bigScoreLabel, { color: theme.colors.textSecondary }]}>Class Average</Text>
        </View>
      </View>

      {data.recentActivity && data.recentActivity.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Recent Activity</Text>
          </View>
          {data.recentActivity.map((activity) => (
            <Fragment key={activity.id}>
              <View
                style={[
                  styles.activityItem,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.activityMessage, { color: theme.colors.textPrimary }]}>
                  {activity.message}
                </Text>
                <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>
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
  const theme = useTeacherTheme();
  return (
    <>
      <View style={styles.statsGrid}>
        {[
          { title: 'Upcoming', value: data.scheduledAssessments.toString(), icon: 'calendar-outline' as const, accent: 'blue' as const },
          { title: 'Completed', value: data.completedAssessments.toString(), icon: 'checkmark-circle-outline' as const, accent: 'green' as const },
        ].map((item) => (
          <StatCard key={item.title} title={item.title} value={item.value} icon={item.icon} accent={item.accent} />
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="podium-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Average Score</Text>
        </View>
        <View
          style={[
            styles.bigScoreCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.bigScore, { color: theme.colors.primary }]}>{data.averageScore.toFixed(1)}%</Text>
          <Text style={[styles.bigScoreLabel, { color: theme.colors.textSecondary }]}>Your Average</Text>
        </View>
      </View>

      {data.weakTopics && data.weakTopics.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="trending-down-outline" size={18} color={theme.colors.danger} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Topics to Improve</Text>
          </View>
          {data.weakTopics.map((topic, index) => (
            <Fragment key={index}>
              <View
                style={[
                  styles.weakCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.weakHeader}>
                  <Text style={[styles.weakName, { color: theme.colors.textPrimary }]}>{topic.topic}</Text>
                  <View style={[styles.weakScorePill, { backgroundColor: theme.colors.tintRed }]}>
                    <Text style={[styles.weakScoreText, { color: theme.colors.danger }]}>{topic.averageScore}%</Text>
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
                <Text style={[styles.weakHint, { color: theme.colors.textSecondary }]}>
                  Focus here to improve by {topic.improvementPercentage}%
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
      )}

      {data.upcomingAssessments && data.upcomingAssessments.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Upcoming Assessments</Text>
          </View>
          {data.upcomingAssessments.map((assessment) => (
            <Fragment key={assessment.id}>
              <View
                style={[
                  styles.assessmentCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.assessmentTitle, { color: theme.colors.textPrimary }]}>
                  {assessment.title}
                </Text>
                <Text style={[styles.assessmentMeta, { color: theme.colors.textSecondary }]}>
                  {assessment.duration} min · {assessment.totalMarks} marks
                </Text>
                {assessment.scheduledAt && (
                  <Text style={[styles.assessmentDate, { color: theme.colors.textSecondary }]}>
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

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent: 'teal' | 'blue' | 'green' | 'orange' | 'purple' | 'red';
}) {
  const theme = useTeacherTheme();
  const accentMap = {
    teal: { bg: theme.colors.tintTeal, fg: theme.colors.onTintTeal },
    blue: { bg: theme.colors.tintBlue, fg: theme.colors.onTintBlue },
    green: { bg: theme.colors.tintGreen, fg: theme.colors.onTintGreen },
    orange: { bg: theme.colors.tintOrange, fg: theme.colors.onTintOrange },
    purple: { bg: theme.colors.tintPurple, fg: theme.colors.onTintPurple },
    red: { bg: theme.colors.tintRed, fg: theme.colors.onTintRed },
  };
  const { bg, fg } = accentMap[accent];
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={fg} />
      </View>
      <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  errorIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { fontSize: 15, fontWeight: '600' },
  loadingIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, fontWeight: '500' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  greeting: { fontSize: 16, marginBottom: 4, fontWeight: '500' },
  userName: { fontSize: 28, fontWeight: '800', lineHeight: 34 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 26, fontWeight: '800' },
  statTitle: { fontSize: 12, fontWeight: '500', textAlign: 'center' },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  bigScoreCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  bigScore: { fontSize: 52, fontWeight: '800' },
  bigScoreLabel: { fontSize: 13, marginTop: 4 },

  activityItem: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 8,
  },
  activityMessage: { fontSize: 14, marginBottom: 4 },
  activityTime: { fontSize: 12 },

  weakCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  weakHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  weakName: { fontSize: 14, fontWeight: '700', flex: 1 },
  weakScorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  weakScoreText: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  weakHint: { fontSize: 12 },

  assessmentCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  assessmentTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  assessmentMeta: { fontSize: 12, marginBottom: 2 },
  assessmentDate: { fontSize: 12 },
});
