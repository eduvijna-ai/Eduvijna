import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherDashboard } from '@core/hooks/useTeacherDashboard';
import { useTeacherTheme } from '../erp_schools/theme/useTeacherTheme';
import { useAuth } from '@core/hooks/useAuth';
import { getDisplayName } from '@core/types';
import LoadingSpinner from '@components/LoadingSpinner';
import QuizGenerationGrid from '@components/QuizGenerationGrid';
import { FONT_FAMILY } from '../theme/fonts';
import { navigateToAppMainTab, APP_MAIN_TABS } from '../platforms/mobile/navigation/navigateToAppMainTab';

interface Props {
  navigation?: any;
  onNavigate?: (screen: string, params?: any) => void;
  route?: {
    params?: any;
  };
}

const HERO_OVERLAP = 64;
const HERO_TOP_RADIUS = 24;

export default function TeacherDashboard({ navigation, onNavigate, route: _route }: Props) {
  const theme = useTeacherTheme();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const {
    stats,
    weakStudents,
    recentAssessments,
    loading,
    error,
    refresh,
  } = useTeacherDashboard();

  // Web AuthContext: full_name || username (humanized if needed)
  const displayName = getDisplayName(user).split(/\s+/)[0] || 'there';

  // Role label and subtitle
  const isAdmin = user?.role === 'admin' || (user as any)?.role_name === 'super_admin';
  const heroSubtitle = isAdmin
    ? "Here's your school overview for today."
    : "Here's your classroom overview for today.";

  const isWeb = width > 768;
  const isTablet = width > 600 && width <= 1024;

  const navigate = (screen: string, params?: any) => {
    if (navigation) {
      navigation.navigate(screen, params);
    } else if (onNavigate) {
      onNavigate(screen, params);
    }
  };

  const handleViewStudent = (studentId: number, studentName?: string) => {
    navigate('StudentAnalytics', { studentId, studentName });
  };

  const handleViewQuiz = (quizId: number) => {
    navigate('StudentList', { quizId });
  };

  if (loading && !stats) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <LoadingSpinner size={60} fullScreen />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <View style={[styles.errorIconWrap, { backgroundColor: theme.colors.tintRed }]}>
            <Ionicons name="alert-circle-outline" size={40} color={theme.colors.danger} />
          </View>
          <Text style={[styles.errorTitle, { color: theme.colors.textPrimary }]}>Something went wrong</Text>
          <Text style={[styles.errorMsg, { color: theme.colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={refresh}
            accessibilityRole="button"
            accessibilityLabel="Retry loading dashboard"
          >
            <Ionicons name="refresh-outline" size={16} color={theme.colors.textInverse} />
            <Text style={[styles.retryBtnText, { color: theme.colors.textInverse }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getStatusMeta = (status: string) => {
    if (status === 'active') return { label: 'Active', color: theme.colors.success, bg: theme.colors.tintGreen };
    if (status === 'expired') return { label: 'Expired', color: theme.colors.danger, bg: theme.colors.tintRed };
    return { label: 'Upcoming', color: theme.colors.warning, bg: theme.colors.tintOrange };
  };

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: theme.colors.background }]}
      scrollEventThrottle={400}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refresh}
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
            <Text style={styles.heroSub}>{heroSubtitle}</Text>
          </View>
        </View>
      </View>

      {/* Stat tiles — overlap hero */}
      <View style={[styles.statsWrap, { zIndex: 2, elevation: 4 }]}>
        <View
          style={[
            styles.statsCard,
            theme.shadow.medium,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.card },
          ]}
        >
          <TouchableOpacity
            style={styles.statTile}
            onPress={() => navigate('ClassesList')}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${stats.total_classes} total classes`}
          >
            <View style={[styles.statIcon, { backgroundColor: theme.colors.tintOrange }]}>
              <Ionicons name="school-outline" size={22} color={theme.colors.onTintOrange} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.total_classes}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Classes</Text>
          </TouchableOpacity>

          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            style={styles.statTile}
            onPress={() => navigate('Assessments', { filter: 'all' })}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${stats.total_assessments} total assessments`}
          >
            <View style={[styles.statIcon, { backgroundColor: theme.colors.tintBlue }]}>
              <Ionicons name="document-text-outline" size={22} color={theme.colors.onTintBlue} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.total_assessments}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Assessments</Text>
          </TouchableOpacity>

          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            style={styles.statTile}
            onPress={() => navigate('Assessments', { filter: 'active' })}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${stats.active_assessments} active assessments`}
          >
            <View style={[styles.statIcon, { backgroundColor: theme.colors.tintGreen }]}>
              <Ionicons name="checkmark-done-outline" size={22} color={theme.colors.onTintGreen} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.active_assessments}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Active</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* School ERP Quick-Link Banner */}
      <TouchableOpacity
        style={[styles.erpBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => navigateToAppMainTab(APP_MAIN_TABS.ERP_SCHOOLS)}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel="Open School ERP"
      >
        <View style={[styles.erpBannerIconWrap, { backgroundColor: theme.colors.tintTeal }]}>
          <Ionicons name="school" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.erpBannerText}>
          <Text style={[styles.erpBannerTitle, { color: theme.colors.textPrimary }]}>School ERP</Text>
          <Text style={[styles.erpBannerSub, { color: theme.colors.textSecondary }]}>
            Manage classes, students & school data
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
      </TouchableOpacity>

      {/* Generate Assessments */}
      <View style={[styles.section, { marginTop: 8 }]}>
        <QuizGenerationGrid
          navigation={navigation}
          onNavigate={onNavigate}
          theme={{ colors: { primary: theme.colors.primary, text: theme.colors.textPrimary, textSecondary: theme.colors.textSecondary, card: theme.colors.surface, border: theme.colors.border, background: theme.colors.background, error: theme.colors.danger, success: theme.colors.success } }}
          showTitle
        />
      </View>

      {/* Weak Students + Recent Assessments */}
      <View
        style={[
          styles.twoCol,
          (isWeb || isTablet) && styles.twoColRow,
        ]}
      >
        {/* Weak Students */}
        <View style={[(isWeb || isTablet) ? styles.colHalf : styles.colFull]}>
          <View style={[styles.section]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="trending-down-outline" size={18} color={theme.colors.danger} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Needs Attention</Text>
            </View>
            <View
              style={[
                styles.card,
                theme.shadow.light,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.card },
              ]}
            >
              {weakStudents.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.tintGreen }]}>
                    <Ionicons name="checkmark-circle-outline" size={32} color={theme.colors.success} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>All Caught Up!</Text>
                  <Text style={[styles.emptyMsg, { color: theme.colors.textSecondary }]}>No struggling students right now.</Text>
                </View>
              ) : (
                weakStudents.slice(0, 5).map((student, index) => (
                  <TouchableOpacity
                    key={student.student_id}
                    style={[
                      styles.listRow,
                      index < Math.min(weakStudents.length, 5) - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => handleViewStudent(student.student_id, student.student_fullname)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${student.student_fullname}, score ${student.average_score}%`}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: theme.colors.tintTeal }]}>
                      <Text style={[styles.avatarLetter, { color: theme.colors.primary }]}>
                        {student.student_fullname.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.listName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {student.student_fullname}
                    </Text>
                    <View style={[styles.scorePill, { backgroundColor: theme.colors.tintRed }]}>
                      <Text style={[styles.scorePillText, { color: theme.colors.danger }]}>
                        {student.average_score}%
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </View>

        {/* Recent Assessments */}
        <View style={[(isWeb || isTablet) ? styles.colHalf : styles.colFull]}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Recent Assessments</Text>
            </View>
            <View
              style={[
                styles.card,
                theme.shadow.light,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.card },
              ]}
            >
              {recentAssessments.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.tintTeal }]}>
                    <Ionicons name="document-text-outline" size={32} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No Assessments Yet</Text>
                  <Text style={[styles.emptyMsg, { color: theme.colors.textSecondary }]}>Create your first assessment to get started.</Text>
                </View>
              ) : (
                recentAssessments.slice(0, 5).map((quiz, index) => {
                  const meta = getStatusMeta(quiz.availability_status);
                  return (
                    <TouchableOpacity
                      key={quiz.quiz_id}
                      style={[
                        styles.listRow,
                        index < Math.min(recentAssessments.length, 5) - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => handleViewQuiz(quiz.quiz_id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${quiz.quiz_name}, status ${meta.label}`}
                    >
                      <View style={[styles.assessmentIcon, { backgroundColor: meta.bg }]}>
                        <Ionicons name="document-text-outline" size={18} color={meta.color} />
                      </View>
                      <Text style={[styles.listName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {quiz.quiz_name}
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  errorIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  errorMsg: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { fontSize: 15, fontWeight: '600' },

  heroClip: { width: '100%', overflow: 'hidden' },
  hero: { width: '100%', minHeight: 120, paddingBottom: HERO_OVERLAP + 16, position: 'relative' },
  heroWatermark: { position: 'absolute', right: -28, top: -12, width: 220, height: 220, opacity: 0.12 },
  heroTextWrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4, paddingRight: 100 },
  heroGreeting: { color: '#FFFFFF', fontSize: 28, lineHeight: 34 },
  heroLead: {
    fontFamily: FONT_FAMILY.medium,
    fontWeight: '500',
    fontSize: 28,
    lineHeight: 34,
    color: '#FFFFFF',
  },
  heroBold: {
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 34,
    color: '#FFFFFF',
  },
  heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 6, lineHeight: 18 },

  statsWrap: { marginTop: -HERO_OVERLAP, paddingHorizontal: 16, marginBottom: 4 },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statTile: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, textAlign: 'center', lineHeight: 14 },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 8 },

  section: { paddingHorizontal: 16, paddingTop: 12 },
  erpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#0B5563',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  erpBannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  erpBannerText: {
    flex: 1,
  },
  erpBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  erpBannerSub: {
    fontSize: 12,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  card: { borderWidth: StyleSheet.hairlineWidth, padding: 12 },

  twoCol: {},
  twoColRow: { flexDirection: 'row', alignItems: 'flex-start' },
  colFull: { flex: 1 },
  colHalf: { flex: 1 },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 15, fontWeight: '700' },
  listName: { flex: 1, fontSize: 14, fontWeight: '600' },
  scorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  scorePillText: { fontSize: 12, fontWeight: '700' },

  assessmentIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusPillText: { fontSize: 12, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyMsg: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
