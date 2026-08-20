/**
 * Attendance Hub — web AttendanceTab parity.
 * Teacher: Student | My | Class Report | Student Report | Settings
 * Admin (role="admin"): + Staff Attendance; edit any date; calendar/day mark UX
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  StatGrid,
  FilterChips,
  Badge,
  EmptyState,
  PrimaryButton,
  FormField,
  TextField,
  SelectField,
  SearchBar,
  InfoBanner,
  type ChipOption,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  useTeacherAttendanceTracker,
  type AttStatus,
  type ViewPeriod,
} from '../../../hooks/useTeacherAttendanceTracker';
import StudentMarkSheet from './StudentMarkSheet';
import MyAttendanceHome from './MyAttendanceHome';
import {
  useTeacherMyAttendance,
  type StaffAttRecord,
} from '../../../hooks/useTeacherMyAttendance';
import {
  useAdminStaffAttendance,
  type HalfStatus,
} from '../../../hooks/useAdminStaffAttendance';
import {
  attendanceRecordsApi,
  attendanceSettingsApi,
  studentsByUserApi,
} from '@core/api/erp.api';
import { useSchoolsSession } from '../../../hooks/useSchoolsSession';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  toLocalDateStr,
} from '../../../utils/apiHelpers';
import { useTeacherStaffProfile } from '../../../hooks/useTeacherStaffProfile';

type HubTab =
  | 'tracker'
  | 'my-attendance'
  | 'staff-attendance'
  | 'class-report'
  | 'student-report'
  | 'settings';

const TEACHER_HUB_TABS: Array<{
  key: HubTab;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'tracker', title: 'Student Attendance', icon: 'people-outline' },
  { key: 'my-attendance', title: 'My Attendance', icon: 'finger-print-outline' },
  { key: 'class-report', title: 'Class Report', icon: 'bar-chart-outline' },
  { key: 'student-report', title: 'Student Report', icon: 'person-outline' },
  { key: 'settings', title: 'Settings', icon: 'settings-outline' },
];

const ADMIN_HUB_TABS: Array<{
  key: HubTab;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'tracker', title: 'Student Attendance', icon: 'people-outline' },
  { key: 'my-attendance', title: 'My Attendance', icon: 'finger-print-outline' },
  { key: 'staff-attendance', title: 'Staff Attendance', icon: 'briefcase-outline' },
  { key: 'class-report', title: 'Class Report', icon: 'bar-chart-outline' },
  { key: 'student-report', title: 'Student Report', icon: 'person-outline' },
  { key: 'settings', title: 'Settings', icon: 'settings-outline' },
];

export type AttendanceHubProps = {
  /** Admin: edit any date + Staff Attendance tab. */
  role?: 'teacher' | 'admin';
  /** Tab roots should pass false so the back chevron is hidden. */
  showBack?: boolean;
  /** Optional back handler (e.g. admin tab → Dashboard). */
  onBack?: () => void;
};

const PERIODS: ChipOption[] = [
  { key: 'month', label: 'Monthly' },
  { key: 'current-week', label: 'Current Week' },
  { key: 'last-week', label: 'Last Week' },
  { key: 'quarter', label: 'Quarter (3 mo)' },
  { key: 'half-year', label: 'Half Year' },
  { key: 'full-year', label: 'Full Year' },
];

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COL_W = 40;
const NAME_W = 112;
const ADM_W = 78;
const SNO_W = 36;
const SUM_W = 36;
/** My Attendance grid column widths (aligned web-style table). */
const MY_NAME_W = 72;
const MY_DAY_W = 52;
const MY_SUM_W = 40;
const MY_PCT_W = 56;

const STATUS_STYLE: Record<
  string,
  { bg: string; fg: string; label: string }
> = {
  present: { bg: '#DCFCE7', fg: '#16A34A', label: 'P' },
  absent: { bg: '#FEE2E2', fg: '#DC2626', label: 'A' },
  late: { bg: '#FFEDD5', fg: '#EA580C', label: 'L' },
  leave: { bg: '#F1F5F9', fg: '#64748B', label: 'Lv' },
  '': { bg: '#F1F5F9', fg: '#94A3B8', label: '—' },
};

