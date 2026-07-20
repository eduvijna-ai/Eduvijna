/**
 * Student My Analytics Screen — mirrors Quiz-React StudentAnalyticsPage (/student-analytics)
 * API: GET /api/v1/dashboard/quizzes?view_type=student_total_details
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@context/ThemeContext';
import AnalyticsKPIGrid from '../components/analytics/AnalyticsKPIGrid';
import AnalyticsDateFilter from '../components/analytics/AnalyticsDateFilter';
import AnalyticsPagination from '../components/analytics/AnalyticsPagination';
import AnalyticsStatusChips, { type StatusFilterKey } from '../components/analytics/AnalyticsStatusChips';
import QuizAttemptDetailModal from '../components/analytics/QuizAttemptDetailModal';
import {
  getQuizAnalytics,
  aggregateClassOverview,
  extractStatusSummary,
  generateInsights,
  generateQuizSummary,
} from '../core/services/quizAnalyticsApi';
import type { ClassOverview, QuizListItem } from '../core/types/quizAnalytics.types';
import {
  generateStudentKPITiles,
  getDefaultDateRange,
  formatDate,
  formatDuration,
  scoreColor,
} from '../core/utils/analyticsUiUtils';

type DrillLevel = 'overview' | 'class';

const ITEMS_PER_PAGE = 10;

function getStudentQuizStatus(quiz: QuizListItem): string {
  if (quiz.best_score !== null || quiz.latest_score !== null) return 'completed';
  if (quiz.availability_status === 'expired') return 'missed';
  if (quiz.availability_status === 'active') return 'pending';
  return quiz.availability_status || 'pending';
}

export default function QuizStudentMyAnalyticsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const defaultDates = getDefaultDateRange();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<QuizListItem[]>([]);
  const [startDate, setStartDate] = useState(defaultDates.from);
  const [endDate, setEndDate] = useState(defaultDates.to);
  const [appliedStart, setAppliedStart] = useState(defaultDates.from);
  const [appliedEnd, setAppliedEnd] = useState(defaultDates.to);
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('overview');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>(null);
  const [page, setPage] = useState(1);
  const [popup, setPopup] = useState({
    visible: false,
    quizName: '',
    score: null as number | null,
    timeSpent: null as number | null,
    logData: null as string | null,
    submittedAt: null as string | null,
  });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getQuizAnalytics({
        view_type: 'student_total_details',
        limit: 100,
        offset: 0,
        created_from: appliedStart,
        created_to: appliedEnd,
      });
      setRawData(res.data ?? []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedStart, appliedEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const classOverviews = useMemo(() => aggregateClassOverview(rawData), [rawData]);
  const kpiTiles = useMemo(() => generateStudentKPITiles(rawData), [rawData]);

  const filteredQuizzes = useMemo(() => {
    let items = selectedClass ? rawData.filter((q) => q.classroom_id === selectedClass) : rawData;
    if (statusFilter && statusFilter !== 'total') {
      items = items.filter((q) => {
        const st = getStudentQuizStatus(q);
        if (statusFilter === 'active') return q.availability_status === 'active';
        return st === statusFilter;
      });
    }
    return items;
  }, [rawData, selectedClass, statusFilter]);

  const statusSummary = useMemo(() => {
    const base = extractStatusSummary(rawData, selectedClass ?? undefined);
    return { ...base, total: filteredQuizzes.length };
  }, [rawData, selectedClass, filteredQuizzes.length]);

  const insights = useMemo(
    () => generateInsights(rawData, 'student', selectedClass ?? undefined),
    [rawData, selectedClass],
  );

  const totalClassPages = Math.max(1, Math.ceil(classOverviews.length / ITEMS_PER_PAGE));
  const totalQuizPages = Math.max(1, Math.ceil(filteredQuizzes.length / ITEMS_PER_PAGE));

  const paginatedClasses = classOverviews.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const paginatedQuizzes = filteredQuizzes.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleApplyDates = () => {
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
    setPage(1);
  };

  const handleClearDates = () => {
    const d = getDefaultDateRange();
    setStartDate(d.from);
    setEndDate(d.to);
    setAppliedStart(d.from);
    setAppliedEnd(d.to);
    setPage(1);
  };

  const handleStartQuiz = (quiz: QuizListItem) => {
    if (!quiz.session_id) return;
    navigation.navigate('QuizTakingScreen', {
      quizId: quiz.quiz_id,
      sessionId: quiz.session_id,
      classroomId: quiz.classroom_id,
    });
  };

  const renderClassCard = (cls: ClassOverview) => (
    <TouchableOpacity
      key={cls.classroom_id}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        setSelectedClass(cls.classroom_id);
        setSelectedClassName(cls.classroom_name);
        setDrillLevel('class');
        setPage(1);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.classIcon, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="book-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{cls.classroom_name}</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{cls.total_quizzes} quizzes</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.metricsRow}>
        <MetricPill label="Avg" value={`${Math.round(cls.avg_score)}%`} color={scoreColor(cls.avg_score)} />
        <MetricPill label="Done" value={String(cls.completed_count)} color="#059669" />
        <MetricPill label="Pending" value={String(cls.pending_count)} color="#d97706" />
      </View>
    </TouchableOpacity>
  );

  const renderQuizRow = (quiz: QuizListItem) => {
    const status = getStudentQuizStatus(quiz);
    const score = quiz.best_score ?? quiz.latest_score ?? quiz.score;
    const summary = generateQuizSummary({
      quiz_id: quiz.quiz_id,
      quiz_name: quiz.quiz_name,
      topic: quiz.topic,
      status: status as any,
      score,
      time_spent_seconds: quiz.time_spent_seconds,
      attempts: quiz.student_attempts ?? 0,
      submitted_at: quiz.submitted_at,
      best_score: quiz.best_score,
      log_data: quiz.log_data,
      summary: '',
    });

    const canStart = status === 'pending' && quiz.availability_status === 'active' && quiz.session_id;
    const canView = status === 'completed' && quiz.log_data;

    return (
      <View key={quiz.quiz_id} style={[styles.quizRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.quizName, { color: colors.text }]} numberOfLines={2}>{quiz.quiz_name}</Text>
          <Text style={[styles.quizMeta, { color: colors.textSecondary }]}>
            {quiz.classroom_name} · Due {formatDate(quiz.due_date)}
          </Text>
          <Text style={[styles.quizSummary, { color: colors.textSecondary }]}>{summary}</Text>
        </View>
        <View style={styles.quizActions}>
          {score !== null ? (
            <Text style={[styles.scoreText, { color: scoreColor(score) }]}>{score}%</Text>
          ) : null}
          {canView ? (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.primary }]}
              onPress={() =>
                setPopup({
                  visible: true,
                  quizName: quiz.quiz_name,
                  score,
                  timeSpent: quiz.time_spent_seconds,
                  logData: quiz.log_data,
                  submittedAt: quiz.submitted_at,
                })
              }
            >
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>View</Text>
            </TouchableOpacity>
          ) : null}
          {canStart ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => handleStartQuiz(quiz)}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Start</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your analytics…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.heroTitle, { color: colors.text }]}>My Quiz Analytics</Text>
        <Text style={[styles.heroSub, { color: colors.textSecondary }]}>Track your performance across classes</Text>
      </View>

      <AnalyticsDateFilter
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
        onApply={handleApplyDates}
        onClear={handleClearDates}
        onRefresh={() => fetchData(true)}
        loading={refreshing}
        colors={{ ...colors, background: colors.background }}
      />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.primary]} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.kpiSection}>
          <AnalyticsKPIGrid tiles={kpiTiles} />
        </View>

        {drillLevel === 'class' ? (
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => {
              setDrillLevel('overview');
              setSelectedClass(null);
              setPage(1);
            }}
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>All Classes</Text>
          </TouchableOpacity>
        ) : null}

        {insights.length > 0 ? (
          <View style={styles.insightsBox}>
            {insights.map((ins, i) => (
              <Text key={i} style={[styles.insight, { color: colors.textSecondary }]}>• {ins.text}</Text>
            ))}
          </View>
        ) : null}

        {drillLevel === 'overview' ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>My Classes</Text>
            {paginatedClasses.map(renderClassCard)}
            <AnalyticsPagination page={page} totalPages={totalClassPages} onPageChange={setPage} colors={colors} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 8 }]}>Recent Quizzes</Text>
            {paginatedQuizzes.map(renderQuizRow)}
            <AnalyticsPagination page={page} totalPages={totalQuizPages} onPageChange={setPage} colors={colors} />
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{selectedClassName}</Text>
            <AnalyticsStatusChips summary={statusSummary} active={statusFilter} onChange={setStatusFilter} colors={colors} />
            {paginatedQuizzes.map(renderQuizRow)}
            <AnalyticsPagination page={page} totalPages={totalQuizPages} onPageChange={setPage} colors={colors} />
          </>
        )}
      </ScrollView>

      <QuizAttemptDetailModal
        visible={popup.visible}
        onClose={() => setPopup((p) => ({ ...p, visible: false }))}
        quizName={popup.quizName}
        score={popup.score}
        timeSpent={popup.timeSpent}
        logData={popup.logData}
        submittedAt={popup.submittedAt}
        colors={colors}
      />
    </View>
  );
}

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={[styles.metricLabel, { color: '#94a3b8' }]}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  hero: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  heroTitle: { fontSize: 20, fontWeight: '800' },
  heroSub: { fontSize: 12, marginTop: 2 },
  kpiSection: { paddingVertical: 12 },
  errorBox: { margin: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8 },
  errorText: { color: '#dc2626', fontSize: 13 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  backText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 16, marginBottom: 10 },
  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  classIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metricPill: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 8, alignItems: 'center' },
  metricLabel: { fontSize: 10, fontWeight: '600' },
  metricValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  insightsBox: { marginHorizontal: 16, marginBottom: 10, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 10 },
  insight: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  quizRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  quizName: { fontSize: 14, fontWeight: '700' },
  quizMeta: { fontSize: 11, marginTop: 2 },
  quizSummary: { fontSize: 11, marginTop: 4 },
  quizActions: { alignItems: 'flex-end', gap: 6, justifyContent: 'center' },
  scoreText: { fontSize: 16, fontWeight: '800' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
});
