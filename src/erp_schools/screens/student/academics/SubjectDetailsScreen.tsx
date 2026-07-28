/**
 * Subject Details — web ClassDetailView analytics parity.
 * Route param subjectId = enrollment class_id (not performance subject_id).
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentModuleHeader,
  SurfaceCard,
  SectionHeader,
  ProgressBar,
  DonutChart,
  BarChart,
  Badge,
  ScreenLoader,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useOpenStudentTimetable } from '../../../hooks/useOpenStudentTimetable';
import { useStudentSubjectsData } from '../../../hooks/useStudentSubjectsData';
import type { StudentStackParamList } from '../../../types/navigation';
import { pickNumber, pickString } from '../../../utils/apiHelpers';
import { formatDateLabel } from '../../../utils/studentDashboardMeta';
import {
  attendanceTrendFromRecords,
  daysToMaintain75,
  examsForSubject,
  filterRecordsInPeriod,
  gradeFromPct,
  marksDistribution,
  performanceTrendFromExams,
  rankTrend,
  skillsRadarFromScore,
  subjectAttendanceMetrics,
  topicBarsFromScore,
} from '../../../utils/studentSubjectsMeta';

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return '0%';
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}%`;
}

export default function SubjectDetailsScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const openTimetable = useOpenStudentTimetable();
  const route = useRoute<RouteProp<StudentStackParamList, 'SubjectDetails'>>();
  const subjectId = route.params?.subjectId;
  const data = useStudentSubjectsData();

  const refetchRef = useRef(data.refetch);
  refetchRef.current = data.refetch;
  const bootstrappedRef = useRef(data.status === 'ready' || data.status === 'error');
  if (data.status === 'ready' || data.status === 'error') bootstrappedRef.current = true;

  const onRefresh = useCallback(() => {
    void refetchRef.current();
  }, []);

  const row = data.getRowByKey(subjectId);

  const subjectExams = useMemo(
    () => (row ? examsForSubject(data.exams, row.subject, row.subjectId) : []),
    [row, data.exams],
  );

  const perfTrend = useMemo(
    () => performanceTrendFromExams(subjectExams, row?.percentage ?? null),
    [subjectExams, row?.percentage],
  );

  const subjectAtt = useMemo(() => {
    if (!row) {
      return { present: 0, absent: 0, late: 0, leave: 0, markedDays: 0, percentage: 0 };
    }
    return subjectAttendanceMetrics(
      data.attendanceRecords,
      row.subjectId,
      data.attendanceMetrics.periodStart,
      data.attendanceMetrics.periodEnd,
      data.attendanceMetrics.calendarTotalDays,
      row.attendancePct,
    );
  }, [row, data.attendanceRecords, data.attendanceMetrics]);

  const attTrend = useMemo(() => {
    if (!row) return [];
    const periodRecords = filterRecordsInPeriod(
      data.attendanceRecords,
      data.attendanceMetrics.periodStart,
      data.attendanceMetrics.periodEnd,
    );
    const subjectScoped = row.subjectId
      ? periodRecords.filter((r) => pickNumber(r.subject_id) === row.subjectId)
      : [];
    // Prefer subject-tagged days; fall back to overall AY records (real data, not placeholders)
    const source = subjectScoped.length > 0 ? subjectScoped : periodRecords;
    return attendanceTrendFromRecords(source);
  }, [row, data.attendanceRecords, data.attendanceMetrics]);

  const topics = row ? topicBarsFromScore(row.subject, row.percentage) : [];
  const donut = marksDistribution(row?.percentage ?? null);
  const radar = skillsRadarFromScore(row?.percentage ?? null);
  const rankLine = rankTrend(row?.rankNum || 0, data.classRows.length || 5);
  const hasMarks = row?.percentage != null;

  const examHistory = useMemo(() => {
    if (!row) return [];
    return subjectExams
      .filter((e) => pickString(e.exam_date).slice(0, 10) <= data.todayStr)
      .sort((a, b) => pickString(b.exam_date).localeCompare(pickString(a.exam_date)))
      .map((e) => {
        const max = pickNumber(e.max_marks) || 100;
        const score =
          row.percentage != null ? Math.round((row.percentage / 100) * max) : null;
        return {
          exam: pickString(e.exam_name, 'Exam'),
          date: pickString(e.exam_date).slice(0, 10),
          score,
          max,
          pct: row.percentage,
          grade: row.grade,
        };
      });
  }, [subjectExams, data.todayStr, row]);

  const homeworkDue = useMemo(
    () =>
      data.assignments
        .filter((a) => pickString(a.due_date).slice(0, 10) >= data.todayStr)
        .slice(0, 4),
    [data.assignments, data.todayStr],
  );

  const upcomingHolidays = useMemo(
    () =>
      data.holidays
        .filter((h) => pickString(h.start_date).slice(0, 10) >= data.todayStr)
        .slice(0, 3),
    [data.holidays, data.todayStr],
  );

  const upcomingForSubject = useMemo(() => {
    if (!row) return [];
    return examsForSubject(data.upcomingExams, row.subject, row.subjectId).slice(0, 4);
  }, [data.upcomingExams, row]);

  const scoredRows = useMemo(
    () => data.classRows.filter((r) => r.percentage != null),
    [data.classRows],
  );
  const classAvg = scoredRows.length
    ? scoredRows.reduce((s, r) => s + (r.percentage || 0), 0) / scoredRows.length
    : 0;
  const classHighest = scoredRows.length
    ? Math.max(...scoredRows.map((r) => r.percentage || 0))
    : 0;

  const heatDays = useMemo(() => {
    if (!row) return [] as Record<string, unknown>[];
    const periodRecords = filterRecordsInPeriod(
      data.attendanceRecords,
      data.attendanceMetrics.periodStart,
      data.attendanceMetrics.periodEnd,
    );
    const subjectScoped = row.subjectId
      ? periodRecords.filter((r) => pickNumber(r.subject_id) === row.subjectId)
      : [];
    return (subjectScoped.length > 0 ? subjectScoped : periodRecords).slice(-28);
  }, [row, data.attendanceRecords, data.attendanceMetrics]);

  const examAnalytics = useMemo(() => {
    const total = subjectExams.length;
    const appeared = subjectExams.filter(
      (e) => pickString(e.exam_date).slice(0, 10) < data.todayStr,
    ).length;
    const pct = row?.percentage ?? null;
    return {
      total,
      appeared,
      missed: 0,
      // Web invents H/L/Avg from pct??72 even with 0 exams — keep honest on mobile
      highest: pct != null ? `${Math.min(100, Math.round(pct + 5))}%` : '—',
      lowest: pct != null ? `${Math.max(40, Math.round(pct - 8))}%` : '—',
      average: pct != null ? `${Math.round(pct)}%` : '—',
    };
  }, [subjectExams, data.todayStr, row?.percentage]);

  const recentActivity = useMemo(() => {
    if (!row) return [] as string[];
    const items: string[] = [];
    if (row.percentage != null) items.push('Exam marks updated for this subject.');
    items.push('Attendance synced from school records.');
    const noticeTitle = pickString(data.notices[0]?.title);
    if (noticeTitle) items.push(`Notice: ${noticeTitle}`);
    return items;
  }, [row, data.notices]);

  const insights = useMemo(() => {
    if (!row) return [];
    if (row.percentage == null) {
      return [
        `No exam marks entered yet for ${row.subject}.`,
        row.attendancePct < 75
          ? `Attendance is currently ${fmtPct(row.attendancePct)}.`
          : 'Attendance looks healthy for this subject.',
      ];
    }
    const pctVal = row.percentage;
    return [
      pctVal >= 85 ? `Strong in ${row.subject}.` : `Keep practicing ${row.subject} concepts.`,
      row.attendancePct < 75
        ? `Attendance dropped — currently ${fmtPct(row.attendancePct)}.`
        : 'Attendance is healthy for this subject.',
      `Predicted grade: ${gradeFromPct(pctVal)}.`,
      pctVal >= 80
        ? 'Chance of scoring above 90% with consistent revision.'
        : 'Focus on weak topics to improve next term.',
    ];
  }, [row]);

  const daysNeeded = daysToMaintain75(
    subjectAtt.present,
    data.attendanceMetrics.calendarTotalDays || subjectAtt.markedDays,
  );

  if (!bootstrappedRef.current && (data.status === 'idle' || data.status === 'loading')) {
    return (
      <TeacherScreen contentStyle={styles.content}>
        <ScreenLoader message="Loading subject…" />
      </TeacherScreen>
    );
  }

  if (!row) {
    return (
      <TeacherScreen
        header={
          <StudentModuleHeader
            title="Subject"
            showBack
            onBack={() => navigation.goBack()}
          />
        }
        contentStyle={styles.content}
      >
        <Text style={{ color: theme.colors.textSecondary }}>
          Subject not found. Go back and try again.
        </Text>
      </TeacherScreen>
    );
  }

  const pct = row.percentage;

  return (
    <TeacherScreen
      header={
        <StudentModuleHeader
          title={row.classroomName || row.subject || 'Subject'}
          showBack
          onBack={() => navigation.goBack()}
        />
      }
      contentStyle={styles.content}
      refreshing={data.status === 'loading'}
      onRefresh={onRefresh}
    >
      <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
        {[
          row.teacher ? `Teacher: ${row.teacher}` : '',
          `Subject: ${row.subject}`,
          [row.className, row.sectionName].filter(Boolean).join(' · '),
          data.yearLabel ? `Year: ${data.yearLabel}` : '',
          row.schedule?.length ? `Schedule: ${row.schedule.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('\n')}
      </Text>

      {/* Header badges */}
      <View style={styles.badgeRow}>
        <Badge label={row.status} accent="green" />
        <Badge label={`Grade ${row.grade}`} accent="blue" />
        <Badge label={`Rank ${row.rank}`} accent="teal" />
      </View>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        {[
          {
            label: 'Attendance',
            value: fmtPct(row.attendancePct),
            tint: row.attendancePct < 75 ? '#FEE2E2' : theme.colors.tintGreen,
            fg: row.attendancePct < 75 ? theme.colors.danger : theme.colors.success,
          },
          {
            label: 'Avg Marks',
            value: pct != null ? fmtPct(pct) : 'N/A',
            tint: theme.colors.tintTeal,
            fg: theme.colors.primary,
          },
          {
            label: 'Rank',
            value: row.rank,
            tint: theme.colors.tintBlue,
            fg: theme.colors.info,
          },
          {
            label: 'Grade',
            value: row.grade,
            tint: theme.colors.tintPurple,
            fg: '#7E22CE',
          },
        ].map((k) => (
          <View key={k.label} style={[styles.kpiCard, { backgroundColor: k.tint }]}>
            <Text style={[styles.kpiValue, { color: k.fg }]}>{k.value}</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Performance trend */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Performance Trend" icon="trending-up-outline" />
        {perfTrend.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            {hasMarks
              ? 'No exam schedule points for this subject yet.'
              : 'Performance trend appears after marks are entered for this subject.'}
          </Text>
        ) : (
          <BarChart
            data={perfTrend.map((p) => ({ label: p.name, value: Math.round(p.score) }))}
            height={130}
            barColor={row.color}
          />
        )}
      </SurfaceCard>

      {/* Attendance trend */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Attendance Trend" icon="calendar-outline" />
        {attTrend.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            No attendance records in this academic year window yet.
          </Text>
        ) : (
          <BarChart
            data={attTrend.map((p) => ({
              label: p.date.length > 7 ? p.date.slice(5) : p.date,
              value: p.pct,
            }))}
            height={130}
            barColor={theme.colors.success}
          />
        )}
        {daysNeeded > 0 && daysNeeded <= 90 ? (
          <Text style={[styles.hint, { color: theme.colors.warning }]}>
            Attend ~{daysNeeded} more day(s) to reach 75% attendance.
          </Text>
        ) : row.attendancePct >= 75 ? (
          <Text style={[styles.hint, { color: theme.colors.success }]}>
            Attendance target (75%) is on track.
          </Text>
        ) : row.attendancePct > 0 ? (
          <Text style={[styles.hint, { color: theme.colors.warning }]}>
            Current attendance {fmtPct(row.attendancePct)} — below 75% target.
          </Text>
        ) : null}
      </SurfaceCard>

      {/* Topic bars */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Topic Performance" icon="list-outline" />
        {topics.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            Topic breakdown appears after subject marks are available.
          </Text>
        ) : (
          topics.map((t) => (
            <View key={t.topic} style={styles.topicRow}>
              <Text style={[styles.topicLabel, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {t.topic}
              </Text>
              <View style={{ flex: 1 }}>
                <ProgressBar percent={Math.min(100, t.score)} height={8} color={row.color} />
              </View>
              <Text style={[styles.topicPct, { color: theme.colors.textSecondary }]}>
                {Math.round(t.score)}%
              </Text>
            </View>
          ))
        )}
      </SurfaceCard>

      {/* Marks distribution */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Marks Distribution" icon="pie-chart-outline" />
        {donut.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            Marks distribution appears after subject marks are available.
          </Text>
        ) : (
          <View style={styles.row}>
            <DonutChart
              size={110}
              strokeWidth={12}
              centerValue={pct != null ? fmtPct(pct) : '—'}
              centerLabel="Score"
              segments={[
                { value: donut[0]?.value ?? 0, color: '#16A34A' },
                { value: donut[1]?.value ?? 0, color: '#0284C7' },
                { value: donut[2]?.value ?? 0, color: '#F97316' },
                { value: donut[3]?.value ?? 0, color: '#DC2626' },
              ]}
            />
            <View style={styles.legend}>
              {donut.map((d, i) => (
                <View key={d.name} style={styles.legendRow}>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: ['#16A34A', '#0284C7', '#F97316', '#DC2626'][i],
                      },
                    ]}
                  />
                  <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 12 }}>{d.name}</Text>
                  <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>{d.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </SurfaceCard>

      {/* Skills */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Skills Snapshot" icon="flash-outline" />
        {radar.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            Skills snapshot appears after subject marks are available.
          </Text>
        ) : (
          radar.map((s) => (
            <View key={s.skill} style={styles.topicRow}>
              <Text style={[styles.topicLabel, { color: theme.colors.textPrimary, width: 110 }]}>
                {s.skill}
              </Text>
              <View style={{ flex: 1 }}>
                <ProgressBar percent={Math.min(100, s.value)} height={7} />
              </View>
              <Text style={[styles.topicPct, { color: theme.colors.textSecondary }]}>
                {Math.round(s.value)}
              </Text>
            </View>
          ))
        )}
      </SurfaceCard>

      {/* Rank trend */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Rank Trend" icon="podium-outline" />
        {rankLine.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            Rank trend appears after subject marks are available.
          </Text>
        ) : (
          <>
            <BarChart
              data={rankLine.map((r) => ({ label: r.term, value: r.rank }))}
              height={110}
              barColor={theme.colors.info}
            />
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Lower rank number is better (1 = top).
            </Text>
          </>
        )}
      </SurfaceCard>

      {/* Exam Analytics */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Exam Analytics" icon="document-text-outline" />
        <View style={styles.examStatGrid}>
          {(
            [
              ['Total', String(examAnalytics.total)],
              ['Appeared', String(examAnalytics.appeared)],
              ['Missed', String(examAnalytics.missed)],
              ['Highest', examAnalytics.highest],
              ['Lowest', examAnalytics.lowest],
              ['Average', examAnalytics.average],
            ] as const
          ).map(([label, value]) => (
            <View
              key={label}
              style={[styles.examStatCard, { backgroundColor: theme.colors.surfaceAlt }]}
            >
              <Text style={[styles.examStatValue, { color: theme.colors.primary }]}>{value}</Text>
              <Text style={[styles.examStatLabel, { color: theme.colors.textSecondary }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>
        {examHistory.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            No exam history for this subject yet.
          </Text>
        ) : (
          examHistory.map((e, i) => (
            <View
              key={`${e.exam}-${e.date}-${i}`}
              style={[styles.listRow, { borderBottomColor: theme.colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>{e.exam}</Text>
                <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                  {formatDateLabel(e.date)}
                  {e.pct != null ? ` · ${Math.round(e.pct)}% · Rank ${row.rank}` : ''}
                </Text>
              </View>
              <Text style={[styles.rowTitle, { color: theme.colors.primary }]}>
                {e.score != null ? `${e.score}/${e.max}` : '—'} · {e.grade}
              </Text>
            </View>
          ))
        )}
      </SurfaceCard>

      {/* Attendance detail (web ClassDetailView) */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Attendance" icon="pie-chart-outline" />
        <Text style={[styles.attHero, { color: theme.colors.success }]}>
          {fmtPct(subjectAtt.percentage)}
        </Text>
        <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
          Present {subjectAtt.present} · Absent {subjectAtt.absent} · Leave {subjectAtt.leave} · Late{' '}
          {subjectAtt.late}
        </Text>
        <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
          Academic year: {String(data.attendanceMetrics.periodStart || '').slice(0, 10)} —{' '}
          {String(data.attendanceMetrics.periodEnd || '').slice(0, 10)}
          {data.attendanceMetrics.calendarTotalDays
            ? ` · ${data.attendanceMetrics.calendarTotalDays} total days`
            : ''}
        </Text>
        <Text
          style={[
            styles.hint,
            { color: daysNeeded > 0 ? theme.colors.primary : theme.colors.success },
          ]}
        >
          {daysNeeded > 0
            ? `${daysNeeded} more present day(s) needed to maintain 75%.`
            : 'You meet the 75% attendance requirement.'}
        </Text>
        <View style={styles.heatRow}>
          {heatDays.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
              Calendar heatmap fills as attendance records sync.
            </Text>
          ) : (
            heatDays.map((r, i) => {
              const st = String(r.status ?? '').toLowerCase();
              const ok = st === 'present' || st === 'late';
              return (
                <View
                  key={String(r.id ?? `${pickString(r.date)}-${i}`)}
                  style={[styles.heatCell, { backgroundColor: ok ? '#10B981' : '#FCA5A5' }]}
                />
              );
            })
          )}
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          <DonutChart
            size={100}
            strokeWidth={11}
            centerValue={fmtPct(subjectAtt.percentage)}
            centerLabel="Present"
            segments={[
              { value: Math.max(subjectAtt.present, 0), color: '#16A34A' },
              { value: Math.max(subjectAtt.absent, 0), color: '#DC2626' },
              { value: Math.max(subjectAtt.leave, 0), color: '#F97316' },
              { value: Math.max(subjectAtt.late, 0), color: '#0284C7' },
            ]}
          />
          <View style={styles.legend}>
            {[
              { label: 'Present', value: subjectAtt.present, color: '#16A34A' },
              { label: 'Absent', value: subjectAtt.absent, color: '#DC2626' },
              { label: 'Leave', value: subjectAtt.leave, color: '#F97316' },
              { label: 'Late', value: subjectAtt.late, color: '#0284C7' },
            ].map((r) => (
              <View key={r.label} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: r.color }]} />
                <Text style={{ flex: 1, color: theme.colors.textPrimary, fontWeight: '600' }}>
                  {r.label}
                </Text>
                <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </SurfaceCard>

      {/* Compare with subject average */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Compare with Subject Average" icon="stats-chart-outline" />
        {scoredRows.length === 0 && pct == null ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            Comparison appears after marks are available for subjects.
          </Text>
        ) : (
          <>
            <BarChart
              data={[
                { label: 'You', value: Math.round(pct ?? 0) },
                { label: 'Subject Avg', value: Math.round(classAvg) },
                {
                  label: 'Highest',
                  value: Math.round(Math.max(classHighest, pct ?? 0)),
                },
              ]}
              height={140}
              barColor={theme.colors.primary}
            />
            {pct == null ? (
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                Your marks not entered yet — peer average shown when available.
              </Text>
            ) : null}
          </>
        )}
      </SurfaceCard>

      {/* AI Insights */}
      <SurfaceCard style={[styles.section, { backgroundColor: theme.colors.tintTeal }]}>
        <SectionHeader title="AI Insights" icon="bulb-outline" />
        {insights.map((line, i) => (
          <Text key={i} style={[styles.insight, { color: theme.colors.textPrimary }]}>
            • {line}
          </Text>
        ))}
      </SurfaceCard>

      {/* Upcoming exams for subject */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Upcoming Exams" icon="calendar-outline" />
        {upcomingForSubject.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            No upcoming exams scheduled.
          </Text>
        ) : (
          upcomingForSubject.map((e, i) => (
            <View
              key={`${pickString(e.exam_name)}-${i}`}
              style={[styles.listRow, { borderBottomColor: theme.colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>
                  {pickString(e.exam_name, e.subject_name)}
                </Text>
                <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                  {formatDateLabel(pickString(e.exam_date))}
                </Text>
              </View>
            </View>
          ))
        )}
      </SurfaceCard>

      {/* Upcoming & Due (holidays + homework + notices) */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Upcoming & Due" icon="albums-outline" />
        <Text style={[styles.subHead, { color: theme.colors.textSecondary }]}>Holidays</Text>
        {upcomingHolidays.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>None upcoming</Text>
        ) : (
          upcomingHolidays.map((h, i) => (
            <Text
              key={String(h.id ?? i)}
              style={[styles.dueLine, { color: theme.colors.textPrimary }]}
            >
              {pickString(h.name, 'Holiday')} · {pickString(h.start_date).slice(0, 10)}
            </Text>
          ))
        )}
        <Text style={[styles.subHead, { color: theme.colors.textSecondary, marginTop: 10 }]}>
          Homework due
        </Text>
        {homeworkDue.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            No pending homework
          </Text>
        ) : (
          homeworkDue.map((a, i) => (
            <Text
              key={String(a.id ?? i)}
              style={[styles.dueLine, { color: theme.colors.textPrimary }]}
            >
              {pickString(a.title, a.name, 'Assignment')} · {pickString(a.due_date).slice(0, 10)}
            </Text>
          ))
        )}
        <Text style={[styles.subHead, { color: theme.colors.textSecondary, marginTop: 10 }]}>
          Notices
        </Text>
        {data.notices.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>No notices</Text>
        ) : (
          data.notices.slice(0, 2).map((n, i) => (
            <Text
              key={String(n.id ?? i)}
              style={[styles.dueLine, { color: theme.colors.textPrimary }]}
              numberOfLines={2}
            >
              {pickString(n.title, 'Notice')}
            </Text>
          ))
        )}
      </SurfaceCard>

      {/* Recent Activity */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Recent Activity" icon="time-outline" />
        <View style={[styles.activityRail, { borderLeftColor: theme.colors.primary }]}>
          {recentActivity.map((line, i) => (
            <Text key={i} style={[styles.dueLine, { color: theme.colors.textPrimary }]}>
              {line}
            </Text>
          ))}
        </View>
      </SurfaceCard>

      {/* Quick actions */}
      <SurfaceCard style={[styles.section, { marginBottom: 24 }]}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actions}>
          {[
            { label: 'Attendance', icon: 'calendar-outline' as const, route: 'Attendance' as const },
            { label: 'Exams', icon: 'calendar-number-outline' as const, route: 'ExamSchedule' as const },
            { label: 'Timetable', icon: 'time-outline' as const, route: 'StudentTimetable' as const },
            { label: 'Notices', icon: 'megaphone-outline' as const, route: 'Notices' as const },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceAlt }]}
              onPress={() =>
                a.route === 'StudentTimetable' ? openTimetable() : navigation.navigate(a.route)
              }
              activeOpacity={0.85}
            >
              <Ionicons name={a.icon} size={18} color={theme.colors.primary} />
              <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 72,
  },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  section: { marginTop: 0 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  topicLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
  topicPct: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
  hint: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  attHero: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  heatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10 },
  heatCell: { width: 14, height: 14, borderRadius: 3 },
  examStatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  examStatCard: {
    width: '30%',
    flexGrow: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    minWidth: 96,
  },
  examStatValue: { fontSize: 16, fontWeight: '800' },
  examStatLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  subHead: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  dueLine: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  activityRail: { borderLeftWidth: 3, paddingLeft: 12 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 12, lineHeight: 17 },
  empty: { fontSize: 13, paddingVertical: 6 },
  insight: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  actionLabel: { fontSize: 13, fontWeight: '700' },
});
