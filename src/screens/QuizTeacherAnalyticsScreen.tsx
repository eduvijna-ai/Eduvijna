/**
 * Teacher Analytics Screen — mirrors Quiz-React AnalyticsPage (/analytics)
 * API: GET /api/v1/dashboard/quizzes?view_type=all
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import AnalyticsKPIGrid from '../components/analytics/AnalyticsKPIGrid';
import AnalyticsDateFilter from '../components/analytics/AnalyticsDateFilter';
import AnalyticsPagination from '../components/analytics/AnalyticsPagination';
import AnalyticsQuizCard from '../components/analytics/AnalyticsQuizCard';
import ClassInsightsPanel from '../components/analytics/ClassInsightsPanel';
import QuizAttemptStatusChips from '../components/analytics/QuizAttemptStatusChips';
import QuizDetailHeader from '../components/analytics/QuizDetailHeader';
import QuizStudentAttemptCard from '../components/analytics/QuizStudentAttemptCard';
import QuizPerformanceSummaryCard from '../components/analytics/QuizPerformanceSummaryCard';
import ClassStudentsModal from '../components/analytics/ClassStudentsModal';
import QuizAttemptDetailModal from '../components/analytics/QuizAttemptDetailModal';
import { navigate as navigateRootStack } from '@core/services/navigationService';
import {
  getQuizAnalytics,
  aggregateClassOverview,
  aggregateQuizTiles,
  calculateAcademicKPIs,
  calculateStudentHealthKPIs,
} from '../core/services/quizAnalyticsApi';
import { loadQuizAnalyticsRowsCoalesced } from '../core/services/quizAnalyticsPagination';
import type { ClassOverview, QuizListItem, QuizTile } from '../core/types/quizAnalytics.types';
import { useAssessmentClassrooms } from '@core/hooks/useAssessmentClassrooms';
import { mergeAssessmentClassroomInventoryWithMetrics } from '@core/services/assessmentClassroomAnalytics';
import {
  generateKPITiles,
  getDefaultDateRange,
  scoreColor,
} from '../core/utils/analyticsUiUtils';
import { isAnalyticsAllTime } from '../core/utils/analyticsDateState';
import { useUserStore } from '@core/store/user.store';
import {
  buildQuizSummaryRows,
  buildQuizCardData,
  computeClassInsights,
  computeClassKPITiles,
  computeClassStats,
  computeQuizAttemptStats,
  computeQuizInsights,
  getQuizAttemptsForView,
  resolveQuizInClass,
  type QuizAssignmentKey,
} from '../core/utils/teacherAnalyticsHelpers';
import type { QuizAttemptFilterKey } from '../core/utils/teacherAnalyticsHelpers';

type DrillLevel = 'classes' | 'class' | 'quiz';

const ITEMS_PER_PAGE = 10;

export default function QuizTeacherAnalyticsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const defaultDates = getDefaultDateRange();
  const userId = useUserStore((s) => s.user?.id);
  const schoolId = useUserStore((s) => s.schoolId);
  const accountScopeKey = `${userId ?? ''}::${schoolId ?? ''}`;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<QuizListItem[]>([]);
  // Default All Time — reconciles with Assessments (no created_from/to). Apply sets a range.
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('classes');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<QuizAssignmentKey | null>(null);
  const [selectedQuizName, setSelectedQuizName] = useState('');
  const [attemptFilter, setAttemptFilter] = useState<QuizAttemptFilterKey>(null);
  const [showKPIs, setShowKPIs] = useState(false);
  const [classPage, setClassPage] = useState(1);
  const [quizPage, setQuizPage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const [attemptPage, setAttemptPage] = useState(1);
  const [studentsModal, setStudentsModal] = useState({
    visible: false,
    loading: false,
    students: [] as any[],
  });
  const mainScrollRef = useRef<ScrollView>(null);
  const quizListSectionOffsetY = useRef(0);
  const quizListSectionHeight = useRef(0);
  const studentAttemptsSectionOffsetY = useRef(0);
  /** Matches analytics-class-drill-scroll viewport height on founder Android (≈721–1700). */
  const CLASS_DRILL_SCROLL_VIEWPORT_HEIGHT = 980;

  const [popup, setPopup] = useState({
    visible: false,
    quizName: '',
    studentName: '',
    studentId: '',
    quizId: null as number | null,
    sessionId: null as string | null,
    classroomId: null as string | null,
    attemptId: undefined as number | undefined,
    score: null as number | null,
    timeSpent: null as number | null,
    logData: null as string | null,
    submittedAt: null as string | null,
  });

  const {
    classrooms: assessmentClassrooms,
    count: assessmentClassroomCount,
    refresh: refreshAssessmentClassrooms,
  } = useAssessmentClassrooms();

  // Metrics generation — stale responses / finally handlers must not touch new session.
  const metricsGenerationRef = useRef(0);
  const hasMetricsRef = useRef(false);

  /**
   * Metrics fetch is independent of inventory refresh.
   * Proven blink cause: unstable refreshAssessmentClassrooms in deps recreated
   * fetchData every render → useEffect re-fired → setLoading(true) forever.
   */
  const fetchMetrics = useCallback(
    async (mode: 'initial' | 'refresh' | 'filter') => {
      const generation = ++metricsGenerationRef.current;
      const showBlockingSpinner = mode === 'initial' && !hasMetricsRef.current;
      if (showBlockingSpinner) setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      // filter / soft refresh: keep rendered content; non-blocking indicator only when refreshing

      try {
        const allTime = isAnalyticsAllTime(appliedStart, appliedEnd);
        const base = {
          view_type: 'all' as const,
          ...(allTime
            ? {}
            : {
                created_from: appliedStart,
                created_to: appliedEnd,
              }),
        };
        const outcome = await loadQuizAnalyticsRowsCoalesced(base);
        if (generation !== metricsGenerationRef.current) return;
        if (outcome.kind === 'incomplete') {
          setError(
            `Incomplete analytics fetch (${outcome.reason}). Showing prior data when available.`,
          );
          // Preserve prior complete rawData within this authorized scope.
          if (!hasMetricsRef.current) {
            setRawData([]);
          }
          return;
        }
        setRawData(outcome.rows);
        hasMetricsRef.current = true;
        setError(null);
      } catch (err: any) {
        if (generation !== metricsGenerationRef.current) return;
        setError(err?.message || 'Failed to load analytics');
        // Keep prior rawData — do not blank the screen on transient failure.
      } finally {
        if (generation !== metricsGenerationRef.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedStart, appliedEnd],
  );

  useEffect(() => {
    void fetchMetrics(hasMetricsRef.current ? 'filter' : 'initial');
  }, [fetchMetrics]);

  // Account / school switch: invalidate in-flight work and clear old-account rows.
  const prevAccountScopeRef = useRef(accountScopeKey);
  useEffect(() => {
    if (prevAccountScopeRef.current === accountScopeKey) return;
    prevAccountScopeRef.current = accountScopeKey;
    metricsGenerationRef.current += 1;
    hasMetricsRef.current = false;
    setRawData([]);
    setError(null);
    setDrillLevel('classes');
    setSelectedClass(null);
    setSelectedClassName('');
    setSelectedAssignment(null);
    setSelectedQuizName('');
    setAttemptFilter(null);
    setLoading(true);
    void fetchMetrics('initial');
  }, [accountScopeKey, fetchMetrics]);

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    // One explicit refresh → one inventory load + one metrics load (coalesced in-flight).
    await Promise.all([refreshAssessmentClassrooms(), fetchMetrics('refresh')]);
  }, [refreshAssessmentClassrooms, fetchMetrics]);

  // Inventory is independent of date filters; metrics attach to selected classroom_id.
  const classOverviews = useMemo(() => {
    const metrics = aggregateClassOverview(rawData, { mode: 'teacher' });
    return mergeAssessmentClassroomInventoryWithMetrics(assessmentClassrooms, metrics);
  }, [rawData, assessmentClassrooms]);
  const classesWithActivityInRange = useMemo(
    () => aggregateClassOverview(rawData, { mode: 'teacher' }).length,
    [rawData],
  );
  const kpiTiles = useMemo(() => generateKPITiles(rawData), [rawData]);
  const academicKPIs = useMemo(() => calculateAcademicKPIs(rawData), [rawData]);
  const studentHealth = useMemo(() => calculateStudentHealthKPIs(rawData), [rawData]);

  const classQuizzesRaw = useMemo(() => {
    if (!selectedClass) return [];
    return rawData.filter((q) => q.classroom_id === selectedClass);
  }, [rawData, selectedClass]);

  const classQuizzes = useMemo(() => {
    if (!selectedClass) return [];
    return aggregateQuizTiles(rawData, selectedClass);
  }, [rawData, selectedClass]);

  const selectedQuizItem = useMemo(() => {
    if (!selectedAssignment) return null;
    return resolveQuizInClass(
      rawData,
      selectedAssignment.quizId,
      selectedAssignment.classroomId,
      selectedAssignment.sessionId,
    );
  }, [rawData, selectedAssignment]);

  const classStats = useMemo(
    () => (selectedClass ? computeClassStats(classQuizzesRaw) : null),
    [selectedClass, classQuizzesRaw],
  );

  const classKPITiles = useMemo(
    () => (selectedClass ? computeClassKPITiles(classQuizzesRaw) : []),
    [selectedClass, classQuizzesRaw],
  );

  const classInsights = useMemo(
    () => (classStats ? computeClassInsights(classQuizzesRaw, classStats) : []),
    [classQuizzesRaw, classStats],
  );

  const quizSummaryRows = useMemo(
    () => buildQuizSummaryRows(classQuizzes, classQuizzesRaw),
    [classQuizzes, classQuizzesRaw],
  );

  const selectedQuizMeta = selectedQuizItem;

  const selectedQuizTile = useMemo(() => {
    if (!selectedAssignment) return null;
    return (
      classQuizzes.find(
        (q) =>
          q.quiz_id === selectedAssignment.quizId &&
          q.session_id === selectedAssignment.sessionId &&
          q.classroom_id === selectedAssignment.classroomId,
      ) ?? null
    );
  }, [classQuizzes, selectedAssignment]);

  const quizAttemptStats = useMemo(
    () => (selectedQuizMeta ? computeQuizAttemptStats(selectedQuizMeta) : null),
    [selectedQuizMeta],
  );

  const quizInsights = useMemo(
    () => (selectedQuizMeta ? computeQuizInsights(selectedQuizMeta) : []),
    [selectedQuizMeta],
  );

  const studentRows = useMemo(() => {
    if (!selectedQuizMeta) return [];
    return getQuizAttemptsForView(selectedQuizMeta, attemptFilter);
  }, [selectedQuizMeta, attemptFilter]);

  const totalClassPages = Math.max(1, Math.ceil(classOverviews.length / ITEMS_PER_PAGE));
  const totalQuizPages = Math.max(1, Math.ceil(classQuizzes.length / ITEMS_PER_PAGE));
  const totalSummaryPages = Math.max(1, Math.ceil(quizSummaryRows.length / ITEMS_PER_PAGE));
  const totalAttemptPages = Math.max(1, Math.ceil(studentRows.length / ITEMS_PER_PAGE));

  const paginatedClasses = classOverviews.slice((classPage - 1) * ITEMS_PER_PAGE, classPage * ITEMS_PER_PAGE);
  const paginatedQuizzes = classQuizzes.slice((quizPage - 1) * ITEMS_PER_PAGE, quizPage * ITEMS_PER_PAGE);
  const classQuizPageMemberTokens = useMemo(
    () => paginatedQuizzes.map((tile) => `${tile.quiz_id}:${tile.session_id}`),
    [paginatedQuizzes],
  );
  const analyticsQuizPageMembersAccessibilityLabel = useMemo(() => {
    if (drillLevel !== 'class') return '';
    return `analytics-quiz-page-members page-${quizPage} ${classQuizPageMemberTokens.join(' ')}`.trim();
  }, [drillLevel, quizPage, classQuizPageMemberTokens]);
  const paginatedSummary = quizSummaryRows.slice((summaryPage - 1) * ITEMS_PER_PAGE, summaryPage * ITEMS_PER_PAGE);
  const paginatedRows = studentRows.slice((attemptPage - 1) * ITEMS_PER_PAGE, attemptPage * ITEMS_PER_PAGE);

  useEffect(() => {
    if (drillLevel !== 'class' || !selectedClass) return;
    const timer = setTimeout(() => {
      const sectionTop = quizListSectionOffsetY.current;
      const sectionBottom = sectionTop + quizListSectionHeight.current;
      const sectionTopY = Math.max(0, sectionTop - 8);
      const revealPaginationY = Math.max(
        0,
        sectionBottom - CLASS_DRILL_SCROLL_VIEWPORT_HEIGHT + 32,
      );
      const onLastQuizPage = quizPage >= totalQuizPages;
      const targetY =
        !onLastQuizPage && quizListSectionHeight.current > 0
          ? Math.max(sectionTopY, revealPaginationY)
          : sectionTopY;
      mainScrollRef.current?.scrollTo({
        y: targetY,
        animated: false,
      });
    }, 80);
    return () => clearTimeout(timer);
  }, [drillLevel, selectedClass, quizPage, totalQuizPages]);

  useEffect(() => {
    if (drillLevel !== 'quiz' || !selectedAssignment) return;
    const timer = setTimeout(() => {
      mainScrollRef.current?.scrollTo({
        y: Math.max(0, studentAttemptsSectionOffsetY.current - 8),
        animated: false,
      });
    }, 80);
    return () => clearTimeout(timer);
  }, [drillLevel, selectedAssignment, attemptPage, attemptFilter]);

  const resetDrillToClasses = useCallback(() => {
    setDrillLevel('classes');
    setSelectedClass(null);
    setSelectedClassName('');
    setSelectedAssignment(null);
    setSelectedQuizName('');
    setAttemptFilter(null);
    setClassPage(1);
    setQuizPage(1);
    setSummaryPage(1);
    setAttemptPage(1);
    setStudentsModal((s) => (s.visible ? { ...s, visible: false } : s));
    setPopup((p) => (p.visible ? { ...p, visible: false } : p));
  }, []);

  const handleApplyDates = () => {
    resetDrillToClasses();
    // Empty inputs → All Time; otherwise require both ends for a range filter.
    if (!String(startDate || '').trim() && !String(endDate || '').trim()) {
      setAppliedStart('');
      setAppliedEnd('');
      return;
    }
    const from = String(startDate || '').trim() || defaultDates.from;
    const to = String(endDate || '').trim() || defaultDates.to;
    setStartDate(from);
    setEndDate(to);
    setAppliedStart(from);
    setAppliedEnd(to);
  };

  const handleClearDates = () => {
    // Clear → All Time (omit created_from/created_to) — matches Assessments All Time.
    resetDrillToClasses();
    setStartDate('');
    setEndDate('');
    setAppliedStart('');
    setAppliedEnd('');
  };

  const analyticsDrillTestId = useMemo(() => {
    if (drillLevel === 'classes') return 'analytics-drill-classes';
    if (drillLevel === 'class' && selectedClass) {
      return `analytics-drill-class-${selectedClass}`;
    }
    if (drillLevel === 'quiz' && selectedAssignment) {
      return `analytics-drill-quiz-${selectedAssignment.quizId}-${selectedAssignment.sessionId}`;
    }
    return 'analytics-drill-unknown';
  }, [drillLevel, selectedClass, selectedAssignment]);

  const analyticsDrillAccessibilityLabel = useMemo(() => {
    if (drillLevel === 'quiz' && selectedAssignment) {
      return `${analyticsDrillTestId} classroom-${selectedAssignment.classroomId}`;
    }
    if (drillLevel === 'class' && selectedClass) {
      const membersSuffix = classQuizPageMemberTokens.length
        ? ` quiz-members-${classQuizPageMemberTokens.join(';')}`
        : '';
      return `${analyticsDrillTestId} quiz-page-${quizPage}-of-${totalQuizPages} quiz-count-${classQuizzes.length}${membersSuffix}`;
    }
    return analyticsDrillTestId;
  }, [
    analyticsDrillTestId,
    drillLevel,
    selectedAssignment,
    selectedClass,
    quizPage,
    totalQuizPages,
    classQuizzes.length,
    classQuizPageMemberTokens,
  ]);

  const handleClassPress = (cls: ClassOverview) => {
    setSelectedClass(cls.classroom_id);
    setSelectedClassName(cls.classroom_name);
    setDrillLevel('class');
    setQuizPage(1);
    setSummaryPage(1);
  };

  const handleQuizPress = (tile: QuizTile) => {
    setSelectedAssignment({
      quizId: tile.quiz_id,
      sessionId: tile.session_id,
      classroomId: tile.classroom_id,
    });
    setSelectedQuizName(tile.quiz_name);
    setDrillLevel('quiz');
    setAttemptPage(1);
    setAttemptFilter(null);
  };

  const openSavedQuizResult = (
    row: ReturnType<typeof getQuizAttemptsForView>[0],
  ) => {
    if (!selectedAssignment || !row.attempt_id || !row.canViewSavedResult) return;
    navigateRootStack('QuizResultsScreen', {
      quizId: selectedAssignment.quizId,
      attemptId: Number(row.attempt_id),
      studentId: row.student_id,
      studentName: row.student_fullname || row.student_username || 'Student',
      score: row.score,
      quizName: selectedQuizName,
      sessionId: selectedAssignment.sessionId,
      classroomId: selectedAssignment.classroomId,
      isTeacherView: true,
    });
  };

  const handleBack = useCallback(() => {
    if (drillLevel === 'quiz') {
      setDrillLevel('class');
      setSelectedAssignment(null);
      setSelectedQuizName('');
      setAttemptPage(1);
      setAttemptFilter(null);
    } else if (drillLevel === 'class') {
      setDrillLevel('classes');
      setSelectedClass(null);
      setSelectedClassName('');
      setQuizPage(1);
      setSummaryPage(1);
    }
  }, [drillLevel]);

  useEffect(() => {
    const onHardwareBack = () => {
      if (studentsModal.visible) {
        setStudentsModal((s) => ({ ...s, visible: false }));
        return true;
      }
      if (popup.visible) {
        setPopup((p) => ({ ...p, visible: false }));
        return true;
      }
      if (drillLevel === 'quiz' || drillLevel === 'class') {
        handleBack();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [drillLevel, studentsModal.visible, popup.visible, handleBack]);

  const handleShowAllStudents = async () => {
    if (!selectedClass) return;
    setStudentsModal({ visible: true, loading: true, students: [] });
    try {
      const res = await getQuizAnalytics({
        view_type: 'class_wise_students',
        classroom_id: selectedClass,
        limit: 1000,
        offset: 0,
      });
      let students: any[] = [];
      if (res.data?.length) {
        const classData = res.data[0];
        if (classData.attempts) {
          students =
            typeof classData.attempts === 'string'
              ? JSON.parse(classData.attempts)
              : classData.attempts;
        }
      }
      const list = Array.isArray(students) ? students : [];
      const uniqueStudents = list.filter((s, i, arr) => {
        const id = s.student_id ?? s.user_id ?? s.id ?? s.email ?? s.username;
        if (id == null) return true;
        return arr.findIndex((o) => (o.student_id ?? o.user_id ?? o.id) === id) === i;
      });
      setStudentsModal({ visible: true, loading: false, students: uniqueStudents });
    } catch {
      setStudentsModal({ visible: true, loading: false, students: [] });
    }
  };

  const renderClassCard = (cls: ClassOverview) => (
    <TouchableOpacity
      key={cls.classroom_id}
      testID={`analytics-class-card-${cls.classroom_id}`}
      accessibilityRole="button"
      accessibilityLabel={`Open class analytics: ${cls.classroom_name}`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => handleClassPress(cls)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.classIcon, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="school-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{cls.classroom_name}</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            {cls.total_quizzes} quizzes · {cls.total_students} students
          </Text>
          <Text
            testID={`analytics-class-availability-${cls.classroom_id}`}
            accessibilityLabel={`Assignment availability active ${cls.active_assignment_count ?? 0} upcoming ${cls.upcoming_assignment_count ?? 0} expired ${cls.expired_assignment_count ?? 0}`}
            style={[styles.cardSub, { color: colors.textSecondary, marginTop: 2 }]}
          >
            Active {cls.active_assignment_count ?? 0} · Upcoming {cls.upcoming_assignment_count ?? 0} · Expired{' '}
            {cls.expired_assignment_count ?? 0}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>
      {/*
        Web class-card contract: Done/Pending = submission slot aggregates (ungated).
        Active/Upcoming/Expired above = assignment availability — different entity.
        Drill-down chips gate Pending to active availability separately.
      */}
      <View style={styles.metricsRow}>
        <MetricPill
          label="Avg"
          value={cls.avg_score == null ? '—' : `${Math.round(cls.avg_score)}%`}
          color={scoreColor(cls.avg_score)}
        />
        <MetricPill label="Completed" value={String(cls.completed_count)} color="#059669" />
        <MetricPill label="Pending" value={String(cls.pending_count)} color="#d97706" />
        <MetricPill label="Rate" value={`${Math.round(cls.completion_rate)}%`} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );

  const renderQuizCard = (quiz: QuizTile) => {
    const originalQuiz = classQuizzesRaw.find(
      (q) =>
        q.quiz_id === quiz.quiz_id &&
        q.session_id === quiz.session_id &&
        q.classroom_id === quiz.classroom_id,
    );
    const cardData = buildQuizCardData(quiz, originalQuiz, selectedClassName);
    return (
      <AnalyticsQuizCard
        key={`${quiz.quiz_id}-${quiz.session_id}`}
        tile={cardData.tile}
        originalQuiz={cardData.originalQuiz}
        classroomName={cardData.classroomName}
        performanceSummary={cardData.performanceSummary}
        urgency={cardData.urgency}
        onViewAnalytics={() => handleQuizPress(quiz)}
        colors={colors}
      />
    );
  };

  const renderAttemptRow = (row: ReturnType<typeof getQuizAttemptsForView>[0], idx: number) => (
    <QuizStudentAttemptCard
      key={`${row.student_id}-${row.attempt_id ?? idx}`}
      row={row}
      quizName={selectedQuizName}
      colors={colors}
      onView={row.canViewSavedResult ? () => openSavedQuizResult(row) : undefined}
      viewResultTestId={
        selectedAssignment && row.attempt_id
          ? `analytics-view-result-${selectedAssignment.quizId}-${selectedAssignment.sessionId}-${row.student_id}-${row.attempt_id}`
          : undefined
      }
    />
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading analytics…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        testID={analyticsDrillTestId}
        accessibilityLabel={analyticsDrillAccessibilityLabel}
        accessible
        importantForAccessibility="yes"
      >
        <View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Analytics Dashboard</Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Teacher insights across classes
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowKPIs((v) => !v)}
          style={[styles.kpiToggle, { borderColor: colors.border }]}
        >
          <Ionicons
            name={showKPIs ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <AnalyticsDateFilter
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
        onApply={handleApplyDates}
        onClear={handleClearDates}
        onRefresh={handlePullRefresh}
        loading={refreshing}
        colors={{ ...colors, background: colors.background }}
      />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => void fetchMetrics(hasMetricsRef.current ? 'filter' : 'initial')}
            accessibilityRole="button"
            accessibilityLabel="Retry loading analytics"
            style={styles.retryBtn}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        ref={mainScrollRef}
        testID="analytics-class-drill-scroll"
        accessibilityLabel="analytics-class-drill-scroll"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {drillLevel === 'classes' ? (
          <View style={styles.kpiSection}>
            <AnalyticsKPIGrid tiles={kpiTiles} />
            {assessmentClassroomCount > 0 &&
            classesWithActivityInRange !== assessmentClassroomCount ? (
              <Text
                style={[styles.inventoryHint, { color: colors.textSecondary }]}
                accessibilityLabel={`Authorized classrooms ${assessmentClassroomCount}; ${classesWithActivityInRange} with activity in selected date range`}
              >
                {assessmentClassroomCount} authorized classrooms · {classesWithActivityInRange}{' '}
                with activity in selected date range
              </Text>
            ) : null}
          </View>
        ) : null}

        {drillLevel !== 'classes' ? (
          <TouchableOpacity
            testID="analytics-drill-back"
            accessibilityLabel={drillLevel === 'quiz' ? 'Back to Quizzes' : 'All Classes'}
            style={styles.backRow}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>
              {drillLevel === 'quiz' ? 'Back to Quizzes' : 'All Classes'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {drillLevel === 'classes' ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Class Overview</Text>
            {paginatedClasses.map(renderClassCard)}
            <AnalyticsPagination
              scope="class"
              page={classPage}
              totalPages={totalClassPages}
              onPageChange={setClassPage}
              colors={colors}
            />
          </>
        ) : null}

        {drillLevel === 'class' ? (
          <>
            <View style={styles.classHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, flex: 1 }]}>
                {selectedClassName}
              </Text>
              <TouchableOpacity
                style={[styles.showStudentsBtn, { backgroundColor: colors.primary }]}
                onPress={handleShowAllStudents}
              >
                <Ionicons name="people-outline" size={16} color="#fff" />
                <Text style={styles.showStudentsText}>Students</Text>
              </TouchableOpacity>
            </View>

            <ClassInsightsPanel insights={classInsights} />

            {classKPITiles.length > 0 ? (
              <View style={styles.classKpiSection}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>Class Performance</Text>
                <AnalyticsKPIGrid tiles={classKPITiles} />
              </View>
            ) : null}

            <View
              testID="analytics-class-quiz-list-section"
              accessibilityLabel="analytics-class-quiz-list-section"
              accessible
              importantForAccessibility="yes"
              collapsable={false}
              onLayout={(event) => {
                quizListSectionOffsetY.current = event.nativeEvent.layout.y;
                quizListSectionHeight.current = event.nativeEvent.layout.height;
              }}
            >
              <Text
                style={[styles.subSectionTitle, { color: colors.text }]}
                testID="analytics-quiz-page-members"
                accessibilityLabel={analyticsQuizPageMembersAccessibilityLabel}
                accessible
                importantForAccessibility="yes"
              >
                Quizzes in this Class
              </Text>
              <Text
                style={[styles.hint, { color: colors.textSecondary }]}
                testID="analytics-quiz-list-hint"
                accessibilityLabel="analytics-quiz-list-hint"
                accessible
                importantForAccessibility="yes"
              >
                {classQuizzes.length} quiz{classQuizzes.length === 1 ? '' : 'zes'} · open a quiz for
                detailed analytics
              </Text>
              {paginatedQuizzes.map(renderQuizCard)}
              <AnalyticsPagination
                scope="quiz"
                page={quizPage}
                totalPages={totalQuizPages}
                onPageChange={setQuizPage}
                colors={colors}
              />
            </View>

            <Text style={[styles.subSectionTitle, { color: colors.text, marginTop: 8 }]}>
              Quiz Performance Summary
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {quizSummaryRows.length} quiz{quizSummaryRows.length === 1 ? '' : 'zes'} · tap a quiz for details
            </Text>
            {paginatedSummary.map((row) => (
              <QuizPerformanceSummaryCard
                key={`${row.quiz_id}-${row.session_id}`}
                row={row}
                onPress={() =>
                  handleQuizPress({
                    quiz_id: row.quiz_id,
                    session_id: row.session_id,
                    classroom_id: row.classroom_id,
                    quiz_name: row.quiz_name,
                    topic: row.topic,
                    subject: null,
                    total_students: row.total_students,
                    completed_count: row.completed,
                    pending_count: row.pending,
                    in_progress_count: 0,
                    missed_count: row.not_completed,
                    expired_count: 0,
                    avg_score: row.avg_score,
                    highest_score: row.highest_score,
                    lowest_score: row.lowest_score,
                    at_risk_count: row.at_risk,
                    completion_rate: row.completion_rate,
                    created_at: '',
                    due_date: null,
                  })
                }
                colors={colors}
              />
            ))}
            <AnalyticsPagination
              scope="summary"
              page={summaryPage}
              totalPages={totalSummaryPages}
              onPageChange={setSummaryPage}
              colors={colors}
            />
          </>
        ) : null}

        {drillLevel === 'quiz' ? (
          <>
            <QuizDetailHeader
              quizName={selectedQuizName}
              className={selectedClassName}
              topic={selectedQuizTile?.topic ?? selectedQuizMeta?.topic}
              quiz={selectedQuizMeta}
              tile={selectedQuizTile}
              colors={colors}
            />

            <Text style={[styles.subSectionTitle, { color: colors.text }]}>Attempt Status</Text>
            <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 4 }]}>
              Tap a status to filter student attempts below
            </Text>
            {quizAttemptStats ? (
              <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                <QuizAttemptStatusChips
                  stats={quizAttemptStats}
                  active={attemptFilter}
                  onChange={(key) => {
                    setAttemptFilter(key === 'total_students' ? null : key);
                    setAttemptPage(1);
                  }}
                  colors={colors}
                />
              </View>
            ) : null}

            {attemptFilter ? (
              <TouchableOpacity
                style={styles.clearFilterRow}
                onPress={() => {
                  setAttemptFilter(null);
                  setAttemptPage(1);
                }}
              >
                <Ionicons name="close-circle" size={16} color={colors.primary} />
                <Text style={[styles.clearFilterText, { color: colors.primary }]}>Clear filter</Text>
              </TouchableOpacity>
            ) : null}

            {quizInsights.length > 0 ? <ClassInsightsPanel insights={quizInsights} /> : null}

            <View
              testID="analytics-quiz-student-attempts-section"
              accessibilityLabel="analytics-quiz-student-attempts-section"
              accessible
              importantForAccessibility="yes"
              collapsable={false}
              onLayout={(event) => {
                studentAttemptsSectionOffsetY.current = event.nativeEvent.layout.y;
              }}
            >
              <View style={styles.attemptHeader}>
                <Text style={[styles.subSectionTitle, { color: colors.text, marginBottom: 0 }]}>
                  Student Attempts
                </Text>
                <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 0 }]}>
                  Showing {studentRows.length} attempt{studentRows.length === 1 ? '' : 's'}
                  {attemptFilter ? ` · ${attemptFilter.replace('_', ' ')}` : ''}
                </Text>
              </View>
            {paginatedRows.length === 0 ? (
              <View style={styles.emptyAttempts}>
                <Ionicons name="people-outline" size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyAttemptsText, { color: colors.textSecondary }]}>
                  {attemptFilter
                    ? `No ${attemptFilter.replace('_', ' ')} attempts found.`
                    : 'No student attempts available for this quiz.'}
                </Text>
              </View>
            ) : (
              paginatedRows.map(renderAttemptRow)
            )}
            <AnalyticsPagination
              scope="attempt"
              page={attemptPage}
              totalPages={totalAttemptPages}
              onPageChange={setAttemptPage}
              colors={colors}
            />
            </View>
          </>
        ) : null}

        {showKPIs ? (
          <View style={[styles.advancedKpi, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.advancedTitle, { color: colors.text }]}>Academic KPIs</Text>
            <KpiLine
              label="Overall avg score"
              value={`${Math.round(academicKPIs.avg_score_overall)}%`}
              colors={colors}
            />
            <KpiLine
              label="Completion rate"
              value={`${Math.round(academicKPIs.completion_rate)}%`}
              colors={colors}
            />
            <KpiLine
              label="Missed rate"
              value={`${Math.round(academicKPIs.missed_rate)}%`}
              colors={colors}
            />
            <Text style={[styles.advancedTitle, { color: colors.text, marginTop: 12 }]}>Student Health</Text>
            <KpiLine label="At risk" value={String(studentHealth.at_risk_count)} colors={colors} />
            <KpiLine label="Improving" value={String(studentHealth.improving_count)} colors={colors} />
            <KpiLine label="Consistent" value={String(studentHealth.consistent_count)} colors={colors} />
          </View>
        ) : null}
      </ScrollView>

      <ClassStudentsModal
        visible={studentsModal.visible}
        loading={studentsModal.loading}
        className={selectedClassName}
        students={studentsModal.students}
        onClose={() => setStudentsModal((s) => ({ ...s, visible: false }))}
        colors={colors}
      />

      <QuizAttemptDetailModal
        visible={popup.visible}
        onClose={() => setPopup((p) => ({ ...p, visible: false }))}
        quizName={popup.quizName}
        studentName={popup.studentName}
        score={popup.score}
        timeSpent={popup.timeSpent}
        logData={popup.logData}
        submittedAt={popup.submittedAt}
        reviewContext={
          popup.studentId && popup.quizId
            ? {
                studentId: popup.studentId,
                quizId: popup.quizId,
                sessionId: popup.sessionId,
                classroomId: popup.classroomId,
                attemptId: popup.attemptId,
                isTeacherView: true,
              }
            : null
        }
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

