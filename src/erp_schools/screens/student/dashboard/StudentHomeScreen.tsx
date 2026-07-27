/**
 * Student Home — web StudentERPDashboard parity + mobile Quick Access /
 * Today's Schedule / AI extras.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  SurfaceCard,
  SectionHeader,
  Badge,
  StatusPill,
  ProgressBar,
  DonutChart,
  ScreenLoader,
  type PillStatus,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherSession } from '../../../hooks/useTeacherSession';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useOpenStudentTimetable } from '../../../hooks/useOpenStudentTimetable';
import { useStudentData } from '../../../hooks/useStudentData';
import { FONT_FAMILY } from '../../../../theme/fonts';
import {
  buildMonthCells,
  dateKey,
  formatCurrencyInr,
  formatDateLabel,
  ymd,
} from '../../../utils/studentDashboardMeta';
import { toLocalDateStr } from '../../../utils/apiHelpers';

const HERO_OVERLAP = 56;
const HERO_TOP_RADIUS = 24;

const SUBJECT_COLORS = [
  { bg: '#ecfeff', fg: '#0e7490' },
  { bg: '#f0fdf4', fg: '#15803d' },
  { bg: '#fff7ed', fg: '#c2410c' },
  { bg: '#faf5ff', fg: '#7e22ce' },
  { bg: '#eff6ff', fg: '#1d4ed8' },
  { bg: '#fdf2f8', fg: '#be185d' },
];

const SCHEDULE_STATUS: Record<string, PillStatus> = {
  completed: 'graded',
  upcoming: 'pending',
  ongoing: 'active',
};

const KIND_BADGE: Record<string, { label: string; accent: 'teal' | 'orange' | 'blue' | 'green' | 'purple' | 'pink' | 'red' }> = {
  exam: { label: 'Exam', accent: 'blue' },
  holiday: { label: 'Holiday', accent: 'orange' },
  announcement: { label: 'Notice', accent: 'teal' },
};

function MiniMonthCal({
  marked,
  accent,
  emptyLabel,
}: {
  marked: Set<string>;
  accent: string;
  emptyLabel: string;
}) {
  const theme = useTeacherTheme();
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const todayStr = toLocalDateStr(today);
  const cells = buildMonthCells(y, m);
  const monthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const hasAny = [...marked].some((d) => d.startsWith(todayStr.slice(0, 7)));

  return (
    <View>
      <Text style={[styles.calMonth, { color: theme.colors.textPrimary }]}>{monthLabel}</Text>
      <View style={styles.calWeekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={`${d}-${i}`} style={[styles.calDow, { color: theme.colors.textSecondary }]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {cells.map((day, i) => {
          if (day == null) return <View key={`e-${i}`} style={styles.calCell} />;
          const key = dateKey(y, m + 1, day);
          const isMarked = marked.has(key);
          const isToday = key === todayStr;
          return (
            <View
              key={key}
              style={[
                styles.calCell,
                isMarked && { backgroundColor: `${accent}22`, borderRadius: 8 },
                isToday && { borderWidth: 1, borderColor: accent, borderRadius: 8 },
              ]}
            >
              <Text
                style={[
                  styles.calDay,
                  { color: isMarked ? accent : theme.colors.textPrimary },
                  isMarked && { fontWeight: '800' },
                ]}
              >
                {day}
              </Text>
            </View>
          );
        })}
      </View>
      {!hasAny ? (
        <Text style={[styles.calEmpty, { color: theme.colors.textSecondary }]}>{emptyLabel}</Text>
      ) : null}
    </View>
  );
}

export default function StudentHomeScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const openTimetable = useOpenStudentTimetable();
  const { firstName } = useTeacherSession();
  const {
    profile,
    schedule,
    announcements,
    dashboard,
    status,
    refetch,
  } = useStudentData();

  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const bootstrappedRef = useRef(status === 'ready' || status === 'error');
  if (status === 'ready' || status === 'error') bootstrappedRef.current = true;

  const onRefresh = useCallback(() => {
    void refetchRef.current();
  }, []);

  const welcomeName =
    firstName && firstName !== 'Teacher' ? firstName : profile.name.split(' ')[0];

  const att = dashboard.attendanceBuckets;
  const fees = dashboard.feeSummary;
  const attPctDisplay =
    att.percentage % 1 === 0 ? `${att.percentage}%` : `${att.percentage.toFixed(1)}%`;

  const examMarked = useMemo(() => {
    const set = new Set<string>();
    for (const e of dashboard.examScheduleRaw) {
      const d = ymd(String(e.exam_date || ''));
      if (d) set.add(d);
    }
    return set;
  }, [dashboard.examScheduleRaw]);

  const holidayMarked = useMemo(() => {
    const set = new Set<string>();
    for (const h of dashboard.holidays) {
      const start = ymd(String(h.start_date || ''));
      const end = ymd(String(h.end_date || '')) || start;
      if (!start) continue;
      const cur = new Date(`${start}T12:00:00`);
      const last = new Date(`${end}T12:00:00`);
      while (cur <= last) {
        set.add(toLocalDateStr(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
    return set;
  }, [dashboard.holidays]);

  if (!bootstrappedRef.current && (status === 'idle' || status === 'loading')) {
    return (
      <TeacherScreen contentStyle={styles.scrollContent}>
        <ScreenLoader message="Loading dashboard…" />
      </TeacherScreen>
    );
  }

  const heroMeta = [
    dashboard.dateLabel,
    dashboard.classLabel,
    dashboard.studentMeta,
    dashboard.yearLabel,
    dashboard.schoolName,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <TeacherScreen
      contentStyle={styles.scrollContent}
      refreshing={status === 'loading'}
      onRefresh={onRefresh}
    >
      {/* Welcome hero */}
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
          <View style={styles.heroTextWrap}>
            <View style={styles.pillRow}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>Student Portal</Text>
              </View>
              <View style={[styles.heroPill, styles.heroPillAlt]}>
                <Text style={styles.heroPillText}>School ERP</Text>
              </View>
            </View>
            <Text
              style={styles.heroGreeting}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              <Text style={styles.heroGreetingLead}>Welcome back, </Text>
              <Text style={styles.heroGreetingName}>{welcomeName}!</Text>
            </Text>
            {heroMeta ? (
              <Text style={styles.heroSub} numberOfLines={3}>
                {heroMeta}
              </Text>
            ) : (
              <Text style={styles.heroSub}>Let&apos;s keep learning and grow today!</Text>
            )}
          </View>
        </View>
      </View>

      {/* Identity strip */}
      <View style={styles.cardWrap}>
        <SurfaceCard style={[styles.identityCard, theme.shadow.medium]}>
          <View style={styles.identityRow}>
            <View style={[styles.idAvatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.idAvatarText}>{dashboard.initials}</Text>
            </View>
            <View style={styles.identityInfo}>
              <Text style={[styles.identityName, { color: theme.colors.textPrimary }]}>
                {profile.name}
              </Text>
              <Text style={[styles.identityMeta, { color: theme.colors.textSecondary }]}>
                {dashboard.classLabel || profile.className || 'My Class'}
              </Text>
              {profile.rollNo ? (
                <View style={[styles.rollChip, { backgroundColor: theme.colors.surfaceAlt }]}>
                  <Text style={[styles.rollChipText, { color: theme.colors.textSecondary }]}>
                    Roll No. {profile.rollNo}
                  </Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.profileBtn, { borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('StudentProfile')}
              accessibilityRole="button"
              accessibilityLabel="View Profile"
            >
              <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.profileBtnText, { color: theme.colors.textSecondary }]}>
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        </SurfaceCard>
      </View>

      {/* 4 KPIs */}
      <View style={styles.kpiGrid}>
        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: theme.colors.tintTeal }]}
          onPress={() => navigation.navigate('StudentTabs', { screen: 'StudentAcademics' })}
          activeOpacity={0.85}
        >
          <Text style={[styles.kpiValue, { color: theme.colors.primary }]}>
            {dashboard.subjectCount}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Subjects</Text>
          <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {dashboard.subjectCount} enrollments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.kpiCard,
            { backgroundColor: att.percentage >= 75 ? theme.colors.tintGreen : '#FEE2E2' },
          ]}
          onPress={() => navigation.navigate('Attendance')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.kpiValue,
              { color: att.percentage >= 75 ? theme.colors.success : theme.colors.danger },
            ]}
          >
            {attPctDisplay}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Attendance</Text>
          <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {att.periodLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.kpiCard,
            { backgroundColor: fees.due > 0 ? theme.colors.tintOrange : theme.colors.tintGreen },
          ]}
          onPress={() => navigation.navigate('FeeDashboard')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.kpiValue,
              { color: fees.due > 0 ? theme.colors.warning : theme.colors.success, fontSize: 16 },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {fees.dueLabel}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Fee Due</Text>
          <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {fees.nextDueDate
              ? `Due ${formatDateLabel(fees.nextDueDate)}`
              : `Paid ${formatCurrencyInr(fees.paid)}`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: theme.colors.tintBlue }]}
          onPress={() => navigation.navigate('Notices')}
          activeOpacity={0.85}
        >
          <Text style={[styles.kpiValue, { color: theme.colors.info }]}>
            {dashboard.noticeCount}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Notices</Text>
          <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {announcements[0]?.title || 'Latest updates'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Current Class + Pending Fees */}
      <View style={styles.section}>
        <SurfaceCard>
          <Text style={[styles.cardEyebrow, { color: theme.colors.primary }]}>Current Class</Text>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            {dashboard.classLabel || 'My Class'}
          </Text>
          <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>
            {[
              dashboard.yearLabel || 'Academic year',
              dashboard.subjectCount > 0 ? `${dashboard.subjectCount} enrolled subjects` : '',
              dashboard.overallAvgScore != null ? `Avg ${dashboard.overallAvgScore}%` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <View style={{ marginTop: 12 }}>
            <ProgressBar percent={dashboard.weeklySchedulePct} height={10} />
          </View>
          <Text style={[styles.progressHint, { color: theme.colors.primary }]}>
            {dashboard.weeklySchedulePct}% of weekly schedule completed
          </Text>
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SurfaceCard
          style={{
            backgroundColor: fees.due > 0 ? theme.colors.tintOrange : theme.colors.tintGreen,
          }}
          onPress={() => navigation.navigate('FeeDashboard')}
        >
          <Text style={[styles.cardTitleSm, { color: theme.colors.textPrimary }]}>Pending Fees</Text>
          <Text
            style={[
              styles.feeAmount,
              { color: fees.due > 0 ? '#C2410C' : theme.colors.success },
            ]}
          >
            {fees.dueLabel}
          </Text>
          <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>
            {fees.nextDueDisplay}
          </Text>
          <View style={styles.miniStatRow}>
            {[
              { label: 'Total', value: formatCurrencyInr(fees.total) },
              { label: 'Paid', value: formatCurrencyInr(fees.paid) },
              { label: 'Due', value: formatCurrencyInr(fees.due) },
            ].map((s) => (
              <View key={s.label} style={styles.miniStat}>
                <Text style={[styles.miniStatLabel, { color: theme.colors.textSecondary }]}>
                  {s.label}
                </Text>
                <Text style={[styles.miniStatValue, { color: theme.colors.textPrimary }]}>
                  {s.value}
                </Text>
              </View>
            ))}
          </View>
        </SurfaceCard>
      </View>

      {/* Attendance Overview */}
      <View style={styles.section}>
        <SurfaceCard onPress={() => navigation.navigate('Attendance')}>
          <SectionHeader title="Attendance Overview" />
          {att.isFutureYear ? (
            <Text style={[styles.emptyInline, { color: theme.colors.textSecondary }]}>
              Academic year has not started yet.
            </Text>
          ) : att.markedDays === 0 && att.totalDays === 0 ? (
            <Text style={[styles.emptyInline, { color: theme.colors.textSecondary }]}>
              Attendance data not available yet.
            </Text>
          ) : (
            <View style={styles.attRow}>
              <DonutChart
                size={120}
                strokeWidth={14}
                centerValue={attPctDisplay}
                centerLabel="Present"
                segments={[
                  { value: Math.max(att.present, 0), color: '#16A34A' },
                  { value: Math.max(att.absent, 0), color: '#DC2626' },
                  { value: Math.max(att.leave, 0), color: '#F97316' },
                ]}
              />
              <View style={styles.attLegend}>
                {[
                  { label: 'Present', value: att.present, color: '#16A34A' },
                  { label: 'Absent', value: att.absent, color: '#DC2626' },
                  { label: 'Leave', value: att.leave, color: '#F97316' },
                  { label: 'Total Days', value: att.totalDays, color: '#64748B' },
                ].map((row) => (
                  <View key={row.label} style={styles.legendRow}>
                    <View style={styles.legendLeft}>
                      <View style={[styles.legendDot, { backgroundColor: row.color }]} />
                      <Text style={[styles.legendLabel, { color: theme.colors.textPrimary }]}>
                        {row.label}
                      </Text>
                    </View>
                    <Text style={[styles.legendValue, { color: theme.colors.textPrimary }]}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </SurfaceCard>
      </View>

      {/* My Subjects */}
      <View style={styles.section}>
        <SurfaceCard>
          <SectionHeader
            title="My Subjects"
            icon="book-outline"
            actionLabel="View All"
            onAction={() => navigation.navigate('StudentTabs', { screen: 'StudentAcademics' })}
          />
          {dashboard.subjects.length === 0 ? (
            <Text style={[styles.emptyInline, { color: theme.colors.textSecondary }]}>
              No subject enrollments yet. Ask your school to enroll you in subjects.
            </Text>
          ) : (
            <>
              {(dashboard.classLabel || dashboard.overallAvgScore != null) && (
                <View
                  style={[
                    styles.overallBanner,
                    { backgroundColor: theme.colors.tintTeal, borderColor: theme.colors.border },
                  ]}
                >
                  <View>
                    <Text style={[styles.cardEyebrow, { color: theme.colors.primary }]}>
                      Overall class
                    </Text>
                    <Text style={[styles.cardTitleSm, { color: theme.colors.textPrimary }]}>
                      {dashboard.classLabel || 'Academic class'}
                    </Text>
                  </View>
                  <View style={styles.overallMeta}>
                    <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>
                      <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>
                        {dashboard.subjectCount}
                      </Text>{' '}
                      enrolled
                    </Text>
                    <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>
                      Attendance{' '}
                      <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>
                        {attPctDisplay}
                      </Text>
                    </Text>
                    {dashboard.overallAvgScore != null ? (
                      <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>
                        Avg score{' '}
                        <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>
                          {dashboard.overallAvgScore}%
                        </Text>
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}
              <View style={styles.subjectGrid}>
                {dashboard.subjects.map((s, i) => {
                  const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                  const pct = s.percentage;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.subjectCard, { backgroundColor: color.bg }]}
                      onPress={() =>
                        navigation.navigate('SubjectDetails', { subjectId: s.id })
                      }
                      activeOpacity={0.85}
                    >
                      <View style={styles.subjectTop}>
                        <View style={[styles.subjectRing, { borderColor: color.fg }]}>
                          <Text style={[styles.subjectPct, { color: color.fg }]}>
                            {pct != null && pct > 0 ? `${Math.round(pct)}%` : 'N/A'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.subjectName, { color: theme.colors.textPrimary }]}
                            numberOfLines={2}
                          >
                            {s.classroomName || s.name}
                          </Text>
                          {s.teacher ? (
                            <Text
                              style={[styles.cardMeta, { color: theme.colors.textSecondary }]}
                              numberOfLines={1}
                            >
                              {s.teacher}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </SurfaceCard>
      </View>

      {/* Exam Schedule */}
      <View style={styles.section}>
        <SurfaceCard onPress={() => navigation.navigate('ExamSchedule')}>
          <SectionHeader
            title="Exam Schedule"
            icon="calendar-outline"
            actionLabel="Open"
            onAction={() => navigation.navigate('ExamSchedule')}
          />
          {dashboard.examHeadline ? (
            <View style={[styles.examHeadline, { backgroundColor: theme.colors.tintBlue }]}>
              <Text style={[styles.cardTitleSm, { color: theme.colors.textPrimary }]}>
                {dashboard.examHeadline.title}
              </Text>
              <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>
                {dashboard.examHeadline.detail}
              </Text>
            </View>
          ) : (
            <Text style={[styles.emptyInline, { color: theme.colors.textSecondary }]}>
              No upcoming exams scheduled.
            </Text>
          )}
          <MiniMonthCal
            marked={examMarked}
            accent={theme.colors.info}
            emptyLabel="No exams in this month"
          />
        </SurfaceCard>
      </View>

      {/* Holiday Calendar */}
      <View style={styles.section}>
        <SurfaceCard onPress={() => navigation.navigate('HolidayCalendar')}>
          <SectionHeader
            title="Holiday Calendar"
            icon="sunny-outline"
            actionLabel="Open"
            onAction={() => navigation.navigate('HolidayCalendar')}
          />
          <MiniMonthCal
            marked={holidayMarked}
            accent="#EA580C"
            emptyLabel="No holidays in this month"
          />
        </SurfaceCard>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <SurfaceCard>
          <SectionHeader title="Quick Stats" />
          <View style={styles.quickStats}>
            {[
              { label: 'Subjects', value: String(dashboard.subjectCount) },
              { label: 'Attendance', value: attPctDisplay },
              {
                label: 'Avg Score',
                value:
                  dashboard.overallAvgScore != null ? `${dashboard.overallAvgScore}%` : '—',
              },
              { label: 'Fee Due', value: fees.dueLabel },
            ].map((s) => (
              <View key={s.label} style={styles.quickStat}>
                <Text style={[styles.kpiValue, { color: theme.colors.primary, fontSize: 16 }]}>
                  {s.value}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </SurfaceCard>
      </View>

      {/* Upcoming Events */}
      <View style={styles.section}>
        <SurfaceCard>
          <SectionHeader title="Upcoming Events" icon="calendar-number-outline" />
          {dashboard.upcomingEvents.length === 0 ? (
            <Text style={[styles.emptyInline, { color: theme.colors.textSecondary }]}>
              No upcoming events this month.
            </Text>
          ) : (
            dashboard.upcomingEvents.map((e) => {
              const badge = KIND_BADGE[e.kind] || KIND_BADGE.announcement;
              return (
                <View
                  key={e.id}
                  style={[
                    styles.eventRow,
                    { borderBottomColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.eventDateCol}>
                    <Text style={[styles.eventDay, { color: theme.colors.primary }]}>
                      {formatDateLabel(e.date).split(' ')[0]}
                    </Text>
                    <Text style={[styles.eventMon, { color: theme.colors.textSecondary }]}>
                      {formatDateLabel(e.date).split(' ').slice(1, 2).join(' ')}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.announceTitleRow}>
                      <Badge label={badge.label} accent={badge.accent} />
                      <Text
                        style={[styles.announceTitle, { color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {e.title}
                      </Text>
                    </View>
                    <Text
                      style={[styles.announceText, { color: theme.colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {e.brief}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </SurfaceCard>
      </View>

      {/* Recent Announcements */}
      <View style={styles.section}>
        <SurfaceCard>
          <SectionHeader
            title="Recent Announcements"
            icon="megaphone-outline"
            actionLabel="View All"
            onAction={() => navigation.navigate('Notices')}
          />
          {announcements.length === 0 ? (
            <Text style={[styles.emptyInline, { color: theme.colors.textSecondary }]}>
              No notices yet.
            </Text>
          ) : (
            announcements.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.announceRow}
                onPress={() => navigation.navigate('Notices')}
                activeOpacity={0.85}
              >
                <View style={[styles.announceIcon, { backgroundColor: theme.colors.tintTeal }]}>
                  <Ionicons name="megaphone-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.announceBody}>
                  <View style={styles.announceTitleRow}>
                    {item.isNew ? <Badge label="NEW" accent="green" /> : null}
                    <Text
                      style={[styles.announceTitle, { color: theme.colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  </View>
                  <Text
                    style={[styles.announceText, { color: theme.colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.body}
                  </Text>
                </View>
                <Text style={[styles.announceDate, { color: theme.colors.textSecondary }]}>
                  {item.date}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </SurfaceCard>
      </View>

      {/* Mobile extras — Quick Access + AI card hidden (static nav chrome only) */}
      {/*
      <View style={styles.section}>
        <SectionHeader
          title="Quick Access"
          actionLabel="View All"
          onAction={() => navigation.navigate('StudentTabs', { screen: 'StudentMore' })}
        />
        <QuickActionGrid actions={actions} columns={4} />
      </View>
      */}

      <View style={[styles.section, { marginBottom: 24 }]}>
        <SurfaceCard onPress={openTimetable}>
          <SectionHeader
            title="Today's Schedule"
            icon="calendar-outline"
            actionLabel="View Timetable"
            onAction={openTimetable}
          />
          {schedule.length === 0 ? (
            <Text style={[styles.emptyInline, { color: theme.colors.textSecondary }]}>
              No classes scheduled for today.
            </Text>
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
                  <Text style={[styles.scheduleSubject, { color: theme.colors.textPrimary }]}>
                    {period.subject}
                  </Text>
                  <Text style={[styles.scheduleMeta, { color: theme.colors.textSecondary }]}>
                    {period.room} • {period.teacher}
                  </Text>
                </View>
                <StatusPill
                  status={SCHEDULE_STATUS[period.status]}
                  label={
                    period.status === 'completed'
                      ? 'Completed'
                      : period.status === 'ongoing'
                        ? 'Ongoing'
                        : 'Upcoming'
                  }
                />
              </View>
            ))
          )}
        </SurfaceCard>
      </View>

      {/*
      <View style={[styles.section, { marginBottom: 24 }]}>
        <SurfaceCard
          style={{ backgroundColor: theme.colors.tintTeal }}
          onPress={() => navigation.navigate('AITutor')}
        >
          <View style={styles.aiRow}>
            <View style={[styles.aiIcon, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.aiBody}>
              <View style={styles.announceTitleRow}>
                <Text style={[styles.aiTitle, { color: theme.colors.textPrimary }]}>
                  AI Learning Assistant
                </Text>
                <Badge label="NEW" accent="green" />
              </View>
              <Text style={[styles.aiSub, { color: theme.colors.textSecondary }]}>
                Get instant help with any subject
              </Text>
            </View>
            <View style={[styles.askBtn, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.askBtnText}>Ask Now</Text>
            </View>
          </View>
        </SurfaceCard>
      </View>
      */}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 0, paddingTop: 0 },

  heroClip: { width: '100%', overflow: 'hidden' },
  hero: { width: '100%', minHeight: 140, paddingBottom: HERO_OVERLAP + 12, position: 'relative' },
  heroWatermark: {
    position: 'absolute',
    right: -32,
    top: -16,
    width: 220,
    height: 220,
    opacity: 0.12,
  },
  heroTextWrap: { paddingHorizontal: 20, paddingTop: 16, paddingRight: 80 },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  heroPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroPillAlt: { backgroundColor: 'rgba(255,255,255,0.28)' },
  heroPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  heroGreeting: { color: '#FFFFFF', fontSize: 22, lineHeight: 28 },
  heroGreetingLead: { fontFamily: FONT_FAMILY.medium, fontWeight: '500' },
  heroGreetingName: { fontFamily: FONT_FAMILY.bold, fontWeight: '700' },
  heroSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 6,
    lineHeight: 18,
  },

  cardWrap: {
    marginTop: -HERO_OVERLAP,
    paddingHorizontal: 16,
    zIndex: 2,
    elevation: 4,
    marginBottom: 4,
  },
  identityCard: { borderRadius: 16, elevation: 3 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  idAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idAvatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  identityInfo: { flex: 1, gap: 2 },
  identityName: { fontSize: 16, fontWeight: '700' },
  identityMeta: { fontSize: 13 },
  rollChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  rollChipText: { fontSize: 11, fontWeight: '600' },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  profileBtnText: { fontSize: 11, fontWeight: '600' },

  kpiGrid: {
    marginTop: 12,
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 92,
  },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  kpiLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  kpiSub: { fontSize: 11, marginTop: 2 },

  section: { marginTop: 14, marginHorizontal: 16 },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  cardTitleSm: { fontSize: 15, fontWeight: '800' },
  cardMeta: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  progressHint: { marginTop: 8, fontSize: 12, fontWeight: '700' },
  feeAmount: { fontSize: 28, fontWeight: '800', marginTop: 6 },
  miniStatRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  miniStat: { flex: 1, alignItems: 'center' },
  miniStatLabel: { fontSize: 11 },
  miniStatValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  attRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  attLegend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 13, fontWeight: '600' },
  legendValue: { fontSize: 14, fontWeight: '700' },

  overallBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    gap: 8,
  },
  overallMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectCard: { width: '47%', flexGrow: 1, borderRadius: 14, padding: 12 },
  subjectTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subjectRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectPct: { fontSize: 11, fontWeight: '800' },
  subjectName: { fontSize: 13, fontWeight: '700' },

  examHeadline: { padding: 12, borderRadius: 12, marginBottom: 12 },
  calMonth: { fontSize: 14, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  calWeekRow: { flexDirection: 'row', marginBottom: 4 },
  calDow: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDay: { fontSize: 12 },
  calEmpty: { textAlign: 'center', fontSize: 12, marginTop: 8 },

  quickStats: { flexDirection: 'row', flexWrap: 'wrap' },
  quickStat: { width: '50%', paddingVertical: 10, alignItems: 'center' },

  eventRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  eventDateCol: { width: 44, alignItems: 'center' },
  eventDay: { fontSize: 16, fontWeight: '800' },
  eventMon: { fontSize: 11 },

  emptyInline: { fontSize: 13, paddingVertical: 8, lineHeight: 18 },

  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  scheduleTime: { fontSize: 11, width: 64, lineHeight: 15 },
  scheduleDot: { width: 8, height: 8, borderRadius: 4 },
  scheduleInfo: { flex: 1, gap: 2 },
  scheduleSubject: { fontSize: 14, fontWeight: '700' },
  scheduleMeta: { fontSize: 12 },

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
  announceTitle: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  announceText: { fontSize: 12, lineHeight: 17 },
  announceDate: { fontSize: 11 },

  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBody: { flex: 1, gap: 2 },
  aiTitle: { fontSize: 14, fontWeight: '700' },
  aiSub: { fontSize: 12 },
  askBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  askBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
