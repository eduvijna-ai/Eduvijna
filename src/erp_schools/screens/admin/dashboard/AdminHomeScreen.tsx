/**
 * Admin Home — mobile command center with web admin dashboard parity.
 * Keeps existing hero / School Overview / alerts / quick actions shell;
 * binds live APIs via useAdminDashboardData and adds ops cards.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  QuickActionGrid,
  DonutChart,
  ScreenLoader,
  EmptyState,
  ProgressBar,
  AcademicYearPill,
  type QuickAction,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useAdminDashboardData } from '../../../hooks/useAdminDashboardData';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import { accentColors } from '../../../theme/accents';
import { FONT_FAMILY } from '../../../../theme/fonts';
import {
  buildMonthCells,
  dateKey,
  formatCurrency,
  formatPct,
  shortYearLabel,
} from '../../../utils/adminDashboardMeta';
import { toLocalDateStr } from '../../../utils/apiHelpers';

const HERO_OVERLAP = 72;
const HERO_TOP_RADIUS = 24;

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

function MetricRow({
  label,
  value,
  badge,
  badgeColor,
  onPress,
}: {
  label: string;
  value: string;
  badge?: string;
  badgeColor?: string;
  onPress?: () => void;
}) {
  const theme = useTeacherTheme();
  const row = (
    <View style={[styles.metricRow, { borderBottomColor: theme.colors.border }]}>
      <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <View style={styles.metricRight}>
        <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>{value}</Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: `${badgeColor || theme.colors.primary}18` }]}>
            <Text style={[styles.badgeText, { color: badgeColor || theme.colors.primary }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
  if (!onPress) return row;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {row}
    </TouchableOpacity>
  );
}

function FeeLegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.legendValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

export default function AdminHomeScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const dash = useAdminDashboardData();
  const { academicYears, selectedYear, selectedYearId, setSelectedYearId } = useAcademicYear();

  const refetchRef = useRef(dash.refetch);
  refetchRef.current = dash.refetch;
  const onRefresh = useCallback(() => {
    void refetchRef.current();
  }, []);

  const yearPill = useMemo(() => {
    if (!selectedYear || academicYears.length === 0) {
      const label = dash.academicYearLabel || '—';
      return (
        <AcademicYearPill value={label} options={[label]} onChange={() => undefined} />
      );
    }
    return (
      <AcademicYearPill
        value={shortYearLabel(selectedYear.name)}
        options={academicYears.map((y) => shortYearLabel(y.name))}
        onChange={(label) => {
          const match = academicYears.find(
            (y) => shortYearLabel(y.name) === label || y.name === label,
          );
          if (match && match.id !== selectedYearId) setSelectedYearId(match.id);
        }}
      />
    );
  }, [academicYears, dash.academicYearLabel, selectedYear, selectedYearId, setSelectedYearId]);

  const fee = dash.fee;
  const collected = fee.totalCollected || fee.thisMonthCollection;
  const pending = fee.totalPending;
  const overdue = fee.totalOverdue;
  const feeTotal = Math.max(collected + pending + overdue, 1);

  const studentPresent = dash.trend.reduce((s, t) => s + t.present, 0);
  const studentAbsent = dash.trend.reduce((s, t) => s + t.absent, 0);
  const studentLate = dash.trend.reduce((s, t) => s + t.late, 0);
  const studentAttPct = dash.todayAttendancePct ?? dash.avgAttendancePct ?? 0;

  const payrollPct =
    dash.modules.payroll.staff > 0
      ? Math.round((dash.modules.payroll.processed / dash.modules.payroll.staff) * 100)
      : 0;

  const classTotal = dash.classRows.reduce((s, c) => s + c.studentCount, 0) || 1;
  const topClasses = [...dash.classRows]
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, 5);

  const actions: QuickAction[] = [
    { key: 'add-student', icon: 'person-add-outline', label: 'Add Student', accent: 'blue', onPress: () => navigation.navigate('AdmissionsDashboard') },
    { key: 'add-staff', icon: 'person-outline', label: 'Add Staff', accent: 'blue', onPress: () => navigation.navigate('StaffManagement') },
    { key: 'add-class', icon: 'book-outline', label: 'Add Class', accent: 'orange', onPress: () => navigation.navigate('Classes') },
    { key: 'fees', icon: 'cash-outline', label: 'Collect Fees', accent: 'green', onPress: () => navigation.navigate('FeeCollection') },
    { key: 'subjects', icon: 'library-outline', label: 'Assign Subjects', accent: 'blue', onPress: () => navigation.navigate('Classes') },
    { key: 'attendance', icon: 'checkbox-outline', label: 'Mark Attendance', accent: 'green', onPress: () => navigation.navigate('AttendanceDashboard') },
    { key: 'notices', icon: 'megaphone-outline', label: 'Notices', accent: 'pink', onPress: () => navigation.navigate('Announcements') },
    { key: 'exams', icon: 'calendar-outline', label: 'Exam Schedule', accent: 'blue', onPress: () => navigation.navigate('Exams') },
    { key: 'timetable', icon: 'time-outline', label: 'Timetable', accent: 'green', onPress: () => navigation.navigate('Timetable') },
    { key: 'enquiry', icon: 'chatbubble-ellipses-outline', label: 'Add Enquiry', accent: 'teal', onPress: () => navigation.navigate('AdmissionApplications') },
    { key: 'transport', icon: 'bus-outline', label: 'Transport', accent: 'blue', onPress: () => navigation.navigate('TransportDashboard') },
    { key: 'hostel', icon: 'bed-outline', label: 'Hostel', accent: 'teal', onPress: () => navigation.navigate('HostelDashboard') },
    { key: 'inventory', icon: 'cube-outline', label: 'Inventory', accent: 'orange', onPress: () => navigation.navigate('InventoryDashboard') },
    { key: 'biometric', icon: 'finger-print-outline', label: 'Biometric', accent: 'blue', onPress: () => navigation.navigate('BiometricDashboard') },
    { key: 'analytics', icon: 'analytics-outline', label: 'Analytics', accent: 'teal', onPress: () => navigation.navigate('AnalyticsDashboard') },
    { key: 'library', icon: 'library-outline', label: 'Library', accent: 'teal', onPress: () => navigation.navigate('LibraryDashboard') },
  ];

  const overviewKpis = useMemo(
    () =>
      dash.kpis.map((kpi) => {
        if (kpi.key === 'students') {
          return {
            ...kpi,
            onPress: () => navigation.navigate('Classes', { initialTab: 'students' }),
          };
        }
        if (kpi.key === 'teachers') {
          return {
            ...kpi,
            onPress: () => navigation.navigate('Classes', { initialTab: 'teachers' }),
          };
        }
        if (kpi.key === 'classes') {
          return {
            ...kpi,
            onPress: () => navigation.navigate('Classes', { initialTab: 'classes' }),
          };
        }
        if (kpi.key === 'attendance') {
          return {
            ...kpi,
            onPress: () => navigation.navigate('AttendanceDashboard'),
          };
        }
        return kpi;
      }),
    [dash.kpis, navigation],
  );

  const nextExam = [...dash.examSchedules]
    .filter((e) => e.examDate >= dash.today)
    .sort((a, b) => a.examDate.localeCompare(b.examDate))[0];

  if (dash.status === 'idle' || dash.status === 'loading') {
    return (
      <TeacherScreen contentStyle={styles.scrollContent}>
        <ScreenLoader message="Loading dashboard…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      contentStyle={styles.scrollContent}
      refreshing={dash.refreshing}
      onRefresh={onRefresh}
    >
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
            <Text
              style={styles.heroGreeting}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              <Text style={styles.heroGreetingLead}>{dash.greeting}, </Text>
              <Text style={styles.heroGreetingName}>{dash.firstName}</Text>
              <Text style={styles.heroGreetingLead}> 👋</Text>
            </Text>
            <Text style={styles.heroSub}>
              {dash.schoolName}
              {dash.academicYearLabel ? ` · AY ${dash.academicYearLabel}` : ''}
            </Text>
            <Text style={styles.heroDate}>{dash.dateLabel}</Text>
          </View>
        </View>
      </View>

      {/* School Overview */}
      <View style={styles.cardWrap}>
        <SurfaceCard style={[styles.overviewCard, theme.shadow.medium]}>
          <View style={styles.overviewHeader}>
            <View style={styles.overviewTitleRow}>
              <Ionicons name="business-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.overviewTitle, { color: theme.colors.textPrimary }]}>
                School Overview
              </Text>
            </View>
            <View style={styles.overviewActions}>
              {yearPill}
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => navigation.navigate('SchoolOverview')}
                accessibilityRole="button"
                accessibilityLabel="View Full Report"
              >
                <Text style={[styles.linkText, { color: theme.colors.primary }]}>View Full Report</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <StatGrid items={overviewKpis} columns={2} variant="tinted" />

          <View style={[styles.secondaryRow, { borderTopColor: theme.colors.border }]}>
            {dash.secondaryKpis.map((kpi, index) => (
              <React.Fragment key={kpi.key}>
                {index > 0 ? (
                  <View style={[styles.secondaryDivider, { backgroundColor: theme.colors.border }]} />
                ) : null}
                <View style={styles.secondary}>
                  <Text style={[styles.secondaryValue, { color: theme.colors.primary }]}>
                    {kpi.value}
                  </Text>
                  <Text
                    style={[styles.secondaryLabel, { color: theme.colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {kpi.label}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </SurfaceCard>
      </View>

      {dash.error ? (
        <View style={styles.section}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn’t refresh some data"
            message={dash.error}
          />
        </View>
      ) : null}

      {/* Important Alerts list (web ChartsRow) */}
      {dash.alerts.length > 0 ? (
        <SurfaceCard style={styles.section}>
          <SectionHeader title="Important Alerts" />
          {dash.alerts.map((alert, index) => {
            const accent = accentColors(theme.colors, alert.accent);
            return (
              <TouchableOpacity
                key={alert.id}
                style={[
                  styles.insightRow,
                  index < dash.alerts.length - 1 && {
                    borderBottomColor: theme.colors.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
                onPress={() => navigation.navigate(alert.route)}
              >
                <View style={[styles.insightIcon, { backgroundColor: accent.bg }]}>
                  <Ionicons name={alert.icon} size={16} color={accent.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightText, { color: theme.colors.textPrimary }]}>
                    {alert.title}
                  </Text>
                  <Text style={[styles.eventMeta, { color: theme.colors.textSecondary }]}>
                    {alert.detail}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </SurfaceCard>
      ) : null}

      {/* Quick actions */}
      <View style={styles.section}>
        <SectionHeader
          title="Quick Actions"
          actionLabel="More"
          onAction={() => navigation.navigate('AdminTabs', { screen: 'AdminMore' })}
        />
        <QuickActionGrid actions={actions} columns={4} />
      </View>

      {/* Live attendance + fee collection */}
      <View style={[styles.section, styles.twoCol]}>
        <SurfaceCard style={styles.flex1}>
          <SectionHeader
            title="Live Attendance"
            actionLabel="View"
            onAction={() => navigation.navigate('AttendanceDashboard')}
          />
          <View style={styles.pulseRow}>
            <DonutChart
              segments={[
                { value: Math.max(0, studentAttPct), color: theme.colors.primary },
                { value: Math.max(0, 100 - studentAttPct), color: theme.colors.surfaceAlt },
              ]}
              size={56}
              strokeWidth={8}
            />
            <View>
              <Text style={[styles.pulseLabel, { color: theme.colors.textSecondary }]}>Students</Text>
              <Text style={[styles.pulseValue, { color: theme.colors.textPrimary }]}>
                {formatPct(studentAttPct, 0)}
              </Text>
              <Text style={[styles.pulseSub, { color: theme.colors.textSecondary }]}>
                Avg {formatPct(dash.avgAttendancePct, 0)}
              </Text>
            </View>
          </View>
          <View style={styles.pulseRow}>
            <DonutChart
              segments={[
                {
                  value: Math.max(0, dash.staffSplit.teachingPct),
                  color: theme.colors.success,
                },
                {
                  value: Math.max(0, 100 - dash.staffSplit.teachingPct),
                  color: theme.colors.surfaceAlt,
                },
              ]}
              size={56}
              strokeWidth={8}
            />
            <View>
              <Text style={[styles.pulseLabel, { color: theme.colors.textSecondary }]}>
                Teaching Staff
              </Text>
              <Text style={[styles.pulseValue, { color: theme.colors.textPrimary }]}>
                {formatPct(dash.staffSplit.teachingPct, 0)}
              </Text>
              <Text style={[styles.pulseSub, { color: theme.colors.textSecondary }]}>
                {dash.staffSplit.teachingPresent}/{dash.staffSplit.teachingTotal} present
              </Text>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.flex1}>
          <SectionHeader
            title="Fee Collection"
            actionLabel="View"
            onAction={() => navigation.navigate('FeeCollection')}
          />
          <View style={styles.feeDonutWrap}>
            <DonutChart
              segments={[
                { value: collected / feeTotal, color: theme.colors.success },
                { value: pending / feeTotal, color: theme.colors.warning },
                { value: overdue / feeTotal, color: theme.colors.danger },
              ].map((s) => ({ ...s, value: s.value * 100 }))}
              size={104}
              strokeWidth={14}
              centerValue={formatCurrency(collected)}
              centerLabel="Collected"
            />
          </View>
          <View style={styles.feeLegend}>
            <FeeLegendRow
              color={theme.colors.success}
              label="Collected"
              value={formatCurrency(collected)}
            />
            <FeeLegendRow
              color={theme.colors.warning}
              label="Pending"
              value={formatCurrency(pending)}
            />
            <FeeLegendRow
              color={theme.colors.danger}
              label="Overdue"
              value={formatCurrency(overdue)}
            />
            <FeeLegendRow
              color={theme.colors.info || theme.colors.primary}
              label="Rate"
              value={formatPct(fee.collectionRate, 0)}
            />
          </View>
        </SurfaceCard>
      </View>

      {/* Fee overview stats */}
      <SurfaceCard style={styles.section}>
        <SectionHeader
          title="Fee Overview"
          actionLabel="View →"
          onAction={() => navigation.navigate('FeeCollection')}
        />
        <View style={styles.statGrid2}>
          {[
            { label: 'Total Due', value: formatCurrency(fee.totalDue) },
            { label: 'Pending', value: formatCurrency(pending) },
            { label: 'Today', value: formatCurrency(fee.todayCollection) },
            { label: 'This Month', value: formatCurrency(fee.thisMonthCollection) },
            { label: 'Collection Rate', value: formatPct(fee.collectionRate, 0) },
            { label: 'Students w/ Dues', value: String(fee.studentsWithDues) },
          ].map((item) => (
            <View
              key={item.label}
              style={[styles.statCell, { backgroundColor: theme.colors.surfaceAlt }]}
            >
              <Text style={[styles.statCellValue, { color: theme.colors.textPrimary }]}>
                {item.value}
              </Text>
              <Text style={[styles.statCellLabel, { color: theme.colors.textSecondary }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      {/* Students + Admissions overview */}
      <View style={[styles.section, styles.twoCol]}>
        <SurfaceCard style={styles.flex1}>
          <SectionHeader
            title="Students Overview"
            actionLabel="View"
            onAction={() => navigation.navigate('StudentManagement')}
          />
          {topClasses.length === 0 ? (
            <Text style={[styles.emptyInline, { color: theme.colors.textSecondary }]}>
              No class enrollment data yet.
            </Text>
          ) : (
            topClasses.map((c, idx) => {
              const pct = Math.round((c.studentCount / classTotal) * 1000) / 10;
              return (
                <View key={`${c.classId}-${idx}`} style={styles.classRow}>
                  <View style={styles.classRowTop}>
                    <Text
                      style={[styles.className, { color: theme.colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {c.label}
                    </Text>
                    <Text style={[styles.classCount, { color: theme.colors.textSecondary }]}>
                      {pct}% ({c.studentCount})
                    </Text>
                  </View>
                  <ProgressBar percent={pct} height={6} color={theme.colors.primary} />
                </View>
              );
            })
          )}
          <View style={[styles.miniStrip, { borderTopColor: theme.colors.border }]}>
            {[
              { label: 'Enrolled', value: dash.admissions.enrolled },
              { label: 'Applied', value: dash.admissions.applied },
              { label: 'Enquiries', value: dash.admissions.enquiries },
              { label: 'Accepted', value: dash.admissions.accepted },
            ].map((m) => (
              <View key={m.label} style={styles.miniCell}>
                <Text style={[styles.miniValue, { color: theme.colors.primary }]}>{m.value}</Text>
                <Text style={[styles.miniLabel, { color: theme.colors.textSecondary }]}>
                  {m.label}
                </Text>
              </View>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.flex1}>
          <SectionHeader
            title="Admissions"
            actionLabel="View"
            onAction={() => navigation.navigate('AdmissionsDashboard')}
          />
          {[
            { label: 'Enquiries', value: dash.admissions.enquiries, color: theme.colors.warning },
            { label: 'Applications', value: dash.admissions.applied, color: theme.colors.primary },
            { label: 'Admitted', value: dash.admissions.admitted, color: theme.colors.success },
            { label: 'Pending', value: dash.admissions.pending, color: theme.colors.danger },
          ].map((row) => (
            <View key={row.label} style={styles.admitRow}>
              <View style={[styles.admitDot, { backgroundColor: row.color }]} />
              <Text style={[styles.admitLabel, { color: theme.colors.textSecondary }]}>
                {row.label}
              </Text>
              <Text style={[styles.admitValue, { color: theme.colors.textPrimary }]}>
                {row.value}
              </Text>
            </View>
          ))}
          {Object.keys(dash.admissionCounts).length === 0 ? (
            <Text style={[styles.emptyInline, { color: theme.colors.textSecondary }]}>
              No admission pipeline data yet.
            </Text>
          ) : null}
        </SurfaceCard>
      </View>

      {/* Attendance detail */}
      <SurfaceCard style={styles.section}>
        <SectionHeader
          title="Attendance Overview"
          actionLabel="View →"
          onAction={() => navigation.navigate('AttendanceDashboard')}
        />
        <View style={styles.attSummary}>
          <DonutChart
            segments={[
              { value: studentPresent, color: theme.colors.success },
              { value: studentAbsent, color: theme.colors.danger },
              { value: studentLate, color: theme.colors.warning },
            ]}
            size={88}
            strokeWidth={12}
            centerValue={formatPct(studentAttPct, 0)}
            centerLabel="Students"
          />
          <View style={styles.attLegend}>
            <FeeLegendRow color={theme.colors.success} label="Present" value={String(studentPresent)} />
            <FeeLegendRow color={theme.colors.danger} label="Absent" value={String(studentAbsent)} />
            <FeeLegendRow color={theme.colors.warning} label="Late" value={String(studentLate)} />
          </View>
        </View>
        <View style={styles.staffSplitRow}>
          <View style={[styles.staffSplitCard, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Text style={[styles.pulseLabel, { color: theme.colors.textSecondary }]}>
              Teaching Staff
            </Text>
            <Text style={[styles.pulseValue, { color: theme.colors.textPrimary }]}>
              {formatPct(dash.staffSplit.teachingPct, 1)}
            </Text>
            <Text style={[styles.pulseSub, { color: theme.colors.textSecondary }]}>
              {dash.staffSplit.teachingPresent}/{dash.staffSplit.teachingTotal} present
            </Text>
            <ProgressBar percent={dash.staffSplit.teachingPct} height={6} color={theme.colors.danger} />
          </View>
          <View style={[styles.staffSplitCard, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Text style={[styles.pulseLabel, { color: theme.colors.textSecondary }]}>
              Non-Teaching
            </Text>
            <Text style={[styles.pulseValue, { color: theme.colors.textPrimary }]}>
              {formatPct(dash.staffSplit.nonTeachingPct, 1)}
            </Text>
            <Text style={[styles.pulseSub, { color: theme.colors.textSecondary }]}>
              {dash.staffSplit.nonTeachingPresent}/{dash.staffSplit.nonTeachingTotal} present
            </Text>
            <ProgressBar
              percent={dash.staffSplit.nonTeachingPct}
              height={6}
              color={theme.colors.danger}
            />
          </View>
        </View>
      </SurfaceCard>

      {/* Events / Exams / Holidays / Leave */}
      <View style={styles.section}>
        <SurfaceCard>
          <SectionHeader
            title="Upcoming Events"
            icon="checkmark-circle-outline"
            actionLabel="View →"
            onAction={() => navigation.navigate('Engagement')}
          />
          {dash.events.length === 0 ? (
            <Text style={[styles.emptyInline, { color: theme.colors.textSecondary }]}>
              No upcoming events this month.
            </Text>
          ) : (
            dash.events.slice(0, 4).map((event, index) => (
              <View
                key={`ev-${event.id}-${index}`}
                style={[
                  styles.eventRow,
                  index < Math.min(dash.events.length, 4) - 1 && {
                    borderBottomColor: theme.colors.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={[styles.eventDate, { backgroundColor: theme.colors.tintTeal }]}>
                  <Text style={[styles.eventDay, { color: theme.colors.primary }]}>{event.day}</Text>
                  <Text style={[styles.eventMonth, { color: theme.colors.primary }]}>
                    {event.month}
                  </Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: theme.colors.textPrimary }]}>
                    {event.title}
                  </Text>
                  <Text style={[styles.eventMeta, { color: theme.colors.textSecondary }]}>
                    {event.meta || event.date}
                  </Text>
                </View>
              </View>
            ))
          )}
        </SurfaceCard>
      </View>

      <View style={[styles.section, styles.twoCol]}>
        <SurfaceCard style={styles.flex1}>
          <SectionHeader
            title="Exam Schedule"
            icon="book-outline"
            actionLabel="View"
            onAction={() => navigation.navigate('Exams')}
          />
          <MiniMonthCal
            marked={dash.examDates}
            accent={theme.colors.danger}
            emptyLabel="No exams scheduled this month."
          />
          {nextExam ? (
            <Text style={[styles.examNext, { color: theme.colors.textSecondary }]}>
              {nextExam.subjectName}
              {nextExam.startTime ? ` · ${nextExam.startTime}` : ''}
              {nextExam.roomNo ? ` · Room ${nextExam.roomNo}` : ''}
            </Text>
          ) : null}
        </SurfaceCard>

        <SurfaceCard style={styles.flex1}>
          <SectionHeader
            title="Staff on Leave"
            actionLabel="View"
            onAction={() => navigation.navigate('HrPayroll')}
          />
          <Text style={[styles.calHint, { color: theme.colors.textSecondary }]}>
            Highlighted days show approved leave
          </Text>
          <MiniMonthCal
            marked={dash.leaveDates}
            accent={theme.colors.warning}
            emptyLabel="No leave marked this month."
          />
        </SurfaceCard>
      </View>

      <SurfaceCard style={styles.section}>
        <SectionHeader
          title="Holiday List"
          actionLabel="View →"
          onAction={() => navigation.navigate('HolidayCalendar')}
        />
        {dash.holidays.length === 0 ? (
          <Text style={[styles.emptyInline, { color: theme.colors.textSecondary }]}>
            No upcoming holidays.
          </Text>
        ) : (
          dash.holidays.slice(0, 5).map((h, idx) => {
            const md = h.date.slice(5);
            return (
              <View key={`hol-${h.id}-${idx}`} style={styles.holidayRow}>
                <View style={[styles.holidayDate, { backgroundColor: `${theme.colors.warning}22` }]}>
                  <Text style={[styles.holidayDateText, { color: theme.colors.warning }]}>{md}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventTitle, { color: theme.colors.textPrimary }]}>
                    {h.name}
                  </Text>
                  <Text style={[styles.eventMeta, { color: theme.colors.textSecondary }]}>
                    {h.type}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </SurfaceCard>

      {/* Ops panels — Engagement / Safety / HR / Income */}
      <View style={styles.section}>
        <SectionHeader title="Operations Snapshot" />
        <View style={styles.opsGrid}>
          <SurfaceCard style={styles.opsCard}>
            <SectionHeader
              title="Engagement"
              actionLabel="View"
              onAction={() => navigation.navigate('Engagement')}
            />
            <MetricRow
              label="Grievances"
              value={String(dash.grievances.open)}
              badge={dash.grievances.open === 0 ? 'Clear' : 'Open'}
              badgeColor={theme.colors.warning}
            />
            <MetricRow
              label="Resolved"
              value={String(dash.grievances.resolved)}
              badge="Closed"
              badgeColor={theme.colors.textSecondary}
            />
            <MetricRow
              label="Events (month)"
              value={String(dash.eventsThisMonth)}
              badge="Upcoming"
              badgeColor={theme.colors.info || theme.colors.primary}
            />
            <MetricRow
              label="Notices"
              value={String(dash.noticesCount)}
              badge="Active"
              badgeColor={theme.colors.primary}
              onPress={() => navigation.navigate('Announcements')}
            />
          </SurfaceCard>

          <SurfaceCard style={styles.opsCard}>
            <SectionHeader
              title="Safety & Compliance"
              actionLabel="View"
              onAction={() => navigation.navigate('Safety')}
            />
            <MetricRow
              label="On campus"
              value={String(dash.visitors.onCampus)}
            />
            <MetricRow label="Checked out" value={String(dash.visitors.checkedOut)} />
            <MetricRow
              label="Staff leave today"
              value={String(dash.staffLeaveToday)}
              badge="Today"
              badgeColor={theme.colors.warning}
            />
            <MetricRow
              label="Active visitors"
              value={String(dash.visitors.active)}
              badge={dash.visitors.active === 0 ? 'None' : 'Active'}
              badgeColor={theme.colors.success}
            />
            <MetricRow
              label="Visitor logs"
              value={String(dash.visitors.total)}
              badge="Recent"
              badgeColor={theme.colors.primary}
            />
          </SurfaceCard>

          <SurfaceCard style={styles.opsCard}>
            <SectionHeader
              title="HR & Payroll"
              actionLabel="View"
              onAction={() => navigation.navigate('HrPayroll')}
            />
            <View style={styles.hrTop}>
              <DonutChart
                segments={[
                  { value: payrollPct, color: theme.colors.primary },
                  { value: Math.max(0, 100 - payrollPct), color: theme.colors.surfaceAlt },
                ]}
                size={64}
                strokeWidth={8}
                centerValue={`${payrollPct}%`}
              />
              <View>
                <Text style={[styles.pulseSub, { color: theme.colors.textSecondary }]}>
                  {dash.modules.payroll.processed} processed
                </Text>
                <Text style={[styles.pulseSub, { color: theme.colors.textSecondary }]}>
                  {dash.modules.payroll.pending} pending
                </Text>
              </View>
            </View>
            <MetricRow label="Total staff" value={String(dash.modules.payroll.staff)} />
            <MetricRow
              label="Processed"
              value={String(dash.modules.payroll.processed)}
              badge="Paid"
              badgeColor={theme.colors.success}
            />
            <MetricRow
              label="Pending"
              value={String(dash.modules.payroll.pending)}
              badge="Due"
              badgeColor={theme.colors.warning}
            />
            <MetricRow
              label="Total payroll"
              value={formatCurrency(dash.modules.payroll.totalNet)}
              badge="Net"
              badgeColor={theme.colors.primary}
            />
          </SurfaceCard>

          <SurfaceCard style={styles.opsCard}>
            <SectionHeader
              title="Income vs Expense"
              actionLabel="View"
              onAction={() => navigation.navigate('FeeCollection')}
            />
            <View style={styles.incomeBarWrap}>
              <Text style={[styles.pulseLabel, { color: theme.colors.success }]}>Income</Text>
              <ProgressBar
                percent={dash.incomeAmount > 0 ? 100 : 0}
                height={18}
                color={theme.colors.success}
              />
              <Text style={[styles.incomeValue, { color: theme.colors.success }]}>
                {formatCurrency(dash.incomeAmount)}
              </Text>
              <Text style={[styles.pulseLabel, { color: theme.colors.danger, marginTop: 10 }]}>
                Expense
              </Text>
              <ProgressBar percent={0} height={18} color={theme.colors.danger} />
              <Text style={[styles.incomeValue, { color: theme.colors.danger }]}>—</Text>
              <Text style={[styles.calHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
                Expense tracking not available from current APIs.
              </Text>
            </View>
          </SurfaceCard>
        </View>
      </View>

      {/* Module overviews */}
      <View style={styles.section}>
        <SectionHeader title="Module Overviews" />
        <View style={styles.opsGrid}>
          <SurfaceCard style={styles.opsCard}>
            <SectionHeader
              title="Transport"
              actionLabel="View"
              onAction={() => navigation.navigate('TransportDashboard')}
            />
            <MetricRow label="Total Buses" value={String(dash.modules.transport.vehicles)} />
            <MetricRow label="Routes" value={String(dash.modules.transport.routes)} />
            <MetricRow label="Students Using" value={String(dash.modules.transport.students)} />
          </SurfaceCard>

          <SurfaceCard style={styles.opsCard}>
            <SectionHeader
              title="Inventory"
              actionLabel="View"
              onAction={() => navigation.navigate('InventoryDashboard')}
            />
            <MetricRow label="Total Items" value={String(dash.modules.inventory.items)} />
            <MetricRow label="Low Stock" value={String(dash.modules.inventory.lowStock)} />
            <MetricRow label="Out of Stock" value={String(dash.modules.inventory.outOfStock)} />
            <MetricRow
              label="Total Value"
              value={formatCurrency(dash.modules.inventory.totalValue)}
            />
          </SurfaceCard>

          <SurfaceCard style={styles.opsCard}>
            <SectionHeader
              title="Library"
              actionLabel="View"
              onAction={() => navigation.navigate('LibraryDashboard')}
            />
            <View style={styles.hrTop}>
              <DonutChart
                segments={[
                  { value: dash.modules.library.available, color: theme.colors.success },
                  { value: dash.modules.library.issued, color: theme.colors.primary },
                  { value: dash.modules.library.overdue, color: theme.colors.danger },
                ]}
                size={64}
                strokeWidth={8}
                centerValue={String(dash.modules.library.books)}
                centerLabel="books"
              />
            </View>
            <MetricRow label="Total Books" value={String(dash.modules.library.books)} />
            <MetricRow label="Issued" value={String(dash.modules.library.issued)} />
            <MetricRow label="Available" value={String(dash.modules.library.available)} />
            <MetricRow label="Overdue" value={String(dash.modules.library.overdue)} />
          </SurfaceCard>

          <SurfaceCard style={styles.opsCard}>
            <SectionHeader
              title="Hostel"
              actionLabel="View"
              onAction={() => navigation.navigate('HostelDashboard')}
            />
            <View style={styles.hrTop}>
              <DonutChart
                segments={[
                  { value: dash.modules.hostel.occupancyPct, color: theme.colors.primary },
                  {
                    value: Math.max(0, 100 - dash.modules.hostel.occupancyPct),
                    color: theme.colors.surfaceAlt,
                  },
                ]}
                size={64}
                strokeWidth={8}
                centerValue={formatPct(dash.modules.hostel.occupancyPct, 0)}
              />
              <View>
                <Text style={[styles.pulseSub, { color: theme.colors.textSecondary }]}>
                  {dash.modules.hostel.occupied} occupied
                </Text>
                <Text style={[styles.pulseSub, { color: theme.colors.textSecondary }]}>
                  {dash.modules.hostel.available} available
                </Text>
              </View>
            </View>
            <MetricRow label="Total Rooms" value={String(dash.modules.hostel.rooms)} />
            <MetricRow label="Occupied" value={String(dash.modules.hostel.occupied)} />
            <MetricRow label="Available" value={String(dash.modules.hostel.available)} />
            <MetricRow
              label="Occupancy"
              value={formatPct(dash.modules.hostel.occupancyPct, 0)}
            />
          </SurfaceCard>
        </View>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 28 },

  heroClip: { width: '100%', overflow: 'hidden' },
  hero: {
    width: '100%',
    minHeight: 148,
    paddingBottom: HERO_OVERLAP + 20,
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
  heroTextWrap: { paddingHorizontal: 20, paddingTop: 20, paddingRight: 120 },
  heroGreeting: { color: '#FFFFFF', fontSize: 24, lineHeight: 30 },
  heroGreetingLead: { fontFamily: FONT_FAMILY.medium, fontWeight: '500' },
  heroGreetingName: { fontFamily: FONT_FAMILY.bold, fontWeight: '700' },
  heroSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 8,
    lineHeight: 18,
  },
  heroDate: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    marginTop: 4,
  },

  cardWrap: {
    marginTop: -HERO_OVERLAP,
    paddingHorizontal: 16,
    zIndex: 2,
    elevation: 4,
    marginBottom: 4,
  },
  overviewCard: { borderRadius: 16, elevation: 3 },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  overviewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  overviewTitle: { fontSize: 16, fontWeight: '700' },
  overviewActions: { alignItems: 'flex-end', gap: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { fontSize: 12, fontWeight: '600' },

  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 14,
  },
  secondary: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 2 },
  secondaryDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 2 },
  secondaryValue: { fontSize: 15, fontWeight: '800' },
  secondaryLabel: { fontSize: 9, textAlign: 'center', lineHeight: 12 },

  section: { marginTop: 16, marginHorizontal: 16 },
  twoCol: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },

  pulseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  pulseLabel: { fontSize: 11 },
  pulseValue: { fontSize: 18, fontWeight: '800' },
  pulseSub: { fontSize: 10 },

  feeDonutWrap: { alignItems: 'center', paddingVertical: 4 },
  feeLegend: { marginTop: 10, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, flex: 1 },
  legendValue: { fontSize: 11, fontWeight: '700' },

  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  eventDate: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDay: { fontSize: 16, fontWeight: '800' },
  eventMonth: { fontSize: 10, fontWeight: '600' },
  eventInfo: { flex: 1, gap: 2 },
  eventTitle: { fontSize: 14, fontWeight: '700' },
  eventMeta: { fontSize: 12 },

  emptyInline: { fontSize: 12, paddingVertical: 8, lineHeight: 18 },

  statGrid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCell: {
    width: '31%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 10,
    minWidth: '30%',
  },
  statCellValue: { fontSize: 14, fontWeight: '800' },
  statCellLabel: { fontSize: 10, marginTop: 2 },

  classRow: { marginBottom: 10, gap: 4 },
  classRowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  className: { fontSize: 12, fontWeight: '600', flex: 1 },
  classCount: { fontSize: 11 },

  miniStrip: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingTop: 10,
  },
  miniCell: { flex: 1, alignItems: 'center' },
  miniValue: { fontSize: 14, fontWeight: '800' },
  miniLabel: { fontSize: 9, marginTop: 2 },

  admitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  admitDot: { width: 8, height: 8, borderRadius: 4 },
  admitLabel: { flex: 1, fontSize: 12 },
  admitValue: { fontSize: 13, fontWeight: '700' },

  attSummary: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  attLegend: { flex: 1, gap: 6 },
  staffSplitRow: { flexDirection: 'row', gap: 8 },
  staffSplitCard: { flex: 1, borderRadius: 12, padding: 10, gap: 4 },

  calMonth: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  calWeekRow: { flexDirection: 'row' },
  calDow: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 9, marginBottom: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDay: { fontSize: 10 },
  calEmpty: { fontSize: 11, marginTop: 6 },
  calHint: { fontSize: 10, marginBottom: 6 },
  examNext: { fontSize: 11, marginTop: 8 },

  holidayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  holidayDate: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 52,
    alignItems: 'center',
  },
  holidayDateText: { fontSize: 12, fontWeight: '800' },

  opsGrid: { gap: 12 },
  opsCard: { marginBottom: 0 },

  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metricLabel: { fontSize: 12, flex: 1 },
  metricRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricValue: { fontSize: 13, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  hrTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  incomeBarWrap: { gap: 4 },
  incomeValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
});