export default function TeacherAttendanceScreen({
  role = 'teacher',
  showBack = true,
  onBack,
}: AttendanceHubProps) {
  const isAdmin = role === 'admin';
  const theme = useTeacherTheme();
  const route = useRoute();
  const params = route.params as { classId?: string; tab?: string } | undefined;
  const initialClassId = params?.classId;
  const hubTabs = isAdmin ? ADMIN_HUB_TABS : TEACHER_HUB_TABS;
  const validTabs = new Set(hubTabs.map((t) => t.key));
  const initialTab: HubTab =
    params?.tab && validTabs.has(params.tab as HubTab)
      ? (params.tab as HubTab)
      : 'tracker';
  const [tab, setTab] = useState<HubTab>(initialTab);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (params?.tab && validTabs.has(params.tab as HubTab)) {
      setTab(params.tab as HubTab);
    }
  }, [params?.tab, isAdmin]);

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Attendance"
          showBack={showBack}
          onBack={onBack}
          trailingIcon="refresh-outline"
          onTrailingPress={() => setRefreshKey((k) => k + 1)}
        />
      }
      contentStyle={styles.content}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {hubTabs.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t.title}
              style={[
                styles.tabPill,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name={t.icon}
                size={15}
                color={active ? theme.colors.textInverse : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabPillLabel,
                  { color: active ? theme.colors.textInverse : theme.colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {t.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {tab === 'tracker' ? (
        <TrackerPanel
          key={`tracker-${refreshKey}`}
          initialClassId={initialClassId}
          isAdmin={isAdmin}
        />
      ) : null}
      {tab === 'my-attendance' ? <MyAttendanceHome key={`my-${refreshKey}`} /> : null}
      {tab === 'staff-attendance' && isAdmin ? (
        <StaffAttendancePanel key={`staff-${refreshKey}`} />
      ) : null}
      {tab === 'class-report' ? <ClassReportPanel key={`class-${refreshKey}`} /> : null}
      {tab === 'student-report' ? (
        <StudentReportPanel key={`student-${refreshKey}`} />
      ) : null}
      {tab === 'settings' ? <SettingsPanel key={`settings-${refreshKey}`} /> : null}
    </TeacherScreen>
  );
}

/* ════════ Student Attendance Tracker ════════ */

function TrackerPanel({
  initialClassId,
  isAdmin = false,
}: {
  initialClassId?: string | number;
  isAdmin?: boolean;
}) {
  if (!isAdmin) {
    return <StudentMarkSheet embedded initialClassId={initialClassId} />;
  }
  return <AdminTrackerPanel initialClassId={initialClassId} />;
}

function AdminTrackerPanel({ initialClassId }: { initialClassId?: string | number }) {
  const isAdmin = true;
  const theme = useTeacherTheme();
  const t = useTeacherAttendanceTracker(initialClassId, {
    canEditAnyDate: true,
    allowClearOnCycle: true,
  });
  const [bulkStatus, setBulkStatus] = useState<AttStatus>('present');
  const markDate = t.selectedDate;

  const metricItems: StatItem[] = useMemo(() => {
    const base: StatItem[] = [
      { key: 'tot', icon: 'people-outline', value: t.metrics.total, label: 'Total Students', accent: 'teal' },
      { key: 'm', icon: 'male-outline', value: t.metrics.male, label: 'Male', accent: 'purple' },
      { key: 'f', icon: 'female-outline', value: t.metrics.female, label: 'Female', accent: 'pink' },
    ];
    if (t.todayInRange) {
      base.push(
        {
          key: 'pt',
          icon: 'checkmark-circle-outline',
          value: t.metrics.presentToday,
          label: `Present Today · M:${t.metrics.presentTodayM} F:${t.metrics.presentTodayF}`,
          accent: 'green',
        },
        {
          key: 'at',
          icon: 'close-circle-outline',
          value: t.metrics.absentToday,
          label: `Absent Today · M:${t.metrics.absentTodayM} F:${t.metrics.absentTodayF}`,
          accent: 'red',
        },
        {
          key: 'lt',
          icon: 'time-outline',
          value: t.metrics.lateToday,
          label: `Late Today · M:${t.metrics.lateTodayM} F:${t.metrics.lateTodayF}`,
          accent: 'orange',
        },
      );
    }
    base.push(
      {
        key: 'ap',
        icon: 'trending-up-outline',
        value: t.metrics.avgPresent,
        label: 'Avg Present',
        accent: 'green',
      },
      {
        key: 'aa',
        icon: 'trending-down-outline',
        value: t.metrics.avgAbsent,
        label: 'Avg Absent',
        accent: 'red',
      },
      {
        key: 'al',
        icon: 'alert-circle-outline',
        value: t.metrics.avgLate,
        label: 'Avg Late',
        accent: 'orange',
      },
      {
        key: 'wd',
        icon: 'calendar-outline',
        value: t.metrics.workingDays,
        label: 'Working Days',
        accent: 'blue',
      },
    );
    return base;
  }, [t.metrics, t.todayInRange]);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }),
        value: String(i + 1),
      })),
    [],
  );
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1].map((v) => ({ label: String(v), value: String(v) }));
  }, []);

  const onSave = async () => {
    const ok = await t.saveChanges();
    if (ok) Alert.alert('Saved', 'Attendance updated successfully.');
    else Alert.alert('Save failed', t.error || 'Could not save attendance.');
  };

  return (
    <View style={styles.sectionGap}>
      <SurfaceCard style={styles.filterCard}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
          Filters
        </Text>
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
          View Period
        </Text>
        <FilterChips
          size="sm"
          options={PERIODS}
          activeKey={t.viewPeriod}
          onChange={(k) => t.setViewPeriod(k as ViewPeriod)}
        />
        {t.viewPeriod === 'month' ? (
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                Month
              </Text>
              <SelectField
                options={monthOptions}
                value={String(t.month)}
                onChange={(v) => t.setMonth(Number(v))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                Year
              </Text>
              <SelectField
                options={yearOptions}
                value={String(t.year)}
                onChange={(v) => t.setYear(Number(v))}
              />
            </View>
          </View>
        ) : null}

        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Class</Text>
        <SelectField
          options={t.classOptions.map((c) => ({ label: c.name, value: String(c.id) }))}
          value={t.classId != null ? String(t.classId) : null}
          onChange={(v) => {
            t.setClassId(Number(v));
            t.setSectionId(undefined);
            t.setSubjectId(undefined);
          }}
          placeholder="Select class"
        />
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Section</Text>
        <SelectField
          options={[
            { label: 'All', value: '' },
            ...t.sectionOptions.map((s) => ({ label: s.name, value: String(s.id) })),
          ]}
          value={t.sectionId != null ? String(t.sectionId) : ''}
          onChange={(v) => t.setSectionId(v ? Number(v) : undefined)}
        />
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
          Subject {t.subjectId ? '(EDIT)' : '(VIEW ONLY)'}
        </Text>
        <SelectField
          options={[
            { label: 'All Subjects', value: '' },
            ...t.subjectOptions.map((s) => ({ label: s.name, value: String(s.id) })),
          ]}
          value={t.subjectId != null ? String(t.subjectId) : ''}
          onChange={(v) => t.setSubjectId(v ? Number(v) : undefined)}
        />
        <SearchBar
          value={t.query}
          onChangeText={t.setQuery}
          placeholder="Name or Adm No…"
        />
      </SurfaceCard>

      {t.isViewOnly ? (
        <InfoBanner
          title="Read-only"
          text="Viewing all subjects — grid is read-only. Select a specific subject to mark attendance."
        />
      ) : t.useMonthSummary ? (
        <InfoBanner
          title="Summary view"
          text="Quarter / Half Year / Full Year show month totals. Switch to Monthly or a Week view to mark attendance."
        />
      ) : (
        <InfoBanner
          title="Editing"
          text={
            isAdmin
              ? `Subject selected — tap a day, then mark students (P → A → L → clear). Selected: ${markDate}`
              : `Subject selected — you can mark attendance for today (${t.todayStr}) only.`
          }
        />
      )}

      {t.studentSummaries.length > 0 ? (
        <StatGrid items={metricItems} columns={3} variant="tinted" />
      ) : null}

      {!t.isViewOnly && !t.useMonthSummary && t.canEditDate(markDate) ? (
        <SurfaceCard style={styles.bulkBar}>
          <Text style={[styles.bulkTitle, { color: theme.colors.textPrimary }]}>
            Bulk Mark · {isAdmin ? markDate : 'Today'}
          </Text>
          <View style={styles.bulkRow}>
            {(['present', 'absent', 'late'] as AttStatus[]).map((st) => {
              const meta = STATUS_STYLE[st];
              const active = bulkStatus === st;
              return (
                <TouchableOpacity
                  key={st}
                  onPress={() => setBulkStatus(st)}
                  style={[
                    styles.bulkChip,
                    {
                      backgroundColor: active ? meta.fg : meta.bg,
                      borderColor: meta.fg,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: '800',
                      color: active ? '#FFF' : meta.fg,
                      fontSize: 13,
                    }}
                  >
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => t.applyBulk(markDate, bulkStatus)}
            >
              <Text style={styles.applyText}>Apply to All</Text>
            </TouchableOpacity>
          </View>
        </SurfaceCard>
      ) : null}

      {t.hasEdits && !t.useMonthSummary ? (
        <View style={styles.toolbarRow}>
          <CompactBtn
            label={isAdmin ? 'Discard' : 'Reset Today'}
            outline
            onPress={isAdmin ? t.clearEdits : t.resetToday}
          />
          <CompactBtn
            label={t.saving ? 'Saving…' : 'Update'}
            onPress={() => void onSave()}
          />
        </View>
      ) : null}

      {t.status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
      ) : null}
      {t.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{t.error}</Text>
      ) : null}

      {t.studentSummaries.length === 0 && t.status !== 'loading' ? (
        <EmptyState
          icon="people-outline"
          title="No students"
          message="Select class / section to load the roster."
        />
      ) : t.useMonthSummary ? (
        <MonthSummaryGrid t={t} />
      ) : isAdmin ? (
        <AdminStudentDayMark t={t} />
      ) : (
        <DailyAttendanceGrid t={t} />
      )}
    </View>
  );
}

type Tracker = ReturnType<typeof useTeacherAttendanceTracker>;

/** Admin mobile: calendar day chips + per-student status list for selected day. */
function AdminStudentDayMark({ t }: { t: Tracker }) {
  const theme = useTeacherTheme();
  const dc = t.dayCounts[t.selectedDate];

  return (
    <View style={{ gap: 12 }}>
      <SurfaceCard style={styles.filterCard}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
          Working days
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.calRow}>
            {t.workingDates.map((ds) => {
              const d = new Date(`${ds}T00:00:00`);
              const counts = t.dayCounts[ds];
              const active = ds === t.selectedDate;
              const isToday = ds === t.todayStr;
              const tone =
                !counts || counts.marked === 0
                  ? '#CBD5E1'
                  : counts.absent > counts.present
                    ? '#FCA5A5'
                    : counts.late > 0
                      ? '#FDBA74'
                      : '#86EFAC';
              return (
                <TouchableOpacity
                  key={ds}
                  onPress={() => t.setSelectedDate(ds)}
                  style={[
                    styles.calChip,
                    {
                      borderColor: active ? theme.colors.primary : tone,
                      backgroundColor: active ? theme.colors.primary : '#FFF',
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: active ? 'rgba(255,255,255,0.85)' : '#94A3B8',
                    }}
                  >
                    {DAY_ABBR[d.getDay()]}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: active ? '#FFF' : theme.colors.textPrimary,
                    }}
                  >
                    {d.getDate()}
                  </Text>
                  {isToday ? (
                    <Text
                      style={{
                        fontSize: 8,
                        fontWeight: '800',
                        color: active ? '#FFF' : '#0F766E',
                      }}
                    >
                      TODAY
                    </Text>
                  ) : null}
                  <View style={[styles.calDot, { backgroundColor: tone }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        {dc ? (
          <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' }}>
            {t.selectedDate} · P {dc.present} · A {dc.absent} · L {dc.late} · marked{' '}
            {dc.marked}/{t.roster.length}
          </Text>
        ) : null}
      </SurfaceCard>

      <SurfaceCard padded={false} style={styles.listCard}>
        {t.studentSummaries.map((s, idx) => {
          const st = s.selectedStatus;
          const meta = STATUS_STYLE[st || ''];
          const editable = !t.isViewOnly && t.canEditDate(t.selectedDate);
          return (
            <View
              key={s.studentId}
              style={[
                styles.dayMarkRow,
                {
                  borderBottomWidth: idx < t.studentSummaries.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }} numberOfLines={1}>
                  {s.name}
                  {s.gender.startsWith('m') ? ' ♂' : s.gender.startsWith('f') ? ' ♀' : ''}
                </Text>
                <Text style={{ fontSize: 11, color: theme.colors.textSecondary }} numberOfLines={1}>
                  {s.admissionNo || '—'} · P{s.present} A{s.absent} L{s.late} · {s.pct.toFixed(0)}%
                </Text>
              </View>
              <TouchableOpacity
                disabled={!editable}
                onPress={() => t.toggleCell(s.studentId, t.selectedDate)}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: meta.bg,
                    borderColor: meta.fg,
                    opacity: editable || st ? 1 : 0.55,
                    minWidth: 44,
                  },
                ]}
              >
                <Text style={[styles.statusChipText, { color: meta.fg }]}>{meta.label || '—'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </SurfaceCard>
    </View>
  );
}

function DailyAttendanceGrid({ t }: { t: Tracker }) {
  const theme = useTeacherTheme();
  const stickyW = SNO_W + ADM_W + NAME_W;

  return (
    <SurfaceCard padded={false} style={styles.gridCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* Week group header */}
          <View style={[styles.gridRow, { backgroundColor: '#F0FDF4' }]}>
            <View style={{ width: stickyW }} />
            {t.weekGroups.map((wg) => (
              <View
                key={wg.label}
                style={{
                  width: wg.dates.length * COL_W,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 6,
                  borderBottomWidth: 2,
                  borderBottomColor: '#BBF7D0',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#166534' }}>
                  {wg.label}
                </Text>
              </View>
            ))}
            <View style={{ width: SUM_W * 4 + 56 }} />
          </View>

          {/* Day headers */}
          <View style={[styles.gridRow, { backgroundColor: '#F8FAFC' }]}>
            <View style={[styles.stickyCols, { width: stickyW, backgroundColor: '#F8FAFC' }]}>
              <Text style={[styles.thText, { width: SNO_W }]}>S.No</Text>
              <Text style={[styles.thText, { width: ADM_W }]}>Adm No.</Text>
              <Text style={[styles.thText, { width: NAME_W }]}>Student</Text>
            </View>
            {t.workingDates.map((ds) => {
              const d = new Date(`${ds}T00:00:00`);
              const isToday = ds === t.todayStr;
              return (
                <View
                  key={ds}
                  style={[
                    styles.dayHead,
                    isToday && {
                      backgroundColor: '#CCFBF1',
                      borderLeftWidth: 2,
                      borderRightWidth: 2,
                      borderColor: '#14B8A6',
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      color: isToday ? '#0F766E' : '#94A3B8',
                      fontWeight: '600',
                    }}
                  >
                    {DAY_ABBR[d.getDay()]}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: isToday ? '#0F766E' : theme.colors.textPrimary,
                    }}
                  >
                    {d.getDate()}
                  </Text>
                  {isToday ? (
                    <Text style={{ fontSize: 7, fontWeight: '800', color: '#0F766E' }}>
                      TODAY
                    </Text>
                  ) : null}
                </View>
              );
            })}
            <Text style={[styles.thText, { width: SUM_W, color: '#16A34A', textAlign: 'center' }]}>
              P
            </Text>
            <Text style={[styles.thText, { width: SUM_W, color: '#DC2626', textAlign: 'center' }]}>
              A
            </Text>
            <Text style={[styles.thText, { width: SUM_W, color: '#EA580C', textAlign: 'center' }]}>
              L
            </Text>
            <Text style={[styles.thText, { width: 48, textAlign: 'center' }]}>%</Text>
            <Text style={[styles.thText, { width: 56, textAlign: 'center' }]}>Risk</Text>
          </View>

          {/* Rows */}
          {t.studentSummaries.map((s, idx) => (
            <View
              key={s.studentId}
              style={[
                styles.gridRow,
                { backgroundColor: idx % 2 === 0 ? '#FFF' : '#FAFBFC' },
              ]}
            >
              <View
                style={[
                  styles.stickyCols,
                  {
                    width: stickyW,
                    backgroundColor: idx % 2 === 0 ? '#FFF' : '#FAFBFC',
                  },
                ]}
              >
                <Text style={[styles.tdText, { width: SNO_W }]}>{idx + 1}</Text>
                <Text
                  style={[styles.tdText, { width: ADM_W, color: '#64748B', fontSize: 11 }]}
                  numberOfLines={1}
                >
                  {s.admissionNo}
                </Text>
                <Text
                  style={[styles.tdText, { width: NAME_W, fontWeight: '700' }]}
                  numberOfLines={1}
                >
                  {s.name}
                  {s.gender.startsWith('m')
                    ? ' ♂'
                    : s.gender.startsWith('f')
                      ? ' ♀'
                      : ''}
                </Text>
              </View>
              {t.workingDates.map((ds) => {
                const st = t.getStatus(s.studentId, ds);
                const meta = STATUS_STYLE[st || ''];
                const isToday = ds === t.todayStr;
                const editable = !t.isViewOnly && t.canEditDate(ds);
                return (
                  <TouchableOpacity
                    key={`${s.studentId}-${ds}`}
                    disabled={!editable}
                    onPress={() => t.toggleCell(s.studentId, ds)}
                    style={[
                      styles.dayCellBtn,
                      {
                        backgroundColor: isToday ? '#CCFBF1' : meta.bg,
                        borderColor: isToday ? '#14B8A6' : meta.fg,
                        opacity: editable || st ? 1 : 0.55,
                      },
                    ]}
                  >
                    <Text style={{ color: meta.fg, fontWeight: '800', fontSize: 11 }}>
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={[styles.sumCell, { color: '#16A34A', width: SUM_W }]}>
                {s.present}
              </Text>
              <Text style={[styles.sumCell, { color: '#DC2626', width: SUM_W }]}>
                {s.absent}
              </Text>
              <Text style={[styles.sumCell, { color: '#EA580C', width: SUM_W }]}>
                {s.late}
              </Text>
              <Text
                style={[
                  styles.sumCell,
                  {
                    width: 48,
                    color: s.pct >= 75 ? '#16A34A' : '#DC2626',
                  },
                ]}
              >
                {s.pct.toFixed(1)}%
              </Text>
              <View style={{ width: 56, alignItems: 'center', justifyContent: 'center' }}>
                <Badge
                  label={s.risk === 'Low Attendance' ? 'Low' : s.risk}
                  accent={
                    s.risk === 'OK' ? 'green' : s.risk === 'Critical' ? 'red' : 'orange'
                  }
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SurfaceCard>
  );
}

function MonthSummaryGrid({ t }: { t: Tracker }) {
  return (
    <SurfaceCard padded={false} style={styles.gridCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* Month group header */}
          <View style={[styles.gridRow, { backgroundColor: '#F0FDF4' }]}>
            <View style={{ width: SNO_W + NAME_W }} />
            {t.monthGroups.map((mg) => (
              <View
                key={mg.key}
                style={{
                  width: SUM_W * 3,
                  alignItems: 'center',
                  paddingVertical: 6,
                  borderBottomWidth: 2,
                  borderBottomColor: '#BBF7D0',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>
                  {mg.label}
                </Text>
                <Text style={{ fontSize: 10, color: '#64748B' }}>{mg.dates.length} days</Text>
              </View>
            ))}
            <View
              style={{
                width: SUM_W * 3 + 48 + 56,
                alignItems: 'center',
                paddingVertical: 6,
                borderBottomWidth: 2,
                borderBottomColor: '#BBF7D0',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>
                Summary
              </Text>
            </View>
          </View>

          {/* Sub headers P/A/L */}
          <View style={[styles.gridRow, { backgroundColor: '#F8FAFC' }]}>
            <Text style={[styles.thText, { width: SNO_W }]}>S.No</Text>
            <Text style={[styles.thText, { width: NAME_W }]}>Student</Text>
            {t.monthGroups.map((mg) => (
              <React.Fragment key={`${mg.key}-h`}>
                <Text
                  style={[styles.thText, { width: SUM_W, color: '#16A34A', textAlign: 'center' }]}
                >
                  P
                </Text>
                <Text
                  style={[styles.thText, { width: SUM_W, color: '#DC2626', textAlign: 'center' }]}
                >
                  A
                </Text>
                <Text
                  style={[
                    styles.thText,
                    {
                      width: SUM_W,
                      color: '#EA580C',
                      textAlign: 'center',
                      borderRightWidth: 2,
                      borderRightColor: '#E2E8F0',
                    },
                  ]}
                >
                  L
                </Text>
              </React.Fragment>
            ))}
            <Text style={[styles.thText, { width: SUM_W, color: '#16A34A', textAlign: 'center' }]}>
              P
            </Text>
            <Text style={[styles.thText, { width: SUM_W, color: '#DC2626', textAlign: 'center' }]}>
              A
            </Text>
            <Text style={[styles.thText, { width: SUM_W, color: '#EA580C', textAlign: 'center' }]}>
              L
            </Text>
            <Text style={[styles.thText, { width: 48, textAlign: 'center' }]}>%</Text>
            <Text style={[styles.thText, { width: 56, textAlign: 'center' }]}>Risk</Text>
          </View>

          {t.studentSummaries.map((s, idx) => (
            <View
              key={s.studentId}
              style={[
                styles.gridRow,
                { backgroundColor: idx % 2 === 0 ? '#FFF' : '#FAFBFC' },
              ]}
            >
              <Text style={[styles.tdText, { width: SNO_W }]}>{idx + 1}</Text>
              <Text
                style={[styles.tdText, { width: NAME_W, fontWeight: '700' }]}
                numberOfLines={1}
              >
                {s.name}
                {s.gender.startsWith('m') ? ' ♂' : s.gender.startsWith('f') ? ' ♀' : ''}
              </Text>
              {t.monthGroups.map((mg) => {
                let mp = 0;
                let ma = 0;
                let ml = 0;
                mg.dates.forEach((d) => {
                  const st = t.getStatus(s.studentId, d);
                  if (st === 'present') mp += 1;
                  else if (st === 'absent') ma += 1;
                  else if (st === 'late') ml += 1;
                });
                return (
                  <React.Fragment key={`${s.studentId}-${mg.key}`}>
                    <Text style={[styles.sumCell, { color: '#16A34A', width: SUM_W }]}>
                      {mp || '—'}
                    </Text>
                    <Text style={[styles.sumCell, { color: '#DC2626', width: SUM_W }]}>
                      {ma || '—'}
                    </Text>
                    <Text
                      style={[
                        styles.sumCell,
                        {
                          color: '#EA580C',
                          width: SUM_W,
                          borderRightWidth: 2,
                          borderRightColor: '#E2E8F0',
                        },
                      ]}
                    >
                      {ml || '—'}
                    </Text>
                  </React.Fragment>
                );
              })}
              <Text style={[styles.sumCell, { color: '#16A34A', width: SUM_W }]}>
                {s.present}
              </Text>
              <Text style={[styles.sumCell, { color: '#DC2626', width: SUM_W }]}>
                {s.absent}
              </Text>
              <Text style={[styles.sumCell, { color: '#EA580C', width: SUM_W }]}>
                {s.late}
              </Text>
              <Text
                style={[
                  styles.sumCell,
                  { width: 48, color: s.pct >= 75 ? '#16A34A' : '#DC2626' },
                ]}
              >
                {s.pct.toFixed(1)}%
              </Text>
              <View style={{ width: 56, alignItems: 'center', justifyContent: 'center' }}>
                <Badge
                  label={s.risk === 'Low Attendance' ? 'Low' : s.risk}
                  accent={
                    s.risk === 'OK' ? 'green' : s.risk === 'Critical' ? 'red' : 'orange'
                  }
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SurfaceCard>
  );
}

/* ════════ Staff Attendance (admin) ════════ */

function StaffAttendancePanel() {
  const theme = useTeacherTheme();
  const s = useAdminStaffAttendance();

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }),
        value: String(i + 1),
      })),
    [],
  );
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1].map((v) => ({ label: String(v), value: String(v) }));
  }, []);

  const metricItems: StatItem[] = useMemo(
    () => [
      {
        key: 'tot',
        icon: 'people-outline',
        value: s.metrics.totalStaff,
        label: 'Total Staff',
        accent: 'teal',
      },
      {
        key: 'p',
        icon: 'checkmark-circle-outline',
        value: s.metrics.presentToday,
        label: 'Present Today',
        accent: 'green',
      },
      {
        key: 'h',
        icon: 'remove-circle-outline',
        value: s.metrics.halfDayToday,
        label: 'Half Day Today',
        accent: 'orange',
      },
      {
        key: 'a',
        icon: 'close-circle-outline',
        value: s.metrics.absentToday,
        label: 'Absent Today',
        accent: 'red',
      },
      {
        key: 'wd',
        icon: 'calendar-outline',
        value: s.metrics.workingDays,
        label: 'Working Days',
        accent: 'blue',
      },
    ],
    [s.metrics],
  );

  const onSave = async () => {
    const ok = await s.saveChanges();
    if (ok) Alert.alert('Saved', 'Staff attendance updated.');
    else Alert.alert('Save failed', s.error || 'Could not save.');
  };

  const halfChip = (
    value: HalfStatus,
    active: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.bulkChip,
        {
          backgroundColor: active
            ? value === 'present'
              ? '#16A34A'
              : '#DC2626'
            : value === 'present'
              ? '#DCFCE7'
              : '#FEE2E2',
          borderColor: value === 'present' ? '#16A34A' : '#DC2626',
        },
      ]}
    >
      <Text
        style={{
          fontWeight: '800',
          color: active ? '#FFF' : value === 'present' ? '#16A34A' : '#DC2626',
          fontSize: 12,
        }}
      >
        {value === 'present' ? 'P' : 'A'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.sectionGap}>
      {s.pending.length > 0 ? (
        <SurfaceCard style={{ gap: 10, backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800', fontSize: 14, color: '#92400E', flex: 1 }}>
              Pending Approvals ({s.pending.length})
            </Text>
            <TouchableOpacity
              disabled={s.approvingAll}
              onPress={() => void s.approveAll()}
              style={[styles.pendingBtn, { backgroundColor: '#DCFCE7' }]}
            >
              <Text style={{ color: '#16A34A', fontWeight: '800', fontSize: 11 }}>
                {s.approvingAll ? '…' : 'Approve All'}
              </Text>
            </TouchableOpacity>
          </View>
          {s.pending.slice(0, 8).map((p) => (
            <View key={p.id} style={styles.pendingCard}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }} numberOfLines={1}>
                  {p.staffName}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {p.date} · 1H {p.firstHalf === 'present' ? 'P' : 'A'} · 2H{' '}
                  {p.secondHalf === 'present' ? 'P' : 'A'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => void s.approveOne(p.id, 'approved')}
                style={[styles.pendingBtn, { backgroundColor: '#DCFCE7' }]}
              >
                <Text style={{ color: '#16A34A', fontWeight: '800', fontSize: 11 }}>OK</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void s.approveOne(p.id, 'rejected')}
                style={[styles.pendingBtn, { backgroundColor: '#FEE2E2' }]}
              >
                <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 11 }}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={styles.filterCard}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>Filters</Text>
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>View Period</Text>
        <FilterChips
          size="sm"
          options={PERIODS}
          activeKey={s.viewPeriod}
          onChange={(k) => s.setViewPeriod(k as ViewPeriod)}
        />
        {s.viewPeriod === 'month' ? (
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Month</Text>
              <SelectField
                options={monthOptions}
                value={String(s.month)}
                onChange={(v) => s.setMonth(Number(v))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Year</Text>
              <SelectField
                options={yearOptions}
                value={String(s.year)}
                onChange={(v) => s.setYear(Number(v))}
              />
            </View>
          </View>
        ) : null}
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Department</Text>
        <SelectField
          options={[
            { label: 'All departments', value: 'all' },
            ...s.departmentOptions.map((d) => ({ label: d, value: d })),
          ]}
          value={s.department || 'all'}
          onChange={(v) => s.setDepartment(v || 'all')}
        />
        <SearchBar value={s.query} onChangeText={s.setQuery} placeholder="Name or employee code…" />
      </SurfaceCard>

      <StatGrid items={metricItems} columns={3} variant="tinted" />

      <SurfaceCard style={styles.bulkBar}>
        <Text style={[styles.bulkTitle, { color: theme.colors.textPrimary }]}>
          Bulk Mark · {s.selectedDate}
        </Text>
        <View style={styles.bulkRow}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>1H</Text>
          {halfChip('present', s.bulkFirst === 'present', () => s.setBulkFirst('present'))}
          {halfChip('absent', s.bulkFirst === 'absent', () => s.setBulkFirst('absent'))}
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>2H</Text>
          {halfChip('present', s.bulkSecond === 'present', () => s.setBulkSecond('present'))}
          {halfChip('absent', s.bulkSecond === 'absent', () => s.setBulkSecond('absent'))}
          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => s.applyBulk(s.selectedDate)}
          >
            <Text style={styles.applyText}>Apply to All</Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      {s.hasEdits ? (
        <View style={styles.toolbarRow}>
          <CompactBtn label="Discard" outline onPress={s.clearEdits} />
          <CompactBtn label={s.saving ? 'Saving…' : 'Update'} onPress={() => void onSave()} />
        </View>
      ) : null}

      {s.status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 16 }} />
      ) : null}
      {s.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{s.error}</Text>
      ) : null}

      <SurfaceCard style={styles.filterCard}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>Working days</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.calRow}>
            {s.workingDates.map((ds) => {
              const d = new Date(`${ds}T00:00:00`);
              const counts = s.dayCounts[ds];
              const active = ds === s.selectedDate;
              const isToday = ds === s.todayStr;
              const tone =
                !counts
                  ? '#CBD5E1'
                  : counts.absent > counts.present
                    ? '#FCA5A5'
                    : counts.half > 0
                      ? '#FDBA74'
                      : '#86EFAC';
              return (
                <TouchableOpacity
                  key={ds}
                  onPress={() => s.setSelectedDate(ds)}
                  style={[
                    styles.calChip,
                    {
                      borderColor: active ? theme.colors.primary : tone,
                      backgroundColor: active ? theme.colors.primary : '#FFF',
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: active ? 'rgba(255,255,255,0.85)' : '#94A3B8',
                    }}
                  >
                    {DAY_ABBR[d.getDay()]}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: active ? '#FFF' : theme.colors.textPrimary,
                    }}
                  >
                    {d.getDate()}
                  </Text>
                  {isToday ? (
                    <Text
                      style={{
                        fontSize: 8,
                        fontWeight: '800',
                        color: active ? '#FFF' : '#0F766E',
                      }}
                    >
                      TODAY
                    </Text>
                  ) : null}
                  <View style={[styles.calDot, { backgroundColor: tone }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SurfaceCard>

      {s.staffSummaries.length === 0 && s.status !== 'loading' ? (
        <EmptyState icon="people-outline" title="No staff" message="No active staff match filters." />
      ) : (
        <SurfaceCard padded={false} style={styles.listCard}>
          {s.staffSummaries.map((row, idx) => {
            const cell = row.selected;
            return (
              <View
                key={row.userId}
                style={[
                  styles.dayMarkRow,
                  {
                    borderBottomWidth:
                      idx < s.staffSummaries.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: theme.colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ fontWeight: '700', color: theme.colors.textPrimary }}
                    numberOfLines={1}
                  >
                    {row.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.colors.textSecondary }} numberOfLines={1}>
                    {row.employeeCode || '—'} · {row.department || row.designation || 'Staff'} ·{' '}
                    {row.pct.toFixed(0)}%
                  </Text>
                </View>
                <View style={{ gap: 4, alignItems: 'flex-end' }}>
                  <View style={styles.halfRow}>
                    <TouchableOpacity
                      onPress={() => s.toggleHalf(row.userId, s.selectedDate, 'first_half')}
                      style={[
                        styles.miniHalf,
                        {
                          backgroundColor:
                            cell.first_half === 'present' ? '#DCFCE7' : '#FEE2E2',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: cell.first_half === 'present' ? '#16A34A' : '#DC2626',
                        }}
                      >
                        1H {cell.first_half === 'present' ? 'P' : 'A'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => s.toggleHalf(row.userId, s.selectedDate, 'second_half')}
                      style={[
                        styles.miniHalf,
                        {
                          backgroundColor:
                            cell.second_half === 'present' ? '#DCFCE7' : '#FEE2E2',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: cell.second_half === 'present' ? '#16A34A' : '#DC2626',
                        }}
                      >
                        2H {cell.second_half === 'present' ? 'P' : 'A'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Badge
                    label={row.risk === 'Low Attendance' ? 'Low' : row.risk}
                    accent={
                      row.risk === 'OK' ? 'green' : row.risk === 'Critical' ? 'red' : 'orange'
                    }
                  />
                </View>
              </View>
            );
          })}
        </SurfaceCard>
      )}
    </View>
  );
}

/* ════════ My Attendance (staff / teacher self) ════════ */

function MyAttendancePanelLegacy() {
  const theme = useTeacherTheme();
  const { profile } = useTeacherStaffProfile();
  const m = useTeacherMyAttendance();

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }),
        value: String(i + 1),
      })),
    [],
  );
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1].map((v) => ({ label: String(v), value: String(v) }));
  }, []);

  const kpiCards: Array<{ label: string; value: string | number; color: string }> = [
    { label: 'Working Days', value: m.metrics.workingDays, color: '#374151' },
    { label: 'Recorded', value: m.metrics.recorded, color: '#64748B' },
    { label: 'Present', value: m.metrics.present, color: '#16A34A' },
    { label: 'Half Day', value: m.metrics.halfDay, color: '#D97706' },
    { label: 'Absent', value: m.metrics.absent, color: '#DC2626' },
    { label: 'Leave', value: m.metrics.leave, color: '#4F46E5' },
    { label: 'Day Value', value: m.metrics.dayValue, color: '#374151' },
    {
      label: 'Percentage',
      value: `${m.metrics.pct.toFixed(1)}%`,
      color: m.metrics.pct >= 75 ? '#16A34A' : '#DC2626',
    },
  ];

  return (
    <View style={styles.sectionGap}>
      <InfoBanner
        title="Your attendance"
        text={`Viewing your own staff attendance records · ${profile.name}`}
      />

      {/* Mark Today */}
      <SurfaceCard style={[styles.filterCard, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
        <Text style={{ fontWeight: '800', fontSize: 15, color: '#1E40AF' }}>
          Mark Today’s Attendance — {m.todayStr}
        </Text>
        <View style={styles.halfRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              1st Half
            </Text>
            <TouchableOpacity
              onPress={m.toggleSelfFirst}
              style={[
                styles.halfToggle,
                {
                  backgroundColor: m.selfFirst === 'present' ? '#DCFCE7' : '#FEE2E2',
                },
              ]}
            >
              <Text
                style={{
                  fontWeight: '800',
                  color: m.selfFirst === 'present' ? '#16A34A' : '#DC2626',
                }}
              >
                {m.selfFirst === 'present' ? 'P — Present' : 'A — Absent'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              2nd Half
            </Text>
            <TouchableOpacity
              onPress={m.toggleSelfSecond}
              style={[
                styles.halfToggle,
                {
                  backgroundColor: m.selfSecond === 'present' ? '#DCFCE7' : '#FEE2E2',
                },
              ]}
            >
              <Text
                style={{
                  fontWeight: '800',
                  color: m.selfSecond === 'present' ? '#16A34A' : '#DC2626',
                }}
              >
                {m.selfSecond === 'present' ? 'P — Present' : 'A — Absent'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <PrimaryButton
          label={m.saving ? 'Submitting…' : 'Submit'}
          icon="checkmark-circle-outline"
          loading={m.saving}
          onPress={() => void m.submitToday()}
        />
        {m.selfMsg ? (
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: m.selfMsg.toLowerCase().includes('submitted')
                ? '#16A34A'
                : theme.colors.danger,
            }}
          >
            {m.selfMsg}
          </Text>
        ) : null}
      </SurfaceCard>

      {/* Pending admin modifications */}
      {m.pendingFromAdmin.length > 0 ? (
        <SurfaceCard style={{ gap: 10, backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }}>
          <Text style={{ fontWeight: '800', fontSize: 14, color: '#92400E' }}>
            Admin Modified — Awaiting Approval ({m.pendingFromAdmin.length})
          </Text>
          {m.pendingFromAdmin.map((rec) => (
            <View key={rec.id} style={styles.pendingCard}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>
                  {rec.date}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  1H: {rec.firstHalf === 'present' ? 'P' : 'A'} · 2H:{' '}
                  {rec.secondHalf === 'present' ? 'P' : 'A'}
                </Text>
              </View>
              <TouchableOpacity
                disabled={m.approvingId === rec.id}
                onPress={() => void m.approvePending(rec.id, 'approved')}
                style={[styles.pendingBtn, { backgroundColor: '#DCFCE7' }]}
              >
                <Text style={{ color: '#16A34A', fontWeight: '800', fontSize: 11 }}>
                  Approve
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={m.approvingId === rec.id}
                onPress={() => void m.approvePending(rec.id, 'rejected')}
                style={[styles.pendingBtn, { backgroundColor: '#FEE2E2' }]}
              >
                <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 11 }}>
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </SurfaceCard>
      ) : null}

      {/* View period */}
      <SurfaceCard style={styles.filterCard}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
          View Period
        </Text>
        <FilterChips
          size="sm"
          options={PERIODS}
          activeKey={m.viewPeriod}
          onChange={(k) => m.setViewPeriod(k as ViewPeriod)}
        />
        {m.viewPeriod === 'month' ? (
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                Month
              </Text>
              <SelectField
                options={monthOptions}
                value={String(m.month)}
                onChange={(v) => m.setMonth(Number(v))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                Year
              </Text>
              <SelectField
                options={yearOptions}
                value={String(m.year)}
                onChange={(v) => m.setYear(Number(v))}
              />
            </View>
          </View>
        ) : null}
        <PrimaryButton
          label="View My Attendance"
          icon="refresh-outline"
          onPress={() => void m.refetch()}
        />
      </SurfaceCard>

      {m.status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
      ) : null}
      {m.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{m.error}</Text>
      ) : null}

      {/* KPI slider cards */}
      {m.status === 'ready' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiSlider}
        >
          {kpiCards.map((c) => (
            <View
              key={c.label}
              style={[styles.kpiSlideCard, theme.shadow.light, { borderColor: theme.colors.border }]}
            >
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>{c.label}</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: c.color, marginTop: 4 }}>
                {c.value}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {/* Attendance Grid — web-style week table */}
      {m.workingDates.length > 0 && m.status !== 'loading' ? (
        <SurfaceCard padded={false} style={styles.myGridCard}>
          <View style={styles.myGridTitleRow}>
            <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
              Attendance Grid
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {/* Week group header */}
              <View style={styles.myWeekHeaderRow}>
                <View style={{ width: MY_NAME_W }} />
                {m.weekGroups.map((wg) => (
                  <View
                    key={wg.label}
                    style={[
                      styles.myWeekHeaderCell,
                      { width: wg.dates.length * MY_DAY_W },
                    ]}
                  >
                    <Text style={styles.myWeekHeaderText}>{wg.label}</Text>
                  </View>
                ))}
                <View style={{ width: MY_SUM_W * 3 + MY_PCT_W }} />
              </View>

              {/* Day headers */}
              <View style={styles.myDayHeaderRow}>
                <View style={[styles.myNameHead, { width: MY_NAME_W }]}>
                  <Text style={styles.myThLabel}>Name</Text>
                </View>
                {m.workingDates.map((ds) => {
                  const d = new Date(`${ds}T00:00:00`);
                  const isToday = ds === m.todayStr;
                  return (
                    <View
                      key={ds}
                      style={[
                        styles.myDayHead,
                        { width: MY_DAY_W },
                        isToday && styles.myDayHeadToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.myDayDow,
                          isToday && { color: '#0F766E' },
                        ]}
                      >
                        {DAY_ABBR[d.getDay()]}
                      </Text>
                      <Text
                        style={[
                          styles.myDayNum,
                          {
                            color: isToday ? '#0F766E' : theme.colors.textPrimary,
                          },
                        ]}
                      >
                        {d.getDate()}
                      </Text>
                      {isToday ? (
                        <Text style={styles.myTodayTag}>TODAY</Text>
                      ) : (
                        <View style={{ height: 11 }} />
                      )}
                    </View>
                  );
                })}
                <Text style={[styles.mySumHead, { color: '#16A34A', width: MY_SUM_W }]}>
                  P
                </Text>
                <Text style={[styles.mySumHead, { color: '#D97706', width: MY_SUM_W }]}>
                  ½
                </Text>
                <Text style={[styles.mySumHead, { color: '#DC2626', width: MY_SUM_W }]}>
                  A
                </Text>
                <Text style={[styles.mySumHead, { color: '#64748B', width: MY_PCT_W }]}>
                  %
                </Text>
              </View>

              {/* Data row */}
              <View style={styles.myDataRow}>
                <View style={[styles.myNameCell, { width: MY_NAME_W }]}>
                  <Text style={styles.myNameText} numberOfLines={1}>
                    {profile.name.split(' ')[0] || 'Me'}
                  </Text>
                </View>
                {m.workingDates.map((ds) => {
                  const rec = m.recordMap[ds];
                  const isToday = ds === m.todayStr;
                  return (
                    <View
                      key={ds}
                      style={[
                        styles.myDayCell,
                        { width: MY_DAY_W },
                        isToday && styles.myDayCellToday,
                      ]}
                    >
                      {rec ? (
                        <StaffDayChip
                          first={rec.firstHalf}
                          second={rec.secondHalf}
                          approval={rec.approvalStatus}
                        />
                      ) : (
                        <View style={styles.emptyChip}>
                          <Text style={styles.emptyChipText}>—</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
                <Text style={[styles.mySumVal, { color: '#16A34A', width: MY_SUM_W }]}>
                  {m.gridSummary.gridP}
                </Text>
                <Text style={[styles.mySumVal, { color: '#D97706', width: MY_SUM_W }]}>
                  {m.gridSummary.gridH}
                </Text>
                <Text style={[styles.mySumVal, { color: '#DC2626', width: MY_SUM_W }]}>
                  {m.gridSummary.gridA}
                </Text>
                <Text
                  style={[
                    styles.mySumVal,
                    {
                      width: MY_PCT_W,
                      color: m.gridSummary.pct >= 75 ? '#16A34A' : '#DC2626',
                      fontSize: 12,
                    },
                  ]}
                >
                  {m.gridSummary.pct.toFixed(1)}%
                </Text>
              </View>
            </View>
          </ScrollView>
          {m.gridSummary.risk !== 'OK' ? (
            <View style={styles.myRiskRow}>
              <Badge
                label={
                  m.gridSummary.risk === 'Low Attendance'
                    ? 'Low Attendance'
                    : m.gridSummary.risk
                }
                accent={m.gridSummary.risk === 'Critical' ? 'red' : 'orange'}
              />
            </View>
          ) : null}
        </SurfaceCard>
      ) : null}

      {/* Detail records */}
      {m.status === 'ready' ? (
        <SurfaceCard style={styles.filterCard}>
          <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
            Filter records
          </Text>
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Status</Text>
          <SelectField
            options={[
              { label: 'All', value: 'all' },
              { label: 'Present', value: 'present' },
              { label: 'Half Day', value: 'half_day' },
              { label: 'Absent', value: 'absent' },
              { label: 'Leave', value: 'leave' },
            ]}
            value={m.statusFilter}
            onChange={m.setStatusFilter}
          />
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
            Approval
          </Text>
          <SelectField
            options={[
              { label: 'All', value: 'all' },
              { label: 'Pending', value: 'pending' },
              { label: 'Approved', value: 'approved' },
              { label: 'Rejected', value: 'rejected' },
            ]}
            value={m.approvalFilter}
            onChange={m.setApprovalFilter}
          />
          {m.statusFilter !== 'all' || m.approvalFilter !== 'all' ? (
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
              Showing {m.filteredRecords.length} of {m.records.length} records
            </Text>
          ) : null}
        </SurfaceCard>
      ) : null}

      <SurfaceCard padded={false} style={styles.listCard}>
        {m.filteredRecords.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No records"
            message="No staff attendance for this period / filter."
          />
        ) : (
          m.filteredRecords.map((r, i) => (
            <StaffRecordRow
              key={r.id}
              record={r}
              index={i}
              isLast={i === m.filteredRecords.length - 1}
            />
          ))
        )}
      </SurfaceCard>
    </View>
  );
}

function StaffDayChip({
  first,
  second,
  approval,
}: {
  first: string;
  second: string;
  approval: string;
}) {
  const fh = first === 'present';
  const sh = second === 'present';
  let label = '—';
  let bg = '#F1F5F9';
  let fg = '#94A3B8';
  let border = '#CBD5E1';
  if (fh && sh) {
    label = 'P';
    bg = '#DCFCE7';
    fg = '#16A34A';
    border = '#86EFAC';
  } else if (fh || sh) {
    label = '½';
    bg = '#FEF3C7';
    fg = '#D97706';
    border = '#FCD34D';
  } else {
    label = 'A';
    bg = '#FEE2E2';
    fg = '#DC2626';
    border = '#FCA5A5';
  }
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <View style={[styles.statusChip, { backgroundColor: bg, borderColor: border }]}>
        <Text style={[styles.statusChipText, { color: fg }]}>{label}</Text>
      </View>
      {approval === 'pending' ? (
        <Text style={{ fontSize: 9, color: '#D97706' }}>⏳</Text>
      ) : null}
      {approval === 'approved' ? (
        <Text style={{ fontSize: 9, color: '#16A34A' }}>✓</Text>
      ) : null}
      {approval === 'rejected' ? (
        <Text style={{ fontSize: 9, color: '#DC2626' }}>✗</Text>
      ) : null}
    </View>
  );
}

function StaffRecordRow({
  record: r,
  index,
  isLast,
}: {
  record: StaffAttRecord;
  index: number;
  isLast: boolean;
}) {
  const theme = useTeacherTheme();
  const statusAccent =
    r.status === 'absent'
      ? 'red'
      : r.status === 'half_day'
        ? 'orange'
        : r.status === 'leave'
          ? 'purple'
          : 'green';
  const approvalAccent =
    r.approvalStatus === 'approved'
      ? 'green'
      : r.approvalStatus === 'rejected'
        ? 'red'
        : 'orange';

  return (
    <View
      style={[
        styles.staffRecordRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
        { backgroundColor: index % 2 === 0 ? '#FFF' : '#FAFBFC' },
      ]}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontWeight: '800', color: theme.colors.textPrimary }}>
            #{index + 1} · {r.date}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>
            Day {r.dayValue}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <View
            style={[
              styles.miniHalf,
              { backgroundColor: r.firstHalf === 'present' ? '#DCFCE7' : '#FEE2E2' },
            ]}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: r.firstHalf === 'present' ? '#16A34A' : '#DC2626',
              }}
            >
              1H {r.firstHalf === 'present' ? 'P' : 'A'}
            </Text>
          </View>
          <View
            style={[
              styles.miniHalf,
              { backgroundColor: r.secondHalf === 'present' ? '#DCFCE7' : '#FEE2E2' },
            ]}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: r.secondHalf === 'present' ? '#16A34A' : '#DC2626',
              }}
            >
              2H {r.secondHalf === 'present' ? 'P' : 'A'}
            </Text>
          </View>
          <Badge
            label={
              r.status === 'half_day'
                ? 'Half Day'
                : r.status.charAt(0).toUpperCase() + r.status.slice(1)
            }
            accent={statusAccent as 'red' | 'orange' | 'purple' | 'green'}
          />
          <Badge
            label={
              r.approvalStatus.charAt(0).toUpperCase() + r.approvalStatus.slice(1)
            }
            accent={approvalAccent as 'green' | 'red' | 'orange'}
          />
          <Badge
            label={r.submissionType === 'self' ? 'Self' : 'Admin'}
            accent="blue"
          />
        </View>
        {r.remarks && r.remarks !== '—' ? (
          <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{r.remarks}</Text>
        ) : null}
      </View>
    </View>
  );
}

/* ════════ Class Report ════════ */

function ClassReportPanel() {
  const theme = useTeacherTheme();
  const session = useSchoolsSession();
  const { selectedYearId } = useAcademicYear();
  const [students, setStudents] = useState<
    Array<{
      id: number;
      name: string;
      classId: number;
      className: string;
      sectionId: number;
      sectionName: string;
      subjectId: number;
      subjectName: string;
    }>
  >([]);
  const [classId, setClassId] = useState<number | undefined>();
  const [sectionId, setSectionId] = useState<number | undefined>();
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return toLocalDateStr(d);
  });
  const [to, setTo] = useState(toLocalDateStr());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<
    Array<{
      id: number;
      name: string;
      present: number;
      absent: number;
      late: number;
      total: number;
      pct: number;
      risk: string;
    }>
  >([]);

  useEffect(() => {
    void studentsByUserApi
      .getAll({
        academic_year_id: selectedYearId ?? undefined,
        school_id: session.schoolId ?? undefined,
        per_page: 500,
      })
      .then((raw) => {
        const list = safeList<Record<string, unknown>>(raw).map((r) => ({
          id: pickNumber(r.user_id, r.student_id),
          name: pickString(r.name, r.username, 'Student'),
          classId: pickNumber(r.class_id),
          className: pickString(r.class_name, r.class_code, 'Class'),
          sectionId: pickNumber(r.section_id),
          sectionName: pickString(r.section_name, '—'),
          subjectId: pickNumber(r.subject_id),
          subjectName: pickString(r.subject_name, '—'),
        }));
        setStudents(list);
        if (!classId && list.length) setClassId(list[0].classId || undefined);
      })
      .catch(() => undefined);
  }, [selectedYearId, session.schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  const classOptions = useMemo(() => {
    const map = new Map<number, string>();
    students.forEach((s) => {
      if (s.classId) map.set(s.classId, s.className);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [students]);

  const sectionOptions = useMemo(() => {
    const map = new Map<number, string>();
    students
      .filter((s) => !classId || s.classId === classId)
      .forEach((s) => {
        if (s.sectionId) map.set(s.sectionId, s.sectionName || `Section ${s.sectionId}`);
      });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [students, classId]);

  const subjectOptions = useMemo(() => {
    const map = new Map<number, string>();
    students
      .filter(
        (s) =>
          (!classId || s.classId === classId) &&
          (!sectionId || s.sectionId === sectionId),
      )
      .forEach((s) => {
        if (s.subjectId) map.set(s.subjectId, s.subjectName || `Subject ${s.subjectId}`);
      });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [students, classId, sectionId]);

  const run = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const raw = await attendanceRecordsApi.getAll({
        class_id: classId,
        date_from: from,
        date_to: to,
        school_id: session.schoolId ?? undefined,
        per_page: 10000,
      });
      let items = safeList<Record<string, unknown>>(raw);
      if (subjectId) {
        items = items.filter((r) => pickNumber(r.subject_id) === subjectId);
      }

      const scoped = students.filter(
        (s) => s.classId === classId && (!sectionId || s.sectionId === sectionId),
      );
      const allowedIds = new Set(scoped.map((s) => s.id));
      const nameById = new Map(scoped.map((s) => [s.id, s.name]));

      const byStudent = new Map<
        number,
        { name: string; present: number; absent: number; late: number; total: number }
      >();
      items.forEach((r) => {
        const sid = pickNumber(r.student_id, r.user_id);
        if (!sid || (allowedIds.size > 0 && !allowedIds.has(sid))) return;
        const cur = byStudent.get(sid) || {
          name: nameById.get(sid) || pickString(r.student_name, r.name, `Student #${sid}`),
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
        };
        const st = pickString(r.status).toLowerCase();
        cur.total += 1;
        if (st === 'present') cur.present += 1;
        else if (st === 'absent') cur.absent += 1;
        else if (st === 'late') cur.late += 1;
        byStudent.set(sid, cur);
      });
      setRows(
        [...byStudent.entries()]
          .map(([id, v]) => {
            const pct = v.total
              ? Math.round(((v.present + v.late) / v.total) * 1000) / 10
              : 0;
            const risk = pct >= 75 ? 'OK' : pct >= 60 ? 'Low Attendance' : 'Critical';
            return { id, ...v, pct, risk };
          })
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch (e) {
      Alert.alert('Report failed', extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.sectionGap}>
      <SurfaceCard style={styles.filterCard}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
          Class Report
        </Text>
        <SelectField
          options={classOptions.map((c) => ({ label: c.name, value: String(c.id) }))}
          value={classId != null ? String(classId) : null}
          onChange={(v) => {
            setClassId(Number(v));
            setSectionId(undefined);
            setSubjectId(undefined);
          }}
          placeholder="Class"
        />
        <SelectField
          options={[
            { label: 'All sections', value: '' },
            ...sectionOptions.map((s) => ({ label: s.name, value: String(s.id) })),
          ]}
          value={sectionId != null ? String(sectionId) : ''}
          onChange={(v) => setSectionId(v ? Number(v) : undefined)}
        />
        {subjectOptions.length > 0 ? (
          <SelectField
            options={[
              { label: 'All subjects', value: '' },
              ...subjectOptions.map((s) => ({ label: s.name, value: String(s.id) })),
            ]}
            value={subjectId != null ? String(subjectId) : ''}
            onChange={(v) => setSubjectId(v ? Number(v) : undefined)}
          />
        ) : null}
        <FormField label="From (YYYY-MM-DD)">
          <TextField value={from} onChangeText={setFrom} />
        </FormField>
        <FormField label="To (YYYY-MM-DD)">
          <TextField value={to} onChangeText={setTo} />
        </FormField>
        <PrimaryButton label="Get Report" icon="bar-chart-outline" onPress={() => void run()} />
      </SurfaceCard>
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      <SurfaceCard padded={false} style={styles.listCard}>
        {rows.length === 0 ? (
          <EmptyState
            icon="document-outline"
            title="No report"
            message="Run Get Report to load class attendance."
          />
        ) : (
          rows.map((r, i) => (
            <View
              key={r.id}
              style={[
                styles.reportRow,
                i < rows.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>{r.name}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  P {r.present} · A {r.absent} · L {r.late} · {r.total} days
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontWeight: '800', color: theme.colors.primary }}>{r.pct}%</Text>
                <Badge
                  label={r.risk}
                  accent={r.risk === 'OK' ? 'green' : r.risk === 'Critical' ? 'red' : 'orange'}
                />
              </View>
            </View>
          ))
        )}
      </SurfaceCard>
    </View>
  );
}

/* ════════ Student Report ════════ */

function StudentReportPanel() {
  const theme = useTeacherTheme();
  const session = useSchoolsSession();
  const { selectedYearId } = useAcademicYear();
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<Array<{ id: number; name: string; adm: string }>>([]);
  const [studentId, setStudentId] = useState<number | undefined>();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return toLocalDateStr(d);
  });
  const [to, setTo] = useState(toLocalDateStr());
  const [summary, setSummary] = useState<Record<string, number | string> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setOptions([]);
      return;
    }
    const t = setTimeout(() => {
      void studentsByUserApi
        .getAll({
          academic_year_id: selectedYearId ?? undefined,
          school_id: session.schoolId ?? undefined,
          per_page: 200,
        })
        .then((raw) => {
          const needle = q.trim().toLowerCase();
          const list = safeList<Record<string, unknown>>(raw)
            .map((r) => ({
              id: pickNumber(r.user_id, r.student_id),
              name: pickString(r.name, r.username),
              adm: pickString(r.admission_number),
            }))
            .filter(
              (s) =>
                s.name.toLowerCase().includes(needle) ||
                s.adm.toLowerCase().includes(needle),
            )
            .slice(0, 20);
          const uniq = new Map(list.map((s) => [s.id, s]));
          setOptions([...uniq.values()]);
        })
        .catch(() => setOptions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q, selectedYearId, session.schoolId]);

  const run = async () => {
    if (!studentId) {
      Alert.alert('Select a student');
      return;
    }
    setLoading(true);
    try {
      const raw = (await attendanceRecordsApi.studentSummary({
        student_id: studentId,
        date_from: from,
        date_to: to,
        school_id: session.schoolId ?? undefined,
      })) as Record<string, unknown>;
      setSummary({
        total: pickNumber(raw.total_days, raw.total),
        present: pickNumber(raw.present, raw.present_days),
        absent: pickNumber(raw.absent, raw.absent_days),
        late: pickNumber(raw.late, raw.late_days),
        excused: pickNumber(raw.excused),
        pct: pickNumber(raw.percentage, raw.attendance_percentage),
      });
    } catch (e) {
      Alert.alert('Report failed', extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.sectionGap}>
      <SurfaceCard style={styles.filterCard}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
          Student Report
        </Text>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search name / adm no…" />
        {options.map((o) => (
          <TouchableOpacity
            key={o.id}
            style={[styles.pickRow, { borderColor: theme.colors.border }]}
            onPress={() => {
              setStudentId(o.id);
              setQ(o.name);
              setOptions([]);
            }}
          >
            <Text style={{ fontWeight: '600', color: theme.colors.textPrimary }}>{o.name}</Text>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{o.adm}</Text>
          </TouchableOpacity>
        ))}
        {studentId ? (
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
            Selected ID: {studentId}
          </Text>
        ) : null}
        <FormField label="From">
          <TextField value={from} onChangeText={setFrom} />
        </FormField>
        <FormField label="To">
          <TextField value={to} onChangeText={setTo} />
        </FormField>
        <PrimaryButton label="Get Report" icon="person-outline" onPress={() => void run()} />
      </SurfaceCard>
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {summary ? (
        <StatGrid
          columns={3}
          variant="tinted"
          items={[
            { key: 't', icon: 'calendar-outline', value: String(summary.total), label: 'Total Days', accent: 'teal' },
            { key: 'p', icon: 'checkmark-circle-outline', value: String(summary.present), label: 'Present', accent: 'green' },
            { key: 'a', icon: 'close-circle-outline', value: String(summary.absent), label: 'Absent', accent: 'red' },
            { key: 'l', icon: 'time-outline', value: String(summary.late), label: 'Late', accent: 'orange' },
            { key: 'e', icon: 'remove-circle-outline', value: String(summary.excused), label: 'Excused', accent: 'blue' },
            { key: 'pct', icon: 'trending-up-outline', value: `${summary.pct}%`, label: 'Percentage', accent: 'purple' },
          ]}
        />
      ) : null}
    </View>
  );
}

/* ════════ Settings ════════ */

const WD_OPTS = [
  { key: 'sun', label: 'Sun' },
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
];

function SettingsPanel() {
  const theme = useTeacherTheme();
  const session = useSchoolsSession();
  const [form, setForm] = useState({
    working_days: 'mon,tue,wed,thu,fri,sat',
    periods_per_day: '8',
    attendance_type: 'daily',
    min_attendance_percentage: '75',
    late_threshold_minutes: '15',
  });
  const [loading, setLoading] = useState(false);

  const selectedDays = useMemo(
    () =>
      new Set(
        form.working_days
          .split(',')
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean),
      ),
    [form.working_days],
  );

  const toggleDay = (key: string) => {
    const next = new Set(selectedDays);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const ordered = WD_OPTS.map((d) => d.key).filter((k) => next.has(k));
    setForm((f) => ({ ...f, working_days: ordered.join(',') }));
  };

  useEffect(() => {
    void attendanceSettingsApi
      .get({ school_id: session.schoolId ?? undefined })
      .then((raw) => {
        const s = ((raw as { data?: unknown })?.data ?? raw) as Record<string, unknown>;
        if (!s || typeof s !== 'object') return;
        setForm({
          working_days: pickString(s.working_days, form.working_days),
          periods_per_day: String(pickNumber(s.periods_per_day, 8)),
          attendance_type: pickString(s.attendance_type, 'daily'),
          min_attendance_percentage: String(pickNumber(s.min_attendance_percentage, 75)),
          late_threshold_minutes: String(pickNumber(s.late_threshold_minutes, 15)),
        });
      })
      .catch(() => undefined);
  }, [session.schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setLoading(true);
    try {
      const payload = {
        school_id: session.schoolId,
        working_days: form.working_days,
        periods_per_day: Number(form.periods_per_day),
        attendance_type: form.attendance_type,
        min_attendance_percentage: Number(form.min_attendance_percentage),
        late_threshold_minutes: Number(form.late_threshold_minutes),
      };
      try {
        await attendanceSettingsApi.update(payload);
      } catch {
        await attendanceSettingsApi.upsert(payload);
      }
      Alert.alert('Saved', 'Attendance settings updated.');
    } catch (e) {
      Alert.alert('Failed', extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.sectionGap}>
      <SurfaceCard style={styles.filterCard}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
          Attendance Settings
        </Text>
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
          Working days
        </Text>
        <View style={styles.bulkRow}>
          {WD_OPTS.map((d) => {
            const on = selectedDays.has(d.key);
            return (
              <TouchableOpacity
                key={d.key}
                onPress={() => toggleDay(d.key)}
                style={[
                  styles.bulkChip,
                  {
                    width: 44,
                    backgroundColor: on ? theme.colors.primary : '#F8FAFC',
                    borderColor: on ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 11,
                    color: on ? '#FFF' : theme.colors.textSecondary,
                  }}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <FormField label="Periods per day">
          <TextField
            value={form.periods_per_day}
            onChangeText={(periods_per_day) => setForm((f) => ({ ...f, periods_per_day }))}
            keyboardType="numeric"
          />
        </FormField>
        <FormField label="Attendance type">
          <SelectField
            options={[
              { label: 'Daily', value: 'daily' },
              { label: 'Period', value: 'period' },
              { label: 'Subject', value: 'subject' },
            ]}
            value={form.attendance_type}
            onChange={(attendance_type) => setForm((f) => ({ ...f, attendance_type }))}
          />
        </FormField>
        <FormField label="Min attendance %">
          <TextField
            value={form.min_attendance_percentage}
            onChangeText={(min_attendance_percentage) =>
              setForm((f) => ({ ...f, min_attendance_percentage }))
            }
            keyboardType="numeric"
          />
        </FormField>
        <FormField label="Late threshold (minutes)">
          <TextField
            value={form.late_threshold_minutes}
            onChangeText={(late_threshold_minutes) =>
              setForm((f) => ({ ...f, late_threshold_minutes }))
            }
            keyboardType="numeric"
          />
        </FormField>
        <PrimaryButton
          label={loading ? 'Saving…' : 'Save Settings'}
          icon="save-outline"
          loading={loading}
          onPress={() => void save()}
        />
      </SurfaceCard>
    </View>
  );
}

/* ── atoms ── */

function CompactBtn({
  label,
  onPress,
  outline,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
}) {
  const theme = useTeacherTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.compactBtn,
        {
          backgroundColor: outline ? theme.colors.surface : theme.colors.primary,
          borderColor: theme.colors.primary,
        },
      ]}
    >
      <Text
        style={{
          fontWeight: '700',
          fontSize: 13,
          color: outline ? theme.colors.primary : '#FFF',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 32 },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  heroSub: { fontSize: 14, lineHeight: 20, marginBottom: 2 },
  tabRail: { gap: 8, paddingRight: 8, paddingVertical: 2 },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  tabPillLabel: { fontSize: 13, fontWeight: '700' },
  sectionGap: { gap: 12 },
  filterCard: { gap: 8 },
  sectionHeading: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  row2: { flexDirection: 'row', gap: 10 },
  toolbarRow: { flexDirection: 'row', gap: 10 },
  listCard: { overflow: 'hidden' },
  bulkBar: { gap: 10 },
  bulkTitle: { fontSize: 14, fontWeight: '700' },
  bulkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  bulkChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  calRow: { flexDirection: 'row', gap: 8, paddingVertical: 4, paddingRight: 8 },
  calChip: {
    width: 52,
    minHeight: 68,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  calDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  dayMarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  kpiStrip: { flexDirection: 'row' },
  kpiSlider: { gap: 10, paddingVertical: 2, paddingRight: 8 },
  kpiSlideCard: {
    width: 118,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  halfRow: { flexDirection: 'row', gap: 10 },
  halfToggle: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  pendingBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  staffDayCell: {
    width: COL_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  myGridCard: { overflow: 'hidden' },
  myGridTitleRow: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  myWeekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 2,
    borderBottomColor: '#BBF7D0',
  },
  myWeekHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  myWeekHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.3,
  },
  myDayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  myNameHead: {
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  myThLabel: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  myDayHead: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  myDayHeadToday: {
    backgroundColor: '#CCFBF1',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#14B8A6',
  },
  myDayDow: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },
  myDayNum: { fontSize: 14, fontWeight: '800', marginTop: 1 },
  myTodayTag: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0F766E',
    marginTop: 1,
  },
  mySumHead: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 10,
  },
  myDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    backgroundColor: '#FFF',
  },
  myNameCell: {
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  myNameText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  myDayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  myDayCellToday: {
    backgroundColor: '#CCFBF1',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#14B8A6',
  },
  statusChip: {
    minWidth: 34,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statusChipText: { fontSize: 14, fontWeight: '900' },
  emptyChip: {
    minWidth: 34,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChipText: { fontSize: 14, fontWeight: '700', color: '#CBD5E1' },
  mySumVal: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  myRiskRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  staffRecordRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  miniHalf: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  pickRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  compactBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCard: { overflow: 'hidden' },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  stickyCols: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  tdText: {
    fontSize: 12,
    color: '#0F172A',
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  dayHead: {
    width: COL_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayCellBtn: {
    width: COL_W - 4,
    marginHorizontal: 2,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  sumCell: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 10,
  },
});