function KpiLine({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string; textSecondary: string };
}) {
  return (
    <View style={styles.kpiLine}>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  heroTitle: { fontSize: 20, fontWeight: '800' },
  heroSub: { fontSize: 12, marginTop: 2 },
  kpiToggle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiSection: { paddingVertical: 12 },
  inventoryHint: {
    marginHorizontal: 16,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  classKpiSection: { paddingVertical: 4 },
  errorBox: { margin: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8 },
  errorText: { color: '#dc2626', fontSize: 13 },
  retryBtn: { marginTop: 8, alignSelf: 'flex-start' },
  retryText: { fontSize: 13, fontWeight: '600' },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backText: { fontSize: 14, fontWeight: '600' },
  classHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  showStudentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  showStudentsText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 6,
    marginTop: 4,
  },
  hint: { fontSize: 11, paddingHorizontal: 16, marginBottom: 10 },
  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  classIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metricPill: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 10, fontWeight: '600' },
  metricValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  attemptChips: { paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  attemptChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  clearFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  clearFilterText: { fontSize: 12, fontWeight: '600' },
  attemptHeader: { paddingHorizontal: 16, marginTop: 8, marginBottom: 8, gap: 2 },
  emptyAttempts: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, gap: 8 },
  emptyAttemptsText: { fontSize: 13, textAlign: 'center' },
  advancedKpi: { margin: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  advancedTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  kpiLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
});
