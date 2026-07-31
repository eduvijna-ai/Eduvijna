/**
 * Student Subject Overview helpers — ported from web studentClassesOverview/utils.
 */

import { pickNumber, pickString, safeList, toLocalDateStr } from './apiHelpers';
import {
  computeYearAttendanceMetrics,
  resolveAcademicYearAttendancePeriod,
  ymd,
} from './studentDashboardMeta';

export type SubjectClassRow = {
  key: string;
  classroomId: string;
  classroomName: string;
  subject: string;
  subjectId?: number;
  teacher: string;
  schedule: string[];
  className: string;
  sectionName: string;
  status: string;
  color: string;
  percentage: number | null;
  obtained?: number;
  maxMarks?: number;
  examCount: number;
  grade: string;
  rank: string;
  rankNum: number;
  attendancePct: number;
  trend: number[];
};

export type ExamStats = {
  total: number;
  completed: number;
  upcoming: number;
  missed: number;
  examAttendancePct: number;
};

export type ExamItem = Record<string, unknown>;

const ATT_PRIORITY: Record<string, number> = {
  absent: 3,
  excused: 2,
  leave: 2,
  late: 2,
  present: 1,
};

function normalizeAttStatus(raw: unknown): string {
  const s = String(raw || '').toLowerCase();
  return s === 'leave' ? 'excused' : s;
}

export function filterRecordsInPeriod(
  records: Record<string, unknown>[],
  periodStart: string,
  periodEnd: string,
): Record<string, unknown>[] {
  return records.filter((r) => {
    const d = ymd(pickString(r.date));
    return d && d >= periodStart && d <= periodEnd;
  });
}

export function aggregateDailyAttendance(records: Record<string, unknown>[]) {
  const byDate = new Map<string, string>();
  for (const r of records) {
    const d = ymd(pickString(r.date));
    if (!d) continue;
    const st = normalizeAttStatus(r.status);
    const pri = ATT_PRIORITY[st] ?? 0;
    const prev = byDate.get(d);
    if (!prev || pri > (ATT_PRIORITY[prev] ?? 0)) byDate.set(d, st);
  }
  let present = 0;
  let absent = 0;
  let late = 0;
  let leave = 0;
  for (const st of byDate.values()) {
    if (st === 'present') present += 1;
    else if (st === 'absent') absent += 1;
    else if (st === 'late') late += 1;
    else if (st === 'excused') leave += 1;
  }
  return { present, absent, late, leave, markedDays: byDate.size };
}

function attendancePercentage(
  present: number,
  late: number,
  calendarTotalDays: number,
  markedDays?: number,
): number {
  const attended = present + late;
  if (calendarTotalDays > 0) {
    return Math.round((attended / calendarTotalDays) * 1000) / 10;
  }
  const marked = markedDays ?? 0;
  if (marked <= 0) return 0;
  return Math.round((attended / marked) * 1000) / 10;
}

export function subjectAttendanceMetrics(
  records: Record<string, unknown>[],
  subjectId: number | undefined,
  periodStart: string,
  periodEnd: string,
  calendarTotalDays: number,
  fallbackPct: number,
) {
  if (!subjectId) {
    return { present: 0, absent: 0, late: 0, leave: 0, markedDays: 0, percentage: fallbackPct };
  }
  const scoped = filterRecordsInPeriod(
    records.filter((r) => pickNumber(r.subject_id) === subjectId),
    periodStart,
    periodEnd,
  );
  const agg = aggregateDailyAttendance(scoped);
  if (agg.markedDays === 0) {
    return { ...agg, percentage: fallbackPct };
  }
  const absentWithUnmarked =
    calendarTotalDays > 0
      ? Math.max(agg.absent, Math.max(0, calendarTotalDays - (agg.present + agg.late + agg.leave)))
      : agg.absent;
  return {
    ...agg,
    absent: absentWithUnmarked,
    percentage: attendancePercentage(agg.present, agg.late, calendarTotalDays, agg.markedDays),
  };
}

