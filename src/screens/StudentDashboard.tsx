import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@core/hooks/useAuth';
import { useTeacherTheme } from '../erp_schools/theme/useTeacherTheme';
import { FONT_FAMILY } from '../theme/fonts';
import { useDashboardStore } from '@core/store/dashboard.store';
import { loadStudentDashboardQuizzes } from '@core/services/studentDashboardData.service';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ParsedQuiz,
  getDisplayName,
} from '@core/types';
import { isStudentQuizActive, isStudentQuizUpcoming } from '../utils/quizFilters';
import { useStudentAssignmentBoundaryClock } from '../hooks/useStudentAssignmentBoundaryClock';
import {
  useStudentAssignmentDashboardStats,
  useStudentAssignmentDashboardStore,
} from '@core/store/studentAssignmentDashboard.store';
import {
  executeStudentAssignedQuizViewResults,
  isAssignedQuizLoadError,
} from '@core/services/assessmentQuizStart.service';
import { isAssignedQuizRecoveryProbeError } from '@core/services/assignedQuizRecovery.service';
import QuizGenerationGrid from '@components/QuizGenerationGrid';

interface Props {
  navigation?: any;
  route?: {
    params?: any;
  };
}

const HERO_OVERLAP = 64;
const HERO_TOP_RADIUS = 24;

