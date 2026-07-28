/**
 * Student Attendance — web StudentAttendancePanel parity (mobile layout).
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentModuleHeader,
  SurfaceCard,
  SectionHeader,
  FilterChips,
  ProgressBar,
  DonutChart,
  BarChart,
  StatusPill,
  Badge,
  EmptyState,
  type ChipOption,
  type PillStatus,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';
import {
  useStudentAttendance,
  type AttStatusKey,
  type SubjectAttRow,
} from '../../../hooks/useStudentAttendance';

const VIEW_CHIPS: ChipOption[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'subjects', label: 'Subjects' },
  { key: 'daily', label: 'Daily' },
  { key: 'calendar', label: 'Calendar' },
];

const STATUS_PILL: Record<AttStatusKey, PillStatus> = {
  present: 'present',
  absent: 'absent',
  late: 'late',
  leave: 'leave',
};

const STATUS_DOT: Record<AttStatusKey, string> = {
  present: '#16A34A',
  late: '#F97316',
  absent: '#DC2626',
  leave: '#8B5CF6',
};

const TONE_ACCENT: Record<SubjectAttRow['statusTone'], 'green' | 'teal' | 'orange' | 'red'> = {
  excellent: 'green',
  good: 'teal',
  average: 'orange',
  risk: 'red',
};

function parseYmd(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return '0%';
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}%`;
}

export default function AttendanceScreen() {
  const theme = useTeacherTheme();
  const { profile } = useStudentData();
  const att = useStudentAttendance();
  const [view, setView] = useState('overview');
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [exporting, setExporting] = useState(false);

  const refetchRef = useRef(att.refetch);
  refetchRef.current = att.refetch;
  const onRefresh = useCallback(() => {
    void refetchRef.current();
  }, []);

  const onExport = useCallback(async () => {
    if (exporting) return;
    if (att.subjectRows.length === 0) {
      // Same guard as web Export Report (disabled when no subject rows)
      return;
    }
    setExporting(true);
    try {
      const { downloadStudentAttendancePdf } = await import(
        '../../../utils/studentAttendancePdf'
      );
      await downloadStudentAttendancePdf({
        dateFrom: att.dateFrom,
        dateTo: att.dateTo,
        overallPct: att.metrics.pct,
        rows: att.subjectRows,
        overall: att.subjectOverall,
        studentName: profile.name,
        classLabel: profile.className,
      });
    } catch (e) {
      // downloadStudentAttendancePdf already alerts; keep UI responsive
      if (__DEV__) console.warn('[Attendance] export failed', e);
    } finally {
      setExporting(false);
    }
  }, [
    exporting,
    att.subjectRows,
    att.subjectOverall,
    att.dateFrom,
    att.dateTo,
    att.metrics.pct,
    profile.name,
    profile.className,
  ]);

  const subjectChips: ChipOption[] = [
    { key: 'all', label: 'All Subjects' },
    ...att.subjectOptions.slice(0, 12),
  ];

  const belowRequired = att.metrics.pct < att.minRequired;
  const aboveBy = Math.round((att.metrics.pct - att.minRequired) * 10) / 10;

  return (
    <TeacherScreen
      header={
        <StudentModuleHeader
          title="Attendance"
          trailingIcon="refresh-outline"
          onTrailingPress={onRefresh}
          trailingAccessibilityLabel="Refresh attendance"
        />
      }
      contentStyle={styles.content}
      refreshing={att.status === 'loading'}
      onRefresh={onRefresh}
    >
      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Daily Operations</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          View your daily attendance history and monthly summary.
        </Text>
      </View>

      {/* Filters */}
      <SurfaceCard>
        <SectionHeader title="Filters" icon="options-outline" />
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.dateBtn, { borderColor: theme.colors.border }]}
            onPress={() => setPicking('from')}
          >
            <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>From</Text>
            <Text style={[styles.dateValue, { color: theme.colors.textPrimary }]}>
              {att.dateFrom || '—'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateBtn, { borderColor: theme.colors.border }]}
            onPress={() => setPicking('to')}
          >
            <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>To</Text>
            <Text style={[styles.dateValue, { color: theme.colors.textPrimary }]}>
              {att.dateTo || '—'}
            </Text>
          </TouchableOpacity>
        </View>

        {picking ? (
          <DateTimePicker
            value={parseYmd(picking === 'from' ? att.dateFrom : att.dateTo)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => {
              if (Platform.OS !== 'ios') setPicking(null);
              if (!date) return;
              const ymdStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              if (picking === 'from') att.setDateFrom(ymdStr);
              else att.setDateTo(ymdStr);
            }}
          />
        ) : null}

        <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>Subject</Text>
        <FilterChips
          options={subjectChips}
          activeKey={att.subjectFilter}
          onChange={att.setSubjectFilter}
          size="sm"
        />

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
            onPress={att.resetToAcademicYear}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.colors.primary }]}>Reset AY</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
            onPress={onRefresh}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.colors.primary }]}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: att.subjectRows.length ? theme.colors.primary : theme.colors.surfaceAlt,
                opacity: att.subjectRows.length && !exporting ? 1 : 0.55,
              },
            ]}
            disabled={!att.subjectRows.length || exporting}
            onPress={() => void onExport()}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="download-outline" size={16} color="#fff" />
            )}
            <Text style={styles.primaryBtnText}>
              {exporting ? 'Preparing…' : 'Export Report'}
            </Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      {att.status === 'loading' && !att.hasRecords ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 16 }} />
      ) : null}
      {att.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{att.error}</Text>
      ) : null}

      {/* 6 KPIs */}
      <View style={styles.kpiGrid}>
        {(
          [
            {
              label: 'Overall',
              value: fmtPct(att.metrics.pct),
              sub: belowRequired ? 'Below required' : 'Present',
              tint: belowRequired ? '#FEE2E2' : theme.colors.tintGreen,
              fg: belowRequired ? theme.colors.danger : theme.colors.success,
            },
            {
              label: 'Total Days',
              value: String(att.metrics.calendarTotal),
              sub: 'Till date',
              tint: theme.colors.tintBlue,
              fg: theme.colors.info,
            },
            {
              label: 'Days Marked',
              value: String(att.metrics.markedDays),
              sub: 'Unique days',
              tint: theme.colors.tintTeal,
              fg: theme.colors.primary,
            },
            {
              label: 'Attended',
              value: String(att.metrics.attended),
              sub: 'Present + Late',
              tint: theme.colors.tintGreen,
              fg: theme.colors.success,
            },
            {
              label: 'Missed',
              value: String(att.metrics.missed),
              sub: 'Total − Attended',
              tint: '#FEE2E2',
              fg: theme.colors.danger,
            },
            {
              label: 'Required',
              value: `${att.minRequired}%`,
              sub: 'Minimum',
              tint: theme.colors.tintPurple,
              fg: '#7C3AED',
            },
          ] as const
        ).map((k) => (
          <View key={k.label} style={[styles.kpiCard, { backgroundColor: k.tint }]}>
            <Text style={[styles.kpiValue, { color: k.fg }]}>{k.value}</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textPrimary }]}>{k.label}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>{k.sub}</Text>
          </View>
        ))}
      </View>

      <FilterChips options={VIEW_CHIPS} activeKey={view} onChange={setView} />

      {view === 'overview' ? (
        <>
          <SurfaceCard>
            <SectionHeader title="Attendance Trend" icon="trending-up-outline" />
            {att.monthTrend.length === 0 ? (
              <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                No monthly trend in this range yet.
              </Text>
            ) : (
              <BarChart data={att.monthTrend} height={130} barColor={theme.colors.primary} />
            )}
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeader title="Attendance Distribution" icon="pie-chart-outline" />
            <View style={styles.row}>
              <DonutChart
                size={120}
                strokeWidth={12}
                centerValue={fmtPct(att.metrics.pct)}
                centerLabel="Present"
                segments={[
                  { value: Math.max(att.metrics.present, 0), color: '#16A34A' },
                  { value: Math.max(att.metrics.late, 0), color: '#F97316' },
                  { value: Math.max(att.metrics.absent, 0), color: '#DC2626' },
                  { value: Math.max(att.metrics.leave, 0), color: '#8B5CF6' },
                ]}
              />
              <View style={styles.legend}>
                {(
                  [
                    ['Present', att.metrics.present, '#16A34A'],
                    ['Late', att.metrics.late, '#F97316'],
                    ['Absent', att.metrics.absent, '#DC2626'],
                    ['Leave', att.metrics.leave, '#8B5CF6'],
                  ] as const
                ).map(([label, value, color]) => {
                  const denom = att.metrics.calendarTotal || 1;
                  const share = Math.round((Number(value) / denom) * 1000) / 10;
                  return (
                    <View key={label} style={styles.legendRow}>
                      <View style={[styles.dot, { backgroundColor: color }]} />
                      <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 12 }}>
                        {label}
                      </Text>
                      <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>
                        {value} ({share}%)
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeader title="Today's Status" icon="today-outline" />
            <Text style={[styles.todayText, { color: theme.colors.textPrimary }]}>
              {att.todayStatus
                ? `You are ${att.todayStatus.charAt(0).toUpperCase() + att.todayStatus.slice(1)} today.`
                : 'No attendance marked for today yet.'}
            </Text>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeader title="This Week Summary" icon="calendar-outline" />
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              By day (not by subject).
            </Text>
            <View style={styles.weekRow}>
              {(
                [
                  ['Present', att.weekSummary.present, '#16A34A'],
                  ['Absent', att.weekSummary.absent, '#DC2626'],
                  ['Late', att.weekSummary.late, '#F97316'],
                ] as const
              ).map(([label, value, color]) => (
                <View
                  key={label}
                  style={[styles.weekTile, { backgroundColor: theme.colors.surfaceAlt }]}
                >
                  <Text style={[styles.weekValue, { color }]}>{value}</Text>
                  <Text style={[styles.weekLabel, { color: theme.colors.textSecondary }]}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </SurfaceCard>

          <SurfaceCard style={{ marginBottom: 24 }}>
            <SectionHeader title="Attendance Percentage" icon="speedometer-outline" />
            <View style={styles.ringWrap}>
              <DonutChart
                size={110}
                strokeWidth={11}
                centerValue={fmtPct(att.metrics.pct)}
                centerLabel="Present"
                segments={[
                  {
                    value: Math.min(100, Math.max(att.metrics.pct, 0.1)),
                    color: belowRequired ? '#DC2626' : '#16A34A',
                  },
                  {
                    value: Math.max(0, 100 - att.metrics.pct),
                    color: theme.colors.border,
                  },
                ]}
              />
              <Text
                style={[
                  styles.ringHint,
                  { color: belowRequired ? theme.colors.danger : theme.colors.success },
                ]}
              >
                {belowRequired
                  ? `Below required by ${Math.abs(aboveBy)}%`
                  : `Above required by ${aboveBy}%`}
              </Text>
            </View>
            <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
              Note: Attendance is calculated from marked records in the selected date range
              (present/late count as attended).
            </Text>
          </SurfaceCard>
        </>
      ) : null}

      {view === 'subjects' ? (
        <SurfaceCard style={{ marginBottom: 24 }}>
          <SectionHeader title="Subject Wise Attendance" icon="book-outline" />
          {att.subjectRows.length === 0 ? (
            <EmptyState
              icon="book-outline"
              title="No subject rows"
              message="No attendance records match this filter."
            />
          ) : (
            <>
              {att.subjectRows.map((row, idx) => (
                <View
                  key={row.id}
                  style={[styles.subjectRow, { borderBottomColor: theme.colors.border }]}
                >
                  <View style={styles.subjectHead}>
                    <Text style={[styles.subjectName, { color: theme.colors.textPrimary }]}>
                      {idx + 1}. {row.name}
                    </Text>
                    <Badge label={row.statusLabel} accent={TONE_ACCENT[row.statusTone]} />
                  </View>
                  <Text style={[styles.subjectMeta, { color: theme.colors.textSecondary }]}>
                    {row.code} · Total {row.total} · Attended {row.attended} · Absent {row.absent} ·
                    Late {row.late}
                  </Text>
                  <View style={styles.pctRow}>
                    <View style={{ flex: 1 }}>
                      <ProgressBar
                        percent={Math.min(100, row.pct)}
                        height={8}
                        color={row.pct >= att.minRequired ? theme.colors.success : theme.colors.danger}
                      />
                    </View>
                    <Text style={[styles.pctText, { color: theme.colors.textPrimary }]}>
                      {fmtPct(row.pct)}
                    </Text>
                  </View>
                </View>
              ))}
              <View style={[styles.overallRow, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Text style={[styles.subjectName, { color: theme.colors.textPrimary }]}>Overall</Text>
                <Text style={[styles.subjectMeta, { color: theme.colors.textSecondary }]}>
                  {att.subjectOverall.attended}/{att.subjectOverall.total} ·{' '}
                  {fmtPct(att.subjectOverall.pct)}
                </Text>
              </View>
            </>
          )}
        </SurfaceCard>
      ) : null}

      {view === 'daily' ? (
        <SurfaceCard style={{ marginBottom: 24 }} padded={false}>
          <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
            <SectionHeader title="Daily Attendance" icon="list-outline" />
          </View>
          {att.dailyRows.length === 0 ? (
            <View style={{ padding: 16 }}>
              <EmptyState
                icon="calendar-outline"
                title="No daily records"
                message="No attendance history in this range."
              />
            </View>
          ) : (
            att.dailyRows.map((row, index) => (
              <View
                key={row.id}
                style={[
                  styles.dailyRow,
                  {
                    borderBottomColor: theme.colors.border,
                    borderBottomWidth:
                      index < att.dailyRows.length - 1 ? StyleSheet.hairlineWidth : 0,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dailyDate, { color: theme.colors.textPrimary }]}>
                    {row.date} · {row.dayLabel}
                  </Text>
                  <Text style={[styles.dailySubject, { color: theme.colors.textSecondary }]}>
                    {row.subject}
                    {row.remarks !== '—' ? ` · ${row.remarks}` : ''}
                  </Text>
                </View>
                <StatusPill status={STATUS_PILL[row.status]} />
              </View>
            ))
          )}
        </SurfaceCard>
      ) : null}

      {view === 'calendar' ? (
        <SurfaceCard style={{ marginBottom: 24 }}>
          <View style={styles.calNav}>
            <TouchableOpacity onPress={() => att.shiftMonth(-1)} style={styles.calNavBtn}>
              <Ionicons name="chevron-back" size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.calTitle, { color: theme.colors.textPrimary }]}>
              {att.monthLabel}
            </Text>
            <TouchableOpacity onPress={() => att.shiftMonth(1)} style={styles.calNavBtn}>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.calHeader}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <Text key={`${d}-${i}`} style={[styles.calDow, { color: theme.colors.textSecondary }]}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.calGrid}>
            {att.monthCells.map((cell, index) => (
              <View
                key={`c-${index}`}
                style={[
                  styles.calCell,
                  {
                    borderColor: cell.isToday ? theme.colors.primary : theme.colors.border,
                    backgroundColor: cell.isToday
                      ? theme.colors.tintTeal
                      : theme.colors.surfaceAlt,
                  },
                ]}
              >
                {cell.day != null ? (
                  <>
                    <Text
                      style={[
                        styles.calDay,
                        {
                          color: cell.isToday
                            ? theme.colors.primary
                            : theme.colors.textPrimary,
                          fontWeight: cell.isToday ? '800' : '600',
                        },
                      ]}
                    >
                      {cell.day}
                    </Text>
                    {cell.status ? (
                      <View
                        style={[styles.calDot, { backgroundColor: STATUS_DOT[cell.status] }]}
                      />
                    ) : null}
                  </>
                ) : null}
              </View>
            ))}
          </View>
          <View style={styles.calLegend}>
            {(
              [
                ['Present', '#16A34A'],
                ['Late', '#F97316'],
                ['Absent', '#DC2626'],
              ] as const
            ).map(([label, color]) => (
              <View key={label} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{label}</Text>
              </View>
            ))}
          </View>
        </SurfaceCard>
      ) : null}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 28 },
  hero: { gap: 4 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  meta: { fontSize: 12, marginTop: 2 },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dateBtn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateLabel: { fontSize: 11, fontWeight: '600' },
  dateValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  chipLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtnText: { fontSize: 12, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: {
    width: '31%',
    flexGrow: 1,
    borderRadius: 14,
    padding: 12,
    minWidth: 100,
  },
  kpiValue: { fontSize: 18, fontWeight: '800' },
  kpiLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  kpiSub: { fontSize: 10, marginTop: 2 },

  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { fontSize: 13, paddingVertical: 8 },
  todayText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  hint: { fontSize: 12, marginBottom: 10 },
  weekRow: { flexDirection: 'row', gap: 8 },
  weekTile: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  weekValue: { fontSize: 20, fontWeight: '800' },
  weekLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  ringWrap: { alignItems: 'center', gap: 8 },
  ringHint: { fontSize: 13, fontWeight: '700' },
  note: { fontSize: 12, lineHeight: 17, marginTop: 10 },

  subjectRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  subjectHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subjectName: { fontSize: 14, fontWeight: '700', flex: 1 },
  subjectMeta: { fontSize: 11, lineHeight: 15 },
  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pctText: { fontSize: 12, fontWeight: '800', width: 48, textAlign: 'right' },
  overallRow: { marginTop: 8, borderRadius: 10, padding: 12, gap: 4 },

  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dailyDate: { fontSize: 13, fontWeight: '700' },
  dailySubject: { fontSize: 12, marginTop: 2 },

  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calNavBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  calTitle: { fontSize: 15, fontWeight: '800' },
  calHeader: { flexDirection: 'row', marginBottom: 4 },
  calDow: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%` as unknown as number,
    minHeight: 42,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    alignItems: 'center',
  },
  calDay: { fontSize: 11 },
  calDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  calLegend: { flexDirection: 'row', gap: 14, marginTop: 12 },
});