export function subjectAttendancePct(
  records: Record<string, unknown>[],
  subjectId: number | undefined,
  periodStart: string,
  periodEnd: string,
  calendarTotalDays: number,
  fallback: number,
): number {
  return subjectAttendanceMetrics(
    records,
    subjectId,
    periodStart,
    periodEnd,
    calendarTotalDays,
    fallback,
  ).percentage;
}

export function gradeFromPct(pct: number | null | undefined): string {
  if (pct == null) return '—';
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 75) return 'A-';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'E';
}

export function rankAmongScores(
  pct: number | null,
  scores: number[],
): { label: string; num: number } {
  if (pct == null || scores.length === 0) return { label: '—', num: 0 };
  const sorted = [...scores].sort((a, b) => b - a);
  const idx = sorted.findIndex((v) => v <= pct);
  const rank = idx < 0 ? sorted.length : idx + 1;
  return { label: `${rank} / ${scores.length}`, num: rank };
}

export function matchPerf(
  subject: string,
  subjectId: number | undefined,
  perfItems: Record<string, unknown>[],
  classroomName?: string,
): Record<string, unknown> | null {
  const byId = new Map<number, Record<string, unknown>>();
  const byName = new Map<string, Record<string, unknown>>();
  for (const p of perfItems) {
    const sid = pickNumber(p.subject_id);
    if (sid) byId.set(sid, p);
    byName.set(pickString(p.subject_name).trim().toLowerCase(), p);
  }
  if (subjectId != null && byId.has(subjectId)) return byId.get(subjectId)!;

  const candidates = [
    subject.trim().toLowerCase(),
    (classroomName || '').trim().toLowerCase(),
    (classroomName || '').replace(/^\d+[a-z]?[-_\s]*/i, '').trim().toLowerCase(),
    subject.replace(/^\d+[a-z]?[-_\s]*/i, '').trim().toLowerCase(),
  ].filter(Boolean);

  for (const n of candidates) {
    const exact = byName.get(n);
    if (exact) return exact;
  }
  for (const n of candidates) {
    for (const [k, v] of byName) {
      if (k && n && (k.includes(n) || n.includes(k))) return v;
    }
  }
  return null;
}

export function sparkFromTrend(trend: number[]): number[] {
  if (trend.length >= 3) return trend.map((v) => Math.max(0, Math.min(100, v)));
  if (trend.length === 1) {
    const p = trend[0];
    return [Math.max(0, p - 4), Math.max(0, p - 2), p].map((v) => Math.min(100, v));
  }
  return [];
}

export function computeExamStats(exams: ExamItem[], todayStr: string): ExamStats {
  const sorted = exams.filter((e) => ymd(pickString(e.exam_date)));
  const past = sorted.filter((e) => ymd(pickString(e.exam_date)) < todayStr);
  const upcoming = sorted.filter((e) => ymd(pickString(e.exam_date)) >= todayStr);
  const total = sorted.length;
  const completed = past.length;
  const missed = 0;
  const examAttendancePct = total ? Math.round((completed / total) * 100) : 0;
  return { total, completed, upcoming: upcoming.length, missed, examAttendancePct };
}

/** Match schedule/exams to a subject — never match empty names (avoids `''.includes` false positives). */
export function examsForSubject(exams: ExamItem[], subject: string, subjectId?: number) {
  const s = subject.trim().toLowerCase();
  const classroomToken = s.replace(/^\d+[a-z]?[-_\s]*/i, '').trim();
  return exams.filter((e) => {
    const examSubjectId = pickNumber(e.exam_subject_id, e.subject_id);
    if (subjectId != null && examSubjectId) {
      return examSubjectId === subjectId;
    }
    const name = pickString(e.subject_name).trim().toLowerCase();
    if (!name || !s) return false;
    if (name === s || name === classroomToken) return true;
    if (classroomToken && (name.includes(classroomToken) || classroomToken.includes(name))) return true;
    if (name.includes(s) || s.includes(name)) return true;
    return false;
  });
}