export default function StudentDashboard({ navigation, route }: Props) {
  const theme = useTeacherTheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  const incomingParams = route?.params;
  console.log('📥 Incoming Params to StudentDashboard:', incomingParams);

  // Prefer full_name (e.g. Eshwara) over raw username (demo_eshwar) — TeacherDashboard parity
  const displayName = getDisplayName(user).split(/\s+/)[0] || 'Student';

  // Dashboard store for sharing data with ClassesList
  const { setQuizzes } = useDashboardStore();

  // Debug authentication state
  console.log('🔍 StudentDashboard Auth State:', {
    isAuthenticated,
    isLoading,
    user: user ? { id: user.id, role: user.role, name: user.username } : null
  });
  const width = dimensions.width;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const stats = useStudentAssignmentDashboardStats();
  const rawQuizzes = useStudentAssignmentDashboardStore((s) => s.rawQuizzes);
  const classificationNow = useStudentAssignmentDashboardStore((s) => s.classificationNow);
  const bumpClassificationNow = useStudentAssignmentDashboardStore((s) => s.bumpClassificationNow);
  const [selectedClassroom] = useState<string>('ALL');
  const [loadingRecentQuizId, setLoadingRecentQuizId] = useState<number | null>(null);

  useStudentAssignmentBoundaryClock(rawQuizzes as any, bumpClassificationNow);

  // Subscribe to stable fields; the derived getter returns a new array each time.
  const classifiedQuizzes = useMemo(
    () => useStudentAssignmentDashboardStore.getState().getClassifiedQuizzes() as unknown as ParsedQuiz[],
    [rawQuizzes, classificationNow],
  );

  useEffect(() => {
    const classified = useStudentAssignmentDashboardStore.getState().getClassifiedQuizzes();
    setQuizzes(classified as any, classified.length);
  }, [classificationNow, rawQuizzes, setQuizzes]);

  const isWeb = width >= 768;
  const isTablet = width >= 600 && width < 1024;

  // Dimension listener
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Fetch student dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.log('⚠️ User not authenticated, skipping dashboard fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const studentId = String(user.id);
      const loadGeneration =
        useStudentAssignmentDashboardStore.getState().beginLoad(studentId);
      const { quizzes: parsed } = await loadStudentDashboardQuizzes(studentId);

      const committed = useStudentAssignmentDashboardStore
        .getState()
        .commitLoad(studentId, loadGeneration, parsed as any);
      if (!committed) {
        return;
      }

      if (parsed.length === 0) {
        setQuizzes([], 0);
      }
    } catch (error: any) {
      console.error('❌ Error fetching student dashboard:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
      });
      if (!refreshing) {
        Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user, selectedClassroom, refreshing]);

  // Fetch on mount. On mobile, tab/stack screens also refetch via NativeFocusRefetch below.
  useEffect(() => {
    if (Platform.OS === 'web') {
      fetchDashboardData();
    }
  }, [fetchDashboardData]);

  // Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Time ago formatter
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Format time spent in readable format
  const formatTimeSpent = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Filter quizzes by status
  // Pending quizzes: Use common filter utility for consistency
  const pendingQuizzes = classifiedQuizzes.filter(isStudentQuizActive);

  const upcomingQuizzes = classifiedQuizzes.filter(isStudentQuizUpcoming);
  const completedQuizzes = classifiedQuizzes
    .filter(q => q.status === 'completed')
    .sort((a, b) => {
      // Sort by completion date, most recent first
      const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return dateB - dateA;
    });

  const handleRecentCompletionPress = async (quiz: ParsedQuiz) => {
    const sessionId = (quiz as { session_id?: string }).session_id;
    if (!user?.id || !sessionId) {
      Alert.alert('Unavailable', 'This result is missing assignment session context.');
      return;
    }
    setLoadingRecentQuizId(quiz.quiz_id);
    try {
      await executeStudentAssignedQuizViewResults(
        {
          studentId: String(user.id),
          quizId: quiz.quiz_id,
          sessionId: String(sessionId),
          classroomId: String(
            (quiz as { classroom_id?: string }).classroom_id || quiz.class_id || '',
          ),
          attemptData: quiz as unknown as Record<string, unknown>,
          quizName: quiz.quiz_name,
        },
        { navigation },
      );
    } catch (error) {
      if (isAssignedQuizRecoveryProbeError(error) || isAssignedQuizLoadError(error)) {
        Alert.alert(
          'Connection Error',
          'Could not verify your saved submission. Please check your connection and try again.',
        );
      } else {
        Alert.alert('Error', 'Could not open results. Please try again.');
      }
    } finally {
      setLoadingRecentQuizId(null);
    }
  };

  const focusRefetch =
    Platform.OS !== 'web' ? <NativeFocusRefetch onFocus={fetchDashboardData} /> : null;

  // Authentication check - show message if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        {focusRefetch}
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={styles.loadingContainer}>
            <View style={[styles.stateIconWrap, { backgroundColor: theme.colors.tintTeal }]}>
              <Ionicons name="log-in-outline" size={32} color={theme.colors.primary} />
            </View>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Please log in to view your dashboard
            </Text>
          </View>
        </View>
      </>
    );
  }

  // Loading state
  if (loading && classifiedQuizzes.length === 0) {
    return (
      <>
        {focusRefetch}
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={styles.loadingContainer}>
            <LoadingSpinner size={60} fullScreen />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading dashboard…</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      {focusRefetch}
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[styles.scrollContent, isWeb && styles.scrollContentWeb]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Hero strip */}
        <View
          style={[
            styles.heroClip,
            { borderTopLeftRadius: HERO_TOP_RADIUS, borderTopRightRadius: HERO_TOP_RADIUS, backgroundColor: theme.colors.primary },
          ]}
        >
          <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
            <Image
              source={require('../../assets/eduvijna_logo_sidebar_white.png')}
              style={styles.heroWatermark}
              resizeMode="contain"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroGreeting} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                <Text style={styles.heroLead}>Hello, </Text>
                <Text style={styles.heroBold}>{displayName}</Text>
                <Text style={styles.heroLead}> 👋</Text>
              </Text>
              <Text style={styles.heroSub}>Here&apos;s your learning overview for today.</Text>
            </View>
          </View>
        </View>

        {/* Stat tiles — overlapping hero */}
        <View style={[styles.statsWrap, { zIndex: 2, elevation: 4 }]}>
          <View
            style={[
              styles.statsCard,
              theme.shadow.medium,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.card },
            ]}
          >
            {[
              { label: 'Classes', value: stats.total_classes || 0, icon: 'school-outline' as const, accent: theme.colors.tintOrange, fg: theme.colors.onTintOrange, onPress: () => navigation?.navigate('ClassesList') },
              { label: 'Quizzes', value: stats.total_quizzes, icon: 'document-text-outline' as const, accent: theme.colors.tintBlue, fg: theme.colors.onTintBlue, onPress: () => navigation?.navigate('Assessments', { filterStatus: 'all' }) },
              { label: 'Completed', value: stats.completed_count, icon: 'checkmark-done-outline' as const, accent: theme.colors.tintGreen, fg: theme.colors.onTintGreen, onPress: () => navigation?.navigate('Assessments', { filterStatus: 'completed' }) },
              { label: 'Avg Score', value: `${stats.average_score}%`, icon: 'trophy-outline' as const, accent: theme.colors.tintPurple, fg: theme.colors.onTintPurple, onPress: () => navigation?.navigate('Assessments', { filterStatus: 'completed' }) },
            ].map((item, idx, arr) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={styles.statTileNew}
                  onPress={item.onPress}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}: ${item.value}`}
                >
                  <View style={[styles.statIconNew, { backgroundColor: item.accent }]}>
                    <Ionicons name={item.icon} size={20} color={item.fg} />
                  </View>
                  <Text style={[styles.statValueNew, { color: theme.colors.textPrimary }]}>{item.value}</Text>
                  <Text style={[styles.statLabelNew, { color: theme.colors.textSecondary }]}>{item.label}</Text>
                </TouchableOpacity>
                {idx < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Pending Quiz Banner */}
        {pendingQuizzes.length > 0 && (
          <View style={styles.bannerContainer}>
            <View style={[styles.banner, { backgroundColor: theme.colors.tintOrange, borderColor: theme.colors.warning }]}>
              <View style={styles.bannerContent}>
                <View style={[styles.bannerIcon, { backgroundColor: theme.colors.warning }]}>
                  <Ionicons name="time-outline" size={22} color={theme.colors.textInverse} />
                </View>
                <View style={styles.bannerText}>
                  <Text style={[styles.bannerTitle, { color: theme.colors.onTintOrange }]}>
                    {pendingQuizzes.length} Pending Quiz{pendingQuizzes.length > 1 ? 'zes' : ''}
                  </Text>
                  <Text style={[styles.bannerSubtitle, { color: theme.colors.textSecondary }]}>
                    Available to take now
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.bannerButton, { backgroundColor: theme.colors.warning }]}
                onPress={() => navigation?.navigate('Notifications')}
                accessibilityRole="button"
                accessibilityLabel="View pending quizzes"
              >
                <Text style={[styles.bannerButtonText, { color: theme.colors.textInverse }]}>View</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.textInverse} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Generate Assessments Section */}
        <View style={{ marginTop: 4 }}>
          <QuizGenerationGrid
            navigation={navigation}
            theme={{ colors: { primary: theme.colors.primary, text: theme.colors.textPrimary, textSecondary: theme.colors.textSecondary, card: theme.colors.surface, border: theme.colors.border, background: theme.colors.background, error: theme.colors.danger, success: theme.colors.success } }}
            showTitle
          />
        </View>

        {/* Two-column bottom area */}
        <View style={[(isWeb || isTablet) ? styles.bottomSectionRow : styles.bottomSection]}>

          {/* Upcoming Assessments */}
          {upcomingQuizzes.length > 0 && (
            <View style={[(isWeb || isTablet) ? styles.sectionHalf : styles.section]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Upcoming</Text>
              </View>
              <View
                style={[
                  styles.card,
                  theme.shadow.light,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.card },
                ]}
              >
                {upcomingQuizzes.slice(0, 5).map((quiz, index) => (
                  <View
                    key={`${quiz.quiz_id}-${index}`}
                    style={[
                      styles.listRow,
                      index < upcomingQuizzes.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.listIconWrap, { backgroundColor: theme.colors.tintBlue }]}>
                      <Ionicons name="calendar-outline" size={18} color={theme.colors.onTintBlue} />
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={[styles.listTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {quiz.quiz_name || `Quiz #${quiz.quiz_id}`}
                      </Text>
                      <Text style={[styles.listMeta, { color: theme.colors.textSecondary }]}>
                        {quiz.classroom_name} · {quiz.question_count} Qs
                      </Text>
                    </View>
                    <View style={[styles.upcomingPill, { backgroundColor: theme.colors.tintBlue }]}>
                      <Text style={[styles.upcomingPillText, { color: theme.colors.onTintBlue }]}>Soon</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recent Completions */}
          <View style={[(isWeb || isTablet) ? styles.sectionHalf : styles.section]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="checkmark-done-outline" size={18} color={theme.colors.success} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Recent Completions</Text>
            </View>
            <View
              style={[
                styles.card,
                theme.shadow.light,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.card },
              ]}
            >
              {completedQuizzes.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.tintTeal }]}>
                    <Ionicons name="document-text-outline" size={32} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No completions yet</Text>
                  <Text style={[styles.emptyMsg, { color: theme.colors.textSecondary }]}>Complete your first quiz to see results here.</Text>
                </View>
              ) : (
                completedQuizzes.slice(0, 5).map((quiz, index) => {
                  const sc = quiz.score ?? 0;
                  const scoreColor = sc >= 75 ? theme.colors.success : sc >= 50 ? theme.colors.warning : theme.colors.danger;
                  const scoreText = quiz.score !== null ? `${quiz.score}%` : 'N/A';
                  const correctText =
                    quiz.correct_answers !== undefined
                      ? `${quiz.correct_answers}/${quiz.question_count}`
                      : '';

                  return (
                    <TouchableOpacity
                      key={`${quiz.quiz_id}-${index}`}
                      style={[
                        styles.listRow,
                        index < completedQuizzes.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => handleRecentCompletionPress(quiz)}
                      disabled={loadingRecentQuizId === quiz.quiz_id}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${quiz.quiz_name}, score ${scoreText}`}
                    >
                      <View style={[styles.listIconWrap, { backgroundColor: theme.colors.tintGreen }]}>
                        <Ionicons name="checkmark-done-outline" size={18} color={theme.colors.onTintGreen} />
                      </View>
                      <View style={styles.listInfo}>
                        <Text style={[styles.listTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                          {quiz.quiz_name || `Quiz #${quiz.quiz_id}`}
                        </Text>
                        <Text style={[styles.listMeta, { color: theme.colors.textSecondary }]}>
                          {quiz.question_count} Qs{correctText ? ` · ${correctText} correct` : ''}{quiz.time_spent_seconds && quiz.time_spent_seconds > 0 ? ` · ${formatTimeSpent(quiz.time_spent_seconds)}` : ''}
                        </Text>
                        <Text style={[styles.listDate, { color: theme.colors.textSecondary }]}>
                          {quiz.classroom_name} · {quiz.completed_at ? formatTimeAgo(quiz.completed_at) : 'Recently'}
                        </Text>
                      </View>
                      <View style={[styles.scorePill, { backgroundColor: `${scoreColor}18`, borderColor: scoreColor }]}>
                        <Text style={[styles.scorePillText, { color: scoreColor }]}>{scoreText}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </>
  );
}

/** Refetch when screen regains focus — only used inside NavigationContainer (mobile). */
function NativeFocusRefetch({ onFocus }: { onFocus: () => void }) {
  useFocusEffect(
    useCallback(() => {
      onFocus();
    }, [onFocus]),
  );
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({ web: { maxWidth: 1400, width: '100%', alignSelf: 'center' } }),
  },
  scrollContent: { paddingBottom: 8 },
  scrollContentWeb: { maxWidth: 1200, width: '100%', alignSelf: 'center' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  stateIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, fontWeight: '500' },

  heroClip: { width: '100%', overflow: 'hidden' },
  hero: { width: '100%', minHeight: 112, paddingBottom: HERO_OVERLAP + 16, position: 'relative' },
  heroWatermark: { position: 'absolute', right: -28, top: -12, width: 200, height: 200, opacity: 0.12 },
  heroTextWrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4, paddingRight: 100 },
  heroGreeting: { color: '#FFFFFF', fontSize: 22, lineHeight: 28 },
  heroLead: { fontFamily: FONT_FAMILY.medium, fontWeight: '500' },
  heroBold: { fontFamily: FONT_FAMILY.bold, fontWeight: '700' },
  heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 6, lineHeight: 17 },

  statsWrap: { marginTop: -HERO_OVERLAP, paddingHorizontal: 16, marginBottom: 4 },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statTileNew: { flex: 1, alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  statIconNew: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statValueNew: { fontSize: 20, fontWeight: '800' },
  statLabelNew: { fontSize: 10, textAlign: 'center', lineHeight: 13 },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 8 },

  bannerContainer: { paddingHorizontal: 16, paddingTop: 8 },
  banner: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bannerIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  bannerSubtitle: { fontSize: 12 },
  bannerButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 4 },
  bannerButtonText: { fontSize: 13, fontWeight: '600' },

  section: { paddingHorizontal: 16, paddingTop: 12 },
  sectionHalf: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },

  bottomSection: {},
  bottomSectionRow: { flexDirection: 'row', alignItems: 'flex-start' },

  card: { borderWidth: StyleSheet.hairlineWidth, padding: 12 },

  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  listIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  listInfo: { flex: 1, gap: 2 },
  listTitle: { fontSize: 13, fontWeight: '700' },
  listMeta: { fontSize: 11, lineHeight: 15 },
  listDate: { fontSize: 11 },

  upcomingPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  upcomingPillText: { fontSize: 11, fontWeight: '600' },

  scorePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', minWidth: 48 },
  scorePillText: { fontSize: 13, fontWeight: '800' },

  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptyMsg: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
