/**
 * Teacher Home — web InstructorDashboard data + mobile-friendly layout.
 */

import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  SurfaceCard,
  SectionHeader,
  QuickActionGrid,
  Badge,
  EmptyState,
  ScreenLoader,
  type QuickAction,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherSession } from '../../../hooks/useTeacherSession';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { useTeacherHrData } from '../../../hooks/useTeacherHrData';
import { useTeacherStaffProfile } from '../../../hooks/useTeacherStaffProfile';
import { resolveDisplayName } from '../../../utils/displayName';
import { accentColors, type AccentKey } from '../../../theme/accents';
import { FONT_FAMILY } from '../../../../theme/fonts';

interface OverviewMetric {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  /** Web ERPDashboardTab KpiCard.tab destination */
  onPress: () => void;
}

const HERO_OVERLAP = 72;
const HERO_TOP_RADIUS = 24;

function formatCurrency(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

function formatDateLabel(d = new Date()): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function TeacherHomeScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { displayName } = useTeacherSession();
  const { profile } = useTeacherStaffProfile();
  const { overview, classes, schedule, announcements, status, refetch } = useTeacherData();
  const { leaveHistory } = useTeacherHrData();
  const firstClassId = classes[0]?.id;

  // Web shows full_name; prefer HR staff name, then auth full_name / humanized username
  const welcomeName = resolveDisplayName(
    {
      full_name: profile?.name && profile.name !== 'Teacher' ? profile.name : displayName,
      username: undefined,
    },
    displayName || 'Teacher',
  ).split(/\s+/)[0];
  const fmtPct = (n: number | null | undefined) =>
    n != null && Number.isFinite(n) ? `${Number(n).toFixed(1)}%` : null;
  // Web KPI: overallPct ?? avgAttPct  → overview.avgAttendance (kpiPct)
  const attLabel = fmtPct(overview.avgAttendance) ?? '—';
  // Web glance: overallPct ?? 'Not marked'
  const glanceAtt = fmtPct(overview.todayAttendance) ?? 'Not marked';
  // Web Attendance Overview donut center — Avg. Att. (often differs from today)
  const avgAttLabel = fmtPct(overview.avgAttPct) ?? '—';
  const attHint =
    overview.todayAttendance != null &&
    overview.avgAttPct != null &&
    Number(overview.todayAttendance) !== Number(overview.avgAttPct)
      ? `Today ${fmtPct(overview.todayAttendance)} · Avg ${fmtPct(overview.avgAttPct)}`
      : 'Today / Overall';

  const goClasses = () =>
    navigation.navigate('TeacherTabs', { screen: 'TeacherClasses' });
  const goStudents = () =>
    navigation.navigate('TeacherTabs', { screen: 'TeacherStudents' });
  const goAttendance = () =>
    navigation.navigate('TeacherAttendance', { classId: firstClassId });
  const goTimetable = () => navigation.navigate('Timetable', {});
  const goFees = () => navigation.navigate('TeacherFees');

  // Web instructor KPI cards → onNavigate(tab)
  const metrics: OverviewMetric[] = [
    {
      key: 'classes',
      icon: 'school-outline',
      value: String(overview.classes),
      label: 'Classes',
      onPress: goClasses,
    },
    {
      key: 'students',
      icon: 'people-outline',
      value: String(overview.students),
      label: 'Students',
      onPress: goStudents,
    },
    {
      key: 'attendance',
      icon: 'checkbox-outline',
      value: attLabel,
      label: 'Student Att. %',
      onPress: goAttendance,
    },
    {
      key: 'today',
      icon: 'calendar-outline',
      value: String(overview.todayClasses),
      label: "Today's Classes",
      onPress: goTimetable,
    },
    {
      key: 'fees',
      icon: 'cash-outline',
      value: formatCurrency(overview.feesOverdue || 0),
      label: 'Fees Pending',
      onPress: goFees,
    },
  ];

  const actions: QuickAction[] = [
    {
      key: 'attendance',
      icon: 'checkbox-outline',
      label: 'Take Attendance',
      accent: 'teal',
      onPress: () => navigation.navigate('TeacherAttendance', { classId: firstClassId }),
    },
    {
      key: 'holidays',
      icon: 'calendar-number-outline',
      label: 'Holidays',
      accent: 'orange',
      onPress: () => navigation.navigate('HolidayCalendar'),
    },
    {
      key: 'timetable',
      icon: 'time-outline',
      label: 'Class Timetable',
      accent: 'orange',
      onPress: () => navigation.navigate('Timetable', {}),
    },
    {
      key: 'notice',
      icon: 'megaphone-outline',
      label: 'Notice Board',
      accent: 'pink',
      onPress: () => navigation.navigate('NoticeBoard', {}),
    },
    {
      key: 'library',
      icon: 'library-outline',
      label: 'Library',
      accent: 'purple',
      onPress: () => navigation.navigate('Library'),
    },
    {
      key: 'exams',
      icon: 'school-outline',
      label: 'Exams',
      accent: 'blue',
      onPress: () => navigation.navigate('Exams'),
    },
    {
      key: 'fees',
      icon: 'cash-outline',
      label: 'Fee Management',
      accent: 'red',
      onPress: () => navigation.navigate('TeacherFees'),
    },
    {
      key: 'leave',
      icon: 'calendar-outline',
      label: 'Apply Leave',
      accent: 'orange',
      onPress: () => navigation.navigate('ApplyLeave', {}),
    },
  ];

  const topClasses = classes.slice(0, 3);
  const recentLeaves = leaveHistory.slice(0, 3);

  return (
    <TeacherScreen contentStyle={styles.scrollContent}>
      <View
        style={[
          styles.heroClip,
          {
            borderTopLeftRadius: HERO_TOP_RADIUS,
            borderTopRightRadius: HERO_TOP_RADIUS,
            backgroundColor: theme.colors.primary,
          },
        ]}
      >
        <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
          <Image
            source={require('../../../../../assets/eduvijna_logo_sidebar_white.png')}
            style={styles.heroWatermark}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <View style={styles.heroRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>TEACHER DASHBOARD</Text>
              <Text
                style={styles.heroGreeting}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                <Text style={styles.heroGreetingLead}>Welcome back, </Text>
                <Text style={styles.heroGreetingName}>{welcomeName}</Text>
              </Text>
              <Text style={styles.heroDate}>{formatDateLabel()}</Text>
            </View>
            <View style={styles.glanceCard}>
              <Text style={styles.glanceTitle}>Today at a glance</Text>
              <Text style={styles.glanceLine}>Classes today: {overview.todayClasses}</Text>
              <Text style={styles.glanceLine}>
                Attendance: {glanceAtt}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {status === 'idle' || status === 'loading' ? (
        <ScreenLoader message="Loading dashboard…" />
      ) : (
      <>
      <View style={styles.overviewWrap}>
        <SurfaceCard style={[styles.overviewCard, theme.shadow.medium]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metricsScroll}
          >
            {metrics.map((metric) => (
              <TouchableOpacity
                key={metric.key}
                style={styles.metricCard}
                onPress={metric.onPress}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={metric.label}
              >
                <Ionicons name={metric.icon} size={20} color={theme.colors.primary} />
                <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
                  {metric.value}
                </Text>
                <Text
                  style={[styles.metricLabel, { color: theme.colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {metric.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SurfaceCard>
      </View>

      <View style={styles.richRow}>
        <RichCard
          accent="blue"
          icon="people-outline"
          title="Students"
          value={String(overview.students)}
          hint={
            topClasses.length > 0
              ? topClasses.map((c) => `${c.code} · ${c.studentCount}`).join('  ·  ')
              : 'Active Students'
          }
          cta="Class Overview"
          onPress={goStudents}
        />
        <RichCard
          accent="orange"
          icon="checkbox-outline"
          title="Student Att. %"
          value={attLabel}
          hint={attHint}
          cta="Open attendance"
          onPress={goAttendance}
        />
      </View>

      <SurfaceCard style={[styles.attOverviewCard, theme.shadow.light]}>
        <SectionHeader
          title="Attendance Overview"
          actionLabel="View All"
          onAction={goAttendance}
        />
        <View style={styles.attOverviewCenter}>
          <Text style={[styles.attOverviewValue, { color: theme.colors.textPrimary }]}>
            {avgAttLabel}
          </Text>
          <Text style={[styles.attOverviewLabel, { color: theme.colors.textSecondary }]}>
            Avg. Att.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.attOverviewBtn, { backgroundColor: theme.colors.primary }]}
          onPress={goAttendance}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Take Attendance"
        >
          <Text style={styles.attOverviewBtnText}>Take Attendance</Text>
        </TouchableOpacity>
      </SurfaceCard>

      <View style={styles.richRow}>
        <RichCard
          accent="blue"
          icon="calendar-outline"
          title="Today's Classes"
          value={String(overview.todayClasses)}
          hint={
            schedule.length > 0
              ? schedule
                  .slice(0, 2)
                  .map((p) => p.subject)
                  .join(' · ')
              : 'On your timetable'
          }
          cta="Open timetable"
          onPress={goTimetable}
        />
        <RichCard
          accent="red"
          icon="trending-up-outline"
          title="Fees Pending"
          value={formatCurrency(overview.feesOverdue || 0)}
          hint="Total Outstanding"
          cta="Fee Management"
          onPress={goFees}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Quick Actions"
          actionLabel="View All"
          onAction={() => navigation.navigate('TeacherTabs', { screen: 'TeacherMore' })}
        />
        <QuickActionGrid actions={actions} columns={4} />
      </View>

      <SurfaceCard style={styles.section}>
        <SectionHeader
          title="Today's Timetable"
          icon="calendar-outline"
          actionLabel="View All"
          onAction={() => navigation.navigate('Timetable', {})}
        />
        {schedule.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No classes today"
            message="Nothing on your timetable for today."
          />
        ) : (
          schedule.map((period, index) => (
            <View
              key={period.id}
              style={[
                styles.scheduleRow,
                index < schedule.length - 1 && {
                  borderBottomColor: theme.colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={[styles.scheduleTime, { color: theme.colors.textSecondary }]}>
                {period.startTime}
                {'\n'}– {period.endTime}
              </Text>
              <View style={[styles.scheduleDot, { backgroundColor: theme.colors.primary }]} />
              <View style={styles.scheduleInfo}>
                <Text style={[styles.scheduleClass, { color: theme.colors.textPrimary }]}>
                  Class {period.classCode}
                </Text>
                <Text style={[styles.scheduleSubject, { color: theme.colors.textSecondary }]}>
                  {period.subject}
                </Text>
              </View>
              {period.room ? (
                <View style={[styles.roomChip, { backgroundColor: theme.colors.surfaceAlt }]}>
                  <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.roomText, { color: theme.colors.textSecondary }]}>
                    {period.room}
                  </Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </SurfaceCard>

      <View style={styles.bottomGrid}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('LeaveDashboard')}
        >
          <SurfaceCard style={styles.halfCard}>
            <View style={styles.halfHeader}>
              <View style={[styles.halfIcon, { backgroundColor: theme.colors.tintTeal }]}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.halfHeaderText}>
                <Text style={[styles.halfTitle, { color: theme.colors.textPrimary }]}>
                  My Leave
                </Text>
                <Text style={[styles.halfLink, { color: theme.colors.primary }]}>
                  View all ›
                </Text>
              </View>
            </View>
            {recentLeaves.length === 0 ? (
              <Text style={[styles.halfEmpty, { color: theme.colors.textSecondary }]}>
                No leave applications
              </Text>
            ) : (
              recentLeaves.slice(0, 2).map((leave) => (
                <View key={leave.id} style={styles.leaveRow}>
                  <Badge
                    label={leave.status}
                    accent={
                      leave.status === 'approved'
                        ? 'green'
                        : leave.status === 'rejected'
                          ? 'red'
                          : leave.status === 'cancelled'
                            ? 'red'
                            : 'orange'
                    }
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.leaveTitle, { color: theme.colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {leave.typeLabel}
                    </Text>
                    <Text
                      style={{ color: theme.colors.textSecondary, fontSize: 11 }}
                      numberOfLines={1}
                    >
                      {leave.dateRange}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </SurfaceCard>
        </TouchableOpacity>

        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.88} onPress={goFees}>
          <SurfaceCard style={styles.halfCard}>
            <View style={styles.halfHeader}>
              <View style={[styles.halfIcon, { backgroundColor: theme.colors.tintOrange }]}>
                <Ionicons name="cash-outline" size={18} color={theme.colors.warning} />
              </View>
              <View style={styles.halfHeaderText}>
                <Text style={[styles.halfTitle, { color: theme.colors.textPrimary }]}>
                  Fees
                </Text>
                <Text style={[styles.halfLink, { color: theme.colors.primary }]}>
                  View all ›
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.feesValue,
                {
                  color:
                    (overview.feesOverdue || 0) > 0
                      ? theme.colors.danger
                      : theme.colors.success,
                },
              ]}
            >
              {formatCurrency(overview.feesOverdue || 0)}
            </Text>
            <Text style={[styles.feesCaption, { color: theme.colors.textSecondary }]}>
              Total outstanding
            </Text>
          </SurfaceCard>
        </TouchableOpacity>
      </View>

      <SurfaceCard style={styles.section}>
        <SectionHeader
          title="Announcements"
          icon="megaphone-outline"
          actionLabel="View All"
          onAction={() => navigation.navigate('NoticeBoard', {})}
        />
        {announcements.length === 0 ? (
          <EmptyState
            icon="megaphone-outline"
            title="No announcements"
            message="No announcements."
          />
        ) : (
          announcements.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.announceRow}>
              <View style={[styles.announceIcon, { backgroundColor: theme.colors.tintTeal }]}>
                <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.announceBody}>
                <View style={styles.announceTitleRow}>
                  {item.isNew ? <Badge label="NEW" accent="green" /> : null}
                  <Text style={[styles.announceTitle, { color: theme.colors.textPrimary }]}>
                    {item.title}
                  </Text>
                </View>
                {item.body ? (
                  <Text
                    style={[styles.announceText, { color: theme.colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.body}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.announceDate, { color: theme.colors.textSecondary }]}>
                {item.date}
              </Text>
            </View>
          ))
        )}
      </SurfaceCard>
      </>
      )}
    </TeacherScreen>
  );
}

function RichCard({
  accent,
  icon,
  title,
  value,
  hint,
  cta,
  onPress,
}: {
  accent: AccentKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  hint: string;
  cta: string;
  onPress: () => void;
}) {
  const theme = useTeacherTheme();
  const colors = accentColors(theme.colors, accent);
  return (
    <TouchableOpacity
      style={[styles.richCard, { backgroundColor: theme.colors.surface }, theme.shadow.light]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.richIcon, { backgroundColor: colors.bg }]}>
        <Ionicons name={icon} size={20} color={colors.fg} />
      </View>
      <Text style={[styles.richTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      <Text style={[styles.richValue, { color: theme.colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.richHint, { color: theme.colors.textSecondary }]} numberOfLines={2}>
        {hint}
      </Text>
      <View style={styles.richCtaRow}>
        <Text style={[styles.richCta, { color: theme.colors.primary }]}>{cta}</Text>
        <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 24 },
  heroClip: { width: '100%', overflow: 'hidden' },
  hero: {
    width: '100%',
    minHeight: 132,
    paddingBottom: HERO_OVERLAP + 12,
    position: 'relative',
  },
  heroWatermark: {
    position: 'absolute',
    right: -32,
    top: -16,
    width: 240,
    height: 240,
    opacity: 0.12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroTextWrap: { flex: 1, paddingRight: 4 },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  heroGreeting: { color: '#FFFFFF', fontSize: 28, lineHeight: 34 },
  heroGreetingLead: {
    fontFamily: FONT_FAMILY.medium,
    fontWeight: '500',
    fontSize: 28,
    lineHeight: 34,
    color: '#FFFFFF',
  },
  heroGreetingName: {
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 34,
    color: '#FFFFFF',
  },
  heroDate: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 8,
  },
  glanceCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 132,
  },
  glanceTitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  glanceLine: { color: 'rgba(255,255,255,0.92)', fontSize: 12, marginTop: 2 },

  overviewWrap: {
    marginTop: -HERO_OVERLAP,
    paddingHorizontal: 16,
    zIndex: 2,
    elevation: 4,
    marginBottom: 4,
  },
  overviewCard: { borderRadius: 16, elevation: 3, paddingVertical: 12 },
  metricsScroll: { gap: 10, paddingHorizontal: 4 },
  metricCard: {
    width: 100,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  metricValue: { fontSize: 20, fontWeight: '800' },
  metricLabel: { fontSize: 11, textAlign: 'center', lineHeight: 14 },

  richRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginHorizontal: 16,
  },
  attOverviewCard: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
  },
  attOverviewCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  attOverviewValue: { fontSize: 28, fontWeight: '800' },
  attOverviewLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  attOverviewBtn: {
    marginTop: 4,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  attOverviewBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  richCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  richIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  richTitle: { fontSize: 12, fontWeight: '600' },
  richValue: { fontSize: 22, fontWeight: '800' },
  richHint: { fontSize: 11, lineHeight: 15, minHeight: 30 },
  richCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  richCta: { fontSize: 12, fontWeight: '700' },

  section: { marginTop: 16, marginHorizontal: 16 },

  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  scheduleTime: { fontSize: 11, width: 64, lineHeight: 15 },
  scheduleDot: { width: 8, height: 8, borderRadius: 4 },
  scheduleInfo: { flex: 1, gap: 2 },
  scheduleClass: { fontSize: 14, fontWeight: '700' },
  scheduleSubject: { fontSize: 12 },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  roomText: { fontSize: 11, fontWeight: '500' },

  bottomGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginTop: 16,
    marginHorizontal: 16,
  },
  halfCard: { flex: 1, minHeight: 148, gap: 10 },
  halfHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  halfIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfHeaderText: { flex: 1, minWidth: 0, gap: 2 },
  halfTitle: { fontSize: 15, fontWeight: '800' },
  halfLink: { fontSize: 12, fontWeight: '600' },
  halfEmpty: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  leaveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  leaveTitle: { fontSize: 13, fontWeight: '600' },
  feesValue: { fontSize: 26, fontWeight: '800', marginTop: 2 },
  feesCaption: { fontSize: 12, fontWeight: '500' },

  announceRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  announceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  announceBody: { flex: 1, gap: 4 },
  announceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  announceTitle: { fontSize: 14, fontWeight: '700' },
  announceText: { fontSize: 12, lineHeight: 17 },
  announceDate: { fontSize: 11 },
});