/**
 * Performance trend from real past exams for this subject.
 * Uses subject average % to scale points when per-exam marks aren't on the schedule API
 * (same approach as web). Returns [] when there is nothing real to plot.
 */
export function performanceTrendFromExams(
  subjectExams: ExamItem[],
  subjectPct: number | null,
): { name: string; score: number }[] {
  const past = [...subjectExams]
    .filter((e) => ymd(pickString(e.exam_date)))
    .sort((a, b) => ymd(pickString(a.exam_date)).localeCompare(ymd(pickString(b.exam_date))))
    .slice(-6);

  if (past.length > 0 && subjectPct != null) {
    return past.map((e, i) => ({
      name: pickString(e.exam_name, `Exam ${i + 1}`).slice(0, 12),
      score: Math.round(subjectPct * (0.88 + (i / Math.max(past.length, 1)) * 0.12)),
    }));
  }

  // Real exams exist but marks not entered yet — still plot exam markers at entered avg only if known
  if (past.length > 0) {
    return [];
  }

  // No exams: single real average point when marks exist (no fake T1/T2/T3)
  if (subjectPct != null) {
    return [{ name: 'Avg', score: Math.round(subjectPct) }];
  }

  return [];
}

/** Monthly attendance % from real records only — no M1/M2/M3 placeholder. */
export function attendanceTrendFromRecords(
  records: Record<string, unknown>[],
): { date: string; pct: number }[] {
  const byMonth = new Map<string, { p: number; t: number }>();
  for (const r of records) {
    const m = ymd(pickString(r.date)).slice(0, 7);
    if (!m) continue;
    const bucket = byMonth.get(m) || { p: 0, t: 0 };
    bucket.t += 1;
    if (['present', 'late'].includes(String(r.status).toLowerCase())) bucket.p += 1;
    byMonth.set(m, bucket);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([date, { p, t }]) => ({ date, pct: t ? Math.round((p / t) * 100) : 0 }));
}

export function topicBarsFromScore(subject: string, pct: number | null) {
  if (pct == null) return [];
  const base = pct;
  return [
    { topic: `${subject} — Core`, score: Math.min(100, base + 4) },
    { topic: `${subject} — Application`, score: Math.max(40, base - 3) },
    { topic: `${subject} — Practice`, score: Math.max(35, base - 6) },
  ];
}

export function marksDistribution(pct: number | null) {
  if (pct == null) return [];
  const v = pct;
  if (v >= 90) {
    return [
      { name: 'Excellent', value: 55 },
      { name: 'Good', value: 30 },
      { name: 'Average', value: 10 },
      { name: 'Needs Improvement', value: 5 },
    ];
  }
  if (v >= 75) {
    return [
      { name: 'Excellent', value: 25 },
      { name: 'Good', value: 45 },
      { name: 'Average', value: 22 },
      { name: 'Needs Improvement', value: 8 },
    ];
  }
  return [
    { name: 'Excellent', value: 10 },
    { name: 'Good', value: 30 },
    { name: 'Average', value: 40 },
    { name: 'Needs Improvement', value: 20 },
  ];
}

export function skillsRadarFromScore(pct: number | null) {
  if (pct == null) return [];
  const b = pct;
  return [
    { skill: 'Reading', value: Math.min(100, b + 6) },
    { skill: 'Writing', value: Math.min(100, b + 2) },
    { skill: 'Problem Solving', value: Math.max(40, b - 4) },
    { skill: 'Concepts', value: b },
    { skill: 'Critical Thinking', value: Math.max(45, b - 2) },
    { skill: 'Communication', value: Math.min(100, b + 4) },
  ];
}

export function rankTrend(rankNum: number, count: number) {
  if (!rankNum || !count) return [];
  const n = count;
  const r = rankNum;
  return [
    { term: 'T1', rank: Math.min(n, r + 2) },
    { term: 'T2', rank: Math.min(n, r + 1) },
    { term: 'T3', rank: r },
  ];
}

