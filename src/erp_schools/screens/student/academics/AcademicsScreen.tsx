/**
 * Subject Overview — web studentClassesOverview / AllClassesView parity.
 * Replaces the old Academics marks-tabs screen.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  ProgressBar,
  DonutChart,
  BarChart,
  Badge,
  ScreenLoader,
  MiniSparkline,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentSubjectsData } from '../../../hooks/useStudentSubjectsData';
import { pickString } from '../../../utils/apiHelpers';
import { formatDateLabel } from '../../../utils/studentDashboardMeta';

function fmtPct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '0%';
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(digits)}%`;
}

export default function AcademicsScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const data = useStudentSubjectsData();
  const [search, setSearch] = useState('');

  const refetchRef = useRef(data.refetch);
  refetchRef.current = data.refetch;
  const bootstrappedRef = useRef(data.status === 'ready' || data.status === 'error');
  if (data.status === 'ready' || data.status === 'error') bootstrappedRef.current = true;

  const onRefresh = useCallback(() => {
    void refetchRef.current();
  }, []);

  const onBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('StudentTabs', { screen: 'StudentHome' });
  }, [navigation]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.classRows;
    return data.classRows.filter(
      (r) =>
        r.classroomName.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.teacher.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q) ||
        r.sectionName.toLowerCase().includes(q),
    );
  }, [data.classRows, search]);

  const att = data.attendanceMetrics;
  const bands = data.performanceBands;
  const bestLabel = bands.best
    ? `${Math.round(bands.best.percentage)}% (${bands.best.classroomName || bands.best.subject})`
    : undefined;

  const subjectBars = data.classRows.map((r) => ({
    label: (r.classroomName || r.subject).slice(0, 10),
    value: Math.round(r.percentage ?? 0),
  }));

  const attWarn = data.overall.avgAtt < 75;

  if (!bootstrappedRef.current && (data.status === 'idle' || data.status === 'loading')) {
    return (
      <TeacherScreen contentStyle={styles.content}>
        <ScreenLoader message="Loading subjects…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Subject Overview"
          showBack
          onBack={onBack}
        />
      }
      contentStyle={styles.content}
      refreshing={data.status === 'loading'}
      onRefresh={onRefresh}
    >
      <Text style={[styles.yearHint, { color: theme.colors.textSecondary }]}>
        {data.overall.yearLabel
          ? `Overall academic class summary · ${data.overall.yearLabel}`
          : 'Overall academic class summary and enrolled subject analytics'}
      </Text>

      {/* Overall class banner */}
      <SurfaceCard style={[styles.banner, { backgroundColor: theme.colors.tintTeal }]}>
        <Text style={[styles.bannerTitle, { color: theme.colors.textPrimary }]}>
          {data.overall.classLabel || 'My Class'}
        </Text>
        <View style={styles.bannerStats}>
          <Text style={[styles.bannerStat, { color: theme.colors.textSecondary }]}>
            Enrolled{' '}
            <Text style={{ fontWeight: '800', color: theme.colors.textPrimary }}>
              {data.overall.enrolled}
            </Text>
          </Text>
          <Text style={[styles.bannerStat, { color: theme.colors.textSecondary }]}>
            Attendance{' '}
            <Text style={{ fontWeight: '800', color: theme.colors.textPrimary }}>
              {fmtPct(data.overall.avgAtt)}
            </Text>
          </Text>
          <Text style={[styles.bannerStat, { color: theme.colors.textSecondary }]}>
            Avg score{' '}
            <Text style={{ fontWeight: '800', color: theme.colors.textPrimary }}>
              {fmtPct(data.overall.avgScore)}
            </Text>
          </Text>
        </View>
      </SurfaceCard>

      {/* 6 KPIs */}
      <View style={styles.kpiGrid}>
        {[
          {
            key: 'enrolled',
            value: String(data.overall.enrolled),
            label: 'Enrolled Subjects',
            sub: 'Active',
            tint: theme.colors.tintBlue,
            fg: theme.colors.info,
          },
          {
            key: 'att',
            value: fmtPct(data.overall.avgAtt),
            label: 'Average Attendance',
            sub: attWarn ? 'Below 75%' : 'Since school year start',
            tint: attWarn ? '#FEE2E2' : theme.colors.tintGreen,
            fg: attWarn ? theme.colors.danger : theme.colors.success,
          },
          {
            key: 'score',
            value: fmtPct(data.overall.avgScore),
            label: 'Average Score',
            sub: 'All Subjects',
            tint: theme.colors.tintTeal,
            fg: theme.colors.primary,
          },
          {
            key: 'attended',
            value: `${data.examStats.completed} / ${data.examStats.total}`,
            label: 'Exams Attended',
            sub: 'This term',
            tint: theme.colors.tintBlue,
            fg: theme.colors.info,
          },
          {
            key: 'missed',
            value: String(data.examStats.missed),
            label: 'Exams Missed',
            sub: data.examStats.missed === 0 ? 'None' : 'This term',
            tint: theme.colors.tintOrange,
            fg: theme.colors.warning,
          },
          {
            key: 'certs',
            value: String(data.overall.certificates),
            label: 'Certificates',
            sub: 'Earned (80%+)',
            tint: theme.colors.tintPurple,
            fg: '#7E22CE',
          },
        ].map((k) => (
          <View key={k.key} style={[styles.kpiCard, { backgroundColor: k.tint }]}>
            <Text style={[styles.kpiValue, { color: k.fg }]} numberOfLines={1} adjustsFontSizeToFit>
              {k.value}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textPrimary }]}>{k.label}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>{k.sub}</Text>
          </View>
        ))}
      </View>

      {/* Subject list + search */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Individual Subject Performance" icon="book-outline" />
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search subject or teacher"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          />
        </View>
        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            No subject enrollments yet.
          </Text>
        ) : (
          filtered.map((row) => (
            <TouchableOpacity
              key={row.key}
              style={[styles.subjectRow, { borderBottomColor: theme.colors.border }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('SubjectDetails', { subjectId: row.key })}
            >
              <View style={[styles.subjectAccent, { backgroundColor: row.color }]} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.subjectTop}>
                  <Text
                    style={[styles.subjectName, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {row.classroomName}
                  </Text>
                  <Badge
                    label={row.status}
                    accent={row.status === 'Active' ? 'green' : 'orange'}
                  />
                </View>
                <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {row.teacher}
                  {row.className ? ` · ${row.className}` : ''}
                  {row.sectionName ? ` · ${row.sectionName}` : ''}
                </Text>
                <View style={styles.attRow}>
                  <Text style={[styles.meta, { color: theme.colors.textSecondary, width: 72 }]}>
                    Att {fmtPct(row.attendancePct)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <ProgressBar percent={Math.min(100, row.attendancePct)} height={6} />
                  </View>
                </View>
                <View style={styles.subjectBottom}>
                  <Text style={[styles.scoreText, { color: row.color }]}>
                    {row.percentage != null ? `${Math.round(row.percentage)}%` : 'N/A'} · {row.grade}
                  </Text>
                  <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                    Rank {row.rank}
                  </Text>
                  {row.trend.length >= 2 ? (
                    <MiniSparkline values={row.trend} color={row.color} />
                  ) : null}
                  <Text style={[styles.viewLink, { color: theme.colors.primary }]}>View →</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </SurfaceCard>

      {/* Attendance Distribution */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Attendance Distribution" icon="pie-chart-outline" />
        {att.isFutureYear ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            Academic year has not started yet.
          </Text>
        ) : (
          <View style={styles.attDistRow}>
            <DonutChart
              size={120}
              strokeWidth={14}
              centerValue={fmtPct(att.percentage)}
              centerLabel="Present"
              segments={[
                { value: Math.max(att.present, 0), color: '#16A34A' },
                { value: Math.max(att.absent, 0), color: '#DC2626' },
                { value: Math.max(att.leave, 0), color: '#F97316' },
              ]}
            />
            <View style={styles.legend}>
              {[
                { label: 'Present', value: att.present, color: '#16A34A' },
                { label: 'Absent', value: att.absent, color: '#DC2626' },
                { label: 'Leave', value: att.leave, color: '#F97316' },
                {
                  label: 'Total Days',
                  value: att.calendarTotalDays || att.totalDays,
                  color: '#64748B',
                },
              ].map((row) => (
                <View key={row.label} style={styles.legendRow}>
                  <View style={styles.legendLeft}>
                    <View style={[styles.dot, { backgroundColor: row.color }]} />
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
                      {row.label}
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>
                    {row.value}
                  </Text>
                </View>
              ))}
              <Text style={[styles.meta, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                {att.periodLabel || 'Academic year to date'}
              </Text>
            </View>
          </View>
        )}
      </SurfaceCard>

      {/* Exam Summary */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Exam Summary — This Term" icon="calendar-outline" />
        <View style={styles.examTiles}>
          {[
            { label: 'Total Exams', value: String(data.examStats.total), tint: theme.colors.tintBlue },
            {
              label: 'Attended',
              value: String(data.examStats.completed),
              tint: theme.colors.tintGreen,
            },
            {
              label: 'Missed',
              value: String(data.examStats.missed),
              tint: theme.colors.tintOrange,
            },
            {
              label: 'Upcoming',
              value: String(data.examStats.upcoming),
              tint: theme.colors.tintTeal,
            },
          ].map((t) => (
            <View key={t.label} style={[styles.examTile, { backgroundColor: t.tint }]}>
              <Text style={[styles.kpiValue, { color: theme.colors.textPrimary, fontSize: 20 }]}>
                {t.value}
              </Text>
              <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>{t.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 12 }}>
          <Text style={[styles.meta, { color: theme.colors.textSecondary, marginBottom: 6 }]}>
            Attendance in Exams · {data.examStats.examAttendancePct}%
          </Text>
          <ProgressBar percent={data.examStats.examAttendancePct} height={8} />
        </View>
      </SurfaceCard>

      {/* Strengths & Improvements */}
      <View style={styles.insightRow}>
        <SurfaceCard style={[styles.insightCard, { backgroundColor: theme.colors.tintGreen }]}>
          <Text style={[styles.insightTitle, { color: theme.colors.success }]}>Strengths</Text>
          <Text style={[styles.insightBody, { color: theme.colors.textPrimary }]}>
            {data.strengths}
          </Text>
        </SurfaceCard>
        <SurfaceCard style={[styles.insightCard, { backgroundColor: theme.colors.tintOrange }]}>
          <Text style={[styles.insightTitle, { color: '#C2410C' }]}>Improvements</Text>
          <Text style={[styles.insightBody, { color: theme.colors.textPrimary }]}>
            {data.improvements}
          </Text>
        </SurfaceCard>
      </View>

      {/* Exam Performance donut */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Exam Performance" icon="stats-chart-outline" />
        <View style={styles.attDistRow}>
          <DonutChart
            size={120}
            strokeWidth={14}
            centerValue={fmtPct(bands.avg)}
            centerLabel="Avg Score"
            segments={[
              { value: bands.above90, color: '#16A34A' },
              { value: bands.band7090, color: '#0284C7' },
              { value: bands.band5070, color: '#F97316' },
              { value: bands.below50, color: '#DC2626' },
            ]}
          />
          <View style={styles.legend}>
            {[
              { label: 'Above 90%', value: bands.above90, color: '#16A34A' },
              { label: '70–90%', value: bands.band7090, color: '#0284C7' },
              { label: '50–70%', value: bands.band5070, color: '#F97316' },
              { label: 'Below 50%', value: bands.below50, color: '#DC2626' },
            ].map((row) => (
              <View key={row.label} style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={[styles.dot, { backgroundColor: row.color }]} />
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
                    {row.label}
                  </Text>
                </View>
                <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
        {bestLabel ? (
          <View style={[styles.bestPill, { backgroundColor: theme.colors.tintGreen }]}>
            <Text style={{ color: theme.colors.success, fontWeight: '700', fontSize: 12 }}>
              Best Performance: {bestLabel}
            </Text>
          </View>
        ) : null}
      </SurfaceCard>

      {/* Subject-wise bar chart */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Subject-wise Average Score" icon="bar-chart-outline" />
        {subjectBars.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>No scores yet.</Text>
        ) : (
          <BarChart data={subjectBars} height={150} barColor={theme.colors.primary} />
        )}
      </SurfaceCard>

      {/* Upcoming exams */}
      <SurfaceCard style={styles.section}>
        <SectionHeader
          title="Upcoming Exams"
          icon="calendar-outline"
          actionLabel="Schedule"
          onAction={() => navigation.navigate('ExamSchedule')}
        />
        {data.upcomingExams.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            No upcoming exams scheduled.
          </Text>
        ) : (
          data.upcomingExams.map((e, i) => (
            <View
              key={`${pickString(e.exam_name)}-${pickString(e.exam_date)}-${i}`}
              style={[styles.listRow, { borderBottomColor: theme.colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.subjectName, { color: theme.colors.textPrimary }]}>
                  {pickString(e.subject_name, e.exam_name)}
                </Text>
                <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                  {pickString(e.exam_name)} · {formatDateLabel(pickString(e.exam_date))}
                </Text>
              </View>
            </View>
          ))
        )}
      </SurfaceCard>

      {/* Recent exams */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Recent Exams" icon="document-text-outline" />
        {data.recentExams.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            No recent exam results.
          </Text>
        ) : (
          data.recentExams.map((e) => (
            <View
              key={e.id}
              style={[styles.listRow, { borderBottomColor: theme.colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.subjectName, { color: theme.colors.textPrimary }]}>
                  {e.examName}
                </Text>
                <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                  {e.subject} · {formatDateLabel(e.date)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.scoreText, { color: theme.colors.primary }]}>
                  {e.score != null ? `${e.score}/${e.max}` : '—'}
                </Text>
                <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                  {e.pct != null ? `${Math.round(e.pct)}%` : '—'} · {e.grade}
                </Text>
              </View>
            </View>
          ))
        )}
      </SurfaceCard>

      {/* Overall rank */}
      <SurfaceCard style={[styles.section, { marginBottom: 24 }]}>
        <View style={styles.rankStrip}>
          <Ionicons name="trophy-outline" size={22} color={theme.colors.primary} />
          <Text style={[styles.rankText, { color: theme.colors.textPrimary }]}>
            Overall rank among your subjects:{' '}
            <Text style={{ fontWeight: '800', color: theme.colors.primary }}>
              {data.overallRankLabel}
            </Text>
          </Text>
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
  yearHint: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  banner: { marginBottom: 0 },
  bannerTitle: { fontSize: 18, fontWeight: '800' },
  bannerStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  bannerStat: { fontSize: 12 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 0 },
  kpiCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 88,
  },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  kpiLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  kpiSub: { fontSize: 11, marginTop: 2 },

  section: { marginTop: 0 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 4 },

  subjectRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subjectAccent: { width: 4, borderRadius: 2 },
  subjectTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectName: { fontSize: 14, fontWeight: '700', flex: 1 },
  meta: { fontSize: 12 },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  scoreText: { fontSize: 13, fontWeight: '800' },
  viewLink: { fontSize: 12, fontWeight: '700', marginLeft: 'auto' },

  attDistRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  examTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  examTile: { width: '47%', flexGrow: 1, borderRadius: 12, padding: 12 },

  insightRow: { flexDirection: 'row', gap: 10, marginTop: 0 },
  insightCard: { flex: 1 },
  insightTitle: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  insightBody: { fontSize: 12, lineHeight: 17 },

  bestPill: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  empty: { fontSize: 13, paddingVertical: 8 },

  rankStrip: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankText: { fontSize: 14, flex: 1, lineHeight: 20 },
});