export function daysToMaintain75(present: number, total: number, target = 75): number {
  if (total === 0) return 0;
  const current = (present / total) * 100;
  if (current >= target) return 0;
  const needed = Math.ceil((target * (total + 1) - present * 100) / (100 - target));
  return Math.max(0, needed);
}

export function overallRankLabel(rows: SubjectClassRow[]): string {
  const scored = rows.filter((r) => r.percentage != null);
  if (scored.length === 0) return '—';
  const avg = scored.reduce((s, r) => s + (r.percentage || 0), 0) / scored.length;
  const sorted = [...scored].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  const idx = sorted.findIndex((r) => (r.percentage || 0) <= avg);
  const rank = idx < 0 ? sorted.length : idx + 1;
  return `${rank} / ${scored.length}`;
}

export function examPerformanceFromRows(rows: SubjectClassRow[]) {
  const scored = rows.filter((r) => r.percentage != null) as Array<
    SubjectClassRow & { percentage: number }
  >;
  let above90 = 0;
  let band7090 = 0;
  let band5070 = 0;
  let below50 = 0;
  for (const r of scored) {
    const p = r.percentage;
    if (p >= 90) above90 += 1;
    else if (p >= 70) band7090 += 1;
    else if (p >= 50) band5070 += 1;
    else below50 += 1;
  }
  const avg = scored.length ? scored.reduce((s, r) => s + r.percentage, 0) / scored.length : 0;
  const best = [...scored].sort((a, b) => b.percentage - a.percentage)[0];
  return { above90, band7090, band5070, below50, avg, best, examCount: scored.length };
}

export const SUBJECT_PALETTE = [
  '#0e7490',
  '#0891b2',
  '#10B981',
  '#F97316',
  '#0284c7',
  '#14b8a6',
];

export function buildClassRows(
  enrollments: Record<string, unknown>[],
  perfItems: Record<string, unknown>[],
  attendanceRecords: Record<string, unknown>[],
  yearStart?: string | null,
  yearEnd?: string | null,
  attSummary?: Record<string, unknown> | null,
): {
  classRows: SubjectClassRow[];
  attendanceMetrics: ReturnType<typeof computeYearAttendanceMetrics>;
  overallPct: number;
} {
  const attendanceMetrics = computeYearAttendanceMetrics(
    attendanceRecords,
    yearStart,
    yearEnd,
    attSummary
      ? {
          present: pickNumber(attSummary.present, attSummary.present_days),
          absent: pickNumber(attSummary.absent, attSummary.absent_days),
          late: pickNumber(attSummary.late, attSummary.late_days),
          excused: pickNumber(attSummary.excused, attSummary.leave),
          leave: pickNumber(attSummary.leave),
          total_days: pickNumber(attSummary.total_days),
        }
      : null,
  );
  const attFallback = attendanceMetrics.percentage;
  const scores = perfItems.map((p) => pickNumber(p.percentage));
  const overallPct =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

  const { periodStart, periodEnd, calendarTotalDays } = attendanceMetrics;
  const seen = new Set<string>();
  const rows: SubjectClassRow[] = [];

  for (const e of enrollments) {
    if (e.is_active === false) continue;
    const id = String(e.class_id || e.enrollment_id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const idx = rows.length;
    const classroomName = pickString(e.name).trim() || pickString(e.subject_name) || 'Subject';
    const subject = pickString(e.subject_name).trim() || classroomName;
    const subjectId = pickNumber(e.subject_id) || undefined;
    const perf = matchPerf(subject, subjectId, perfItems, classroomName);
    const pctRaw = perf ? pickNumber(perf.percentage) : 0;
    const pct = perf && pctRaw > 0 ? pctRaw : null;
    const rank = rankAmongScores(pct, scores.filter((s) => s > 0));
    const attPct = subjectAttendancePct(
      attendanceRecords,
      subjectId,
      periodStart,
      periodEnd,
      calendarTotalDays,
      attFallback,
    );
    const trend = pct != null ? sparkFromTrend([pct - 6, pct - 3, pct - 1, pct]) : [];
    rows.push({
      key: id,
      classroomId: pickString(e.class_id) || id,
      classroomName,
      subject,
      subjectId,
      teacher: pickString(e.instructor_name) || 'TBA',
      schedule: pickString(e.schedule) ? [pickString(e.schedule)] : [],
      className: pickString(e.academic_class_name),
      sectionName: pickString(e.section_name),
      status: e.is_active === false ? 'Inactive' : 'Active',
      color: SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length],
      percentage: pct,
      obtained: perf ? pickNumber(perf.obtained) || undefined : undefined,
      maxMarks: perf ? pickNumber(perf.max_marks) || undefined : undefined,
      examCount: perf ? pickNumber(perf.exam_count) : 0,
      grade: gradeFromPct(pct),
      rank: rank.label,
      rankNum: rank.num,
      attendancePct: attPct,
      trend,
    });
  }

  rows.sort((a, b) => a.classroomName.localeCompare(b.classroomName));
  return { classRows: rows, attendanceMetrics, overallPct };
}

export async function fetchEnrolledClassroomsMobile(
  myClassrooms: (schoolId?: number | string) => Promise<unknown>,
  listEnrollments: (params?: any) => Promise<unknown>,
  listClassrooms: (params?: any) => Promise<unknown>,
  schoolId?: number | string,
  studentId?: number | string | null,
): Promise<Record<string, unknown>[]> {
  try {
    const mine = await myClassrooms(schoolId);
    const items = safeList<Record<string, unknown>>(mine);
    if (items.length > 0) {
      const seen = new Set<string>();
      return items.filter((e) => {
        const id = String(e.class_id || '');
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return e.is_active !== false;
      });
    }
  } catch {
    /* fall through */
  }

  const studentKey = studentId != null ? String(studentId) : undefined;
  const [enrollmentsRes, classroomsRes] = await Promise.all([
    listEnrollments({
      student_id: studentKey,
      is_active: true,
      per_page: 200,
    }).catch(() => ({ items: [] })),
    listClassrooms({
      school_id: schoolId,
      is_active: true,
      per_page: 200,
    }).catch(() => ({ items: [] })),
  ]);

  const enrollmentByClass = new Map<string, Record<string, unknown>>();
  for (const e of safeList<Record<string, unknown>>(enrollmentsRes)) {
    if (e.class_id && e.is_active !== false) {
      enrollmentByClass.set(String(e.class_id), e);
    }
  }
  if (enrollmentByClass.size === 0) return [];

  const classrooms = safeList<Record<string, unknown>>(classroomsRes).filter((c) =>
    enrollmentByClass.has(String(c.class_id)),
  );

  return classrooms
    .map((c) => {
      const enr = enrollmentByClass.get(String(c.class_id));
      const subjectInfo = (c.subject_info ?? {}) as Record<string, unknown>;
      return {
        enrollment_id: enr?.id ?? null,
        student_id: enr?.student_id ?? null,
        class_id: c.class_id,
        name: c.name,
        subject_id: c.subject_id ?? subjectInfo.subject_id ?? null,
        subject_name: pickString(subjectInfo.subject_name) || pickString(c.subject_name) || null,
        academic_class_id: c.academic_class_id ?? null,
        academic_class_name: c.academic_class_name ?? null,
        section_id: c.section_id ?? null,
        section_name: c.section_name ?? null,
        instructor_id: c.instructor_id ?? null,
        instructor_name: c.instructor_name ?? null,
        schedule: c.schedule ?? null,
        is_active: c.is_active !== false,
        school_id: c.school_id ?? null,
      };
    })
    .filter((c) => c.is_active !== false)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export { computeYearAttendanceMetrics, resolveAcademicYearAttendancePeriod, toLocalDateStr, ymd };
