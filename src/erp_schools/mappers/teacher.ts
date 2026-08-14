/**
 * Teacher mappers — API DTOs → erp_schools teacher UI types.
 * Class Overview math mirrors web ClassOverviewTab (source of truth).
 */

import type {
  Announcement,
  ClassInfo,
  ClassOverviewKpis,
  SchedulePeriod,
  StudentInfo,
} from '../types/domain';
import { formatDisplayDate, formatDisplayTime, pickNumber, pickString, safeList, toLocalDateStr } from '../utils/apiHelpers';
import { coerceMon0DayOfWeek } from '../utils/timetableMeta';

const ACCENTS = ['teal', 'blue', 'green', 'orange', 'purple', 'pink'] as const;

/** Web day_of_week: Mon=0 … Sun=6 */
export function webApiDayOfWeek(d = new Date()): number {
  const jsDow = d.getDay(); // Sun=0
  return jsDow === 0 ? 6 : jsDow - 1;
}

function scopeOverviewRows(
  overview: unknown,
  teacherUserId?: number | null,
): Record<string, unknown>[] {
  let rows = safeList<Record<string, unknown>>(overview);
  if (teacherUserId != null) {
    const hasTeacherIds = rows.some((r) => r.teacher_id != null);
    if (hasTeacherIds) {
      rows = rows.filter((r) => Number(r.teacher_id) === teacherUserId);
    }
  }
  return rows;
}

/** Count roster students for a class (+ optional section), distinct by profile/user. */
export function countStudentsForClass(
  students: StudentInfo[],
  className: string,
  sectionName?: string,
): number {
  const seen = new Set<string>();
  students.forEach((s) => {
    if (className && s.className && s.className !== className) return;
    if (sectionName && s.sectionName && s.sectionName !== sectionName) return;
    // Also match classCode patterns like "10-A" / "Class 10 A"
    if (
      className &&
      !s.className &&
      s.classCode &&
      !s.classCode.toLowerCase().includes(className.toLowerCase().replace(/^class\s*/i, ''))
    ) {
      return;
    }
    const key =
      s.profileId != null && s.profileId > 0
        ? `p:${s.profileId}`
        : s.userId != null
          ? `u:${s.userId}`
          : `id:${s.id}`;
    seen.add(key);
  });
  return seen.size;
}

/** Periods/week for a class from teacher timetable slots. */
export function countPeriodsForClass(
  slots: unknown,
  classId?: number | null,
  className?: string,
): number {
  const rows = safeList<Record<string, unknown>>(slots);
  return rows.filter((s) => {
    if (classId != null && pickNumber(s.class_id) === classId) return true;
    if (className && pickString(s.class_name) === className) return true;
    return false;
  }).length;
}

/**
 * Map class-overview assignment rows → ClassInfo cards.
 * Enriches studentCount from roster and periodsPerWeek from timetable.
 */
export function mapTeacherClasses(
  overview: unknown,
  opts?: {
    teacherUserId?: number | null;
    students?: StudentInfo[];
    timetableSlots?: unknown;
  },
): {
  classes: ClassInfo[];
  summary: {
    classesAssigned: number;
    totalStudents: number;
    subjectsTeaching: number;
    weeklyPeriods: number;
  };
} {
  const rows = scopeOverviewRows(overview, opts?.teacherUserId);
  const students = opts?.students ?? [];
  const slots = opts?.timetableSlots;

  const seen = new Set<string>();
  const classes: ClassInfo[] = [];
  rows.forEach((r, i) => {
    const classId = pickNumber(r.class_id);
    const sectionId = r.section_id != null ? pickNumber(r.section_id) : null;
    const subjectId = r.subject_id != null ? pickNumber(r.subject_id) : null;
    const className = pickString(r.class_name, r.name);
    const sectionName = pickString(r.section_name);
    const subjectName = pickString(r.subject_name, r.subject, 'Subject');
    const key = `${classId}:${sectionId ?? ''}:${subjectId ?? subjectName}`;
    if (seen.has(key)) return;
    seen.add(key);

    const code = pickString(
      r.class_code,
      r.code,
      [className, sectionName].filter(Boolean).join('-'),
      `C${i + 1}`,
    );
    const displayName = [className, sectionName].filter(Boolean).join(' ') || code;

    const fromApi = pickNumber(r.student_count, r.students_count, r.total_students);
    const fromRoster = countStudentsForClass(students, className, sectionName || undefined);
    const periodsFromApi = pickNumber(r.periods_per_week, r.weekly_periods);
    const periodsFromSlots = countPeriodsForClass(slots, classId || null, className);

    classes.push({
      id: pickString(r.class_id, r.id, `class-${i}`),
      code,
      name: displayName,
      subject: subjectName,
      room: pickString(r.room_name, r.room, r.classroom),
      studentCount: fromRoster || fromApi,
      periodsPerWeek: periodsFromSlots || periodsFromApi,
      accent: ACCENTS[classes.length % ACCENTS.length],
      className: className || undefined,
      sectionName: sectionName || undefined,
      teacherName: pickString(r.teacher_name) || undefined,
      classTeacherName: pickString(r.class_teacher_name) || undefined,
      teacherId: r.teacher_id != null ? pickNumber(r.teacher_id) : null,
      isClassTeacher: r.is_class_teacher === true || r.is_class_teacher === 1,
      classId: classId || undefined,
      sectionId,
      subjectId,
    });
  });

  const subjects = new Set(classes.map((c) => c.subject).filter(Boolean));
  const classSectionPairs = new Set(
    classes
      .filter((c) => c.classId != null)
      .map((c) => `${c.classId}|${c.sectionId ?? ''}`),
  );
  const uniqueStudents = distinctStudentCount(students);

  return {
    classes,
    summary: {
      classesAssigned: classSectionPairs.size || classes.length,
      totalStudents: uniqueStudents || classes.reduce((n, c) => n + c.studentCount, 0),
      subjectsTeaching: subjects.size,
      weeklyPeriods: classes.reduce((n, c) => n + c.periodsPerWeek, 0),
    },
  };
}

export function distinctStudentCount(students: StudentInfo[]): number {
  const ids = new Set<string>();
  students.forEach((s) => {
    if (s.profileId != null && s.profileId > 0) ids.add(`p:${s.profileId}`);
    else if (s.userId != null) ids.add(`u:${s.userId}`);
    else ids.add(`id:${s.id}`);
  });
  return ids.size;
}

/** Web ClassOverviewTab KPITiles computation. */
export function computeClassOverviewKpis(
  classRows: ClassInfo[],
  students: StudentInfo[],
  filters: { className?: string; sectionName?: string; subjectName?: string },
  isInstructor = true,
): ClassOverviewKpis {
  let filteredRows = classRows;
  if (filters.className) {
    filteredRows = filteredRows.filter((r) => r.className === filters.className);
  }
  if (filters.sectionName) {
    filteredRows = filteredRows.filter((r) => r.sectionName === filters.sectionName);
  }
  if (filters.subjectName) {
    filteredRows = filteredRows.filter((r) => r.subject === filters.subjectName);
  }

  const classSectionPairs = new Set(
    filteredRows
      .filter((r) => r.classId != null)
      .map((r) => `${r.classId}|${r.sectionId ?? ''}`),
  );

  let filteredStudents = students;
  if (filters.className) {
    filteredStudents = filteredStudents.filter((s) => s.className === filters.className);
  }
  if (filters.sectionName) {
    filteredStudents = filteredStudents.filter((s) => s.sectionName === filters.sectionName);
  }
  if (filters.subjectName) {
    filteredStudents = filteredStudents.filter((s) => s.subjectName === filters.subjectName);
  }

  // Admin: distinct teacher_id (fallback teacher name); instructor: self = 1/0
  const teacherKeys = new Set(
    filteredRows
      .map((r) => {
        if (r.teacherId != null && r.teacherId > 0) return `id:${r.teacherId}`;
        if (r.teacherName) return `n:${r.teacherName}`;
        return '';
      })
      .filter(Boolean),
  );

  return {
    classes: classSectionPairs.size || filteredRows.length,
    students: distinctStudentCount(filteredStudents),
    teachers: isInstructor ? (filteredRows.length > 0 ? 1 : 0) : teacherKeys.size,
    subjects: new Set(filteredRows.map((r) => r.subject).filter(Boolean)).size,
    weeklyPeriods: filteredRows.reduce((n, c) => n + c.periodsPerWeek, 0),
  };
}

/** Unique class_ids for a teacher from class-overview rows (web instructor path). */
export function collectTeacherClassIds(
  overview: unknown,
  teacherUserId?: number | null,
): number[] {
  const rows = scopeOverviewRows(overview, teacherUserId);
  const ids = new Set<number>();
  rows.forEach((r) => {
    const cid = pickNumber(r.class_id);
    if (cid) ids.add(cid);
  });
  return [...ids];
}

export function mapTeacherStudents(roster: unknown): StudentInfo[] {
  const raw = safeList<Record<string, unknown>>(roster);
  // Deduplicate by profile|class|section like web StudentsTab
  const seen = new Set<string>();
  const out: StudentInfo[] = [];
  raw.forEach((s, i) => {
    const profileId = s.profile_id != null ? pickNumber(s.profile_id) : null;
    const userId = s.user_id != null ? pickNumber(s.user_id) : null;
    const classId = s.class_id != null ? pickNumber(s.class_id) : null;
    const sectionId = s.section_id != null ? pickNumber(s.section_id) : null;
    if (profileId != null && profileId > 0) {
      const key = `${profileId}|${classId ?? ''}|${sectionId ?? ''}`;
      if (seen.has(key)) return;
      seen.add(key);
    }
    const className = pickString(s.class_name);
    const sectionName = pickString(s.section_name);
    const classCode = pickString(
      s.class_code,
      [className, sectionName].filter(Boolean).join('-'),
      className,
    );
    out.push({
      id: pickString(
        profileId && profileId > 0 ? profileId : undefined,
        userId,
        s.student_id,
        s.id,
        `stu-${i}`,
      ),
      rollNo: pickString(s.roll_no, s.roll_number, s.admission_number, String(i + 1)),
      name: pickString(s.student_name, s.full_name, s.name, 'Student'),
      classCode,
      attendanceStatus: (pickString(s.attendance_status, s.status).toLowerCase() ||
        'present') as StudentInfo['attendanceStatus'],
      attendancePercent: pickNumber(s.attendance_percent, s.attendance_percentage),
      averageScore: pickNumber(s.average_score, s.avg_score, s.percentage),
      guardianName: pickString(s.guardian_name, s.primary_guardian_name) || undefined,
      guardianRelation: pickString(s.guardian_relation, s.relation) || undefined,
      profileId: profileId && profileId > 0 ? profileId : null,
      userId: userId || null,
      className: className || undefined,
      sectionName: sectionName || undefined,
      subjectName: pickString(s.subject_name) || undefined,
      classId,
      sectionId,
      gender: pickString(s.gender) || undefined,
      admissionNumber: pickString(s.admission_number) || undefined,
      dateOfBirth: pickString(s.date_of_birth) || undefined,
      bloodGroup: pickString(s.blood_group) || undefined,
      city: pickString(s.city) || undefined,
      apaarId: pickString(s.apaar_id) || undefined,
    });
  });
  return out;
}

function rawSlotDayOfWeek(raw: Record<string, unknown>): number {
  return pickNumber(raw.day_of_week, raw.dayOfWeek, raw.weekday, raw.dow);
}

/**
 * Map timetable slots for "today" using web Mon=0…Sun=6 day_of_week.
 *
 * `assumeToday`: payload is already filtered to today (slots list with day_of_week).
 * `strictToday`: never treat other weekdays as today. Full-week teacher-timetable
 * must use this — otherwise a Monday class is shown on the home "Today" card.
 */
export function mapTeacherSchedule(
  slots: unknown,
  opts?: { apiDow?: number; assumeToday?: boolean; strictToday?: boolean },
): SchedulePeriod[] {
  const apiDow = opts?.apiDow ?? webApiDayOfWeek();
  let rows = safeList<Record<string, unknown>>(slots);
  const toMon0 = coerceMon0DayOfWeek(rows.map(rawSlotDayOfWeek));
  if (!opts?.assumeToday) {
    const todays = rows.filter((s) => toMon0(rawSlotDayOfWeek(s)) === apiDow);
    if (todays.length > 0) {
      rows = todays;
    } else if (opts?.strictToday) {
      rows = [];
    }
  }

  return rows
    .slice()
    .sort(
      (a, b) =>
        pickNumber(a.period_number, a.periodNumber, a.period_no, a.period) -
        pickNumber(b.period_number, b.periodNumber, b.period_no, b.period),
    )
    .slice(0, 12)
    .map((s, i) => ({
      id: pickString(s.id, `sch-${i}`),
      startTime: formatDisplayTime(pickString(s.start_time, s.startTime, s.from_time)),
      endTime: formatDisplayTime(pickString(s.end_time, s.endTime, s.to_time)),
      classCode: pickString(s.class_code, s.class_name, s.className, s.section_name),
      subject: pickString(s.subject_name, s.subjectName, s.subject, 'Period'),
      room: pickString(s.room_name, s.roomName, s.room),
    }));
}

export function mapTeacherAnnouncements(notices: unknown): Announcement[] {
  return safeList<Record<string, unknown>>(notices)
    .slice()
    .sort(
      (a, b) => Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned)),
    )
    .slice(0, 10)
    .map((n, i) => {
      const scopeRaw = pickString(n.target_audience, n.scope).toLowerCase();
      const scope: Announcement['scope'] = scopeRaw.includes('class')
        ? 'class'
        : scopeRaw.includes('group')
          ? 'group'
          : 'school';
      return {
        id: pickString(n.id, `ann-${i}`),
        title: pickString(n.title, n.subject, 'Notice'),
        body: pickString(n.content, n.body, n.description),
        date: formatDisplayDate(pickString(n.publish_date, n.created_at, n.date) || null) ||
          pickString(n.publish_date, n.created_at, n.date).slice(0, 10),
        isNew: Boolean(n.is_pinned || n.is_new),
        scope,
      };
    });
}

type TrendDayNorm = { percentage: number; total: number };

/** Normalize dashboard trend rows (field aliases + recompute % when needed). */
function normalizeAttendanceTrend(dashTrend: unknown): TrendDayNorm[] {
  const raw = safeList<Record<string, unknown>>(
    (dashTrend as { items?: unknown })?.items ?? dashTrend,
  );
  return raw.map((t) => {
    const present = pickNumber(t.present, t.present_count);
    const absent = pickNumber(t.absent, t.absent_count);
    const late = pickNumber(t.late, t.late_count);
    let total = pickNumber(t.total, t.total_count, t.student_count);
    if (total <= 0 && present + absent + late > 0) {
      total = present + absent + late;
    }
    const hasPctField =
      t.percentage != null ||
      t.attendance_percentage != null ||
      t.pct != null ||
      t.avg != null;
    let percentage = pickNumber(
      t.percentage,
      t.attendance_percentage,
      t.pct,
      t.avg,
    );
    if (total > 0 && (!hasPctField || (percentage === 0 && present + late > 0))) {
      percentage = Math.round(((present + late) / total) * 1000) / 10;
    }
    return { percentage, total };
  });
}

function buildAttendanceFallbackFromRecords(
  attRecords: unknown,
  teacherClassIds: number[],
): { todayPct: number | null; trendAvg: number | null } {
  let items = safeList<Record<string, unknown>>(attRecords);
  if (teacherClassIds.length > 0) {
    const idSet = new Set(teacherClassIds);
    const scoped = items.filter((r) => idSet.has(Number(r.class_id)));
    if (scoped.length > 0) items = scoped;
  }
  if (items.length === 0) return { todayPct: null, trendAvg: null };

  const byDate = new Map<
    string,
    { present: number; absent: number; late: number; total: number }
  >();
  items.forEach((r) => {
    const d = pickString(r.date).slice(0, 10);
    if (!d) return;
    const b = byDate.get(d) || { present: 0, absent: 0, late: 0, total: 0 };
    b.total += 1;
    const st = pickString(r.status).toLowerCase();
    if (st === 'present') b.present += 1;
    else if (st === 'absent') b.absent += 1;
    else if (st === 'late') b.late += 1;
    byDate.set(d, b);
  });

  let todayPct: number | null = null;
  const todayBucket = byDate.get(toLocalDateStr());
  if (todayBucket && todayBucket.total > 0) {
    todayPct =
      Math.round(
        ((todayBucket.present + todayBucket.late) / todayBucket.total) * 1000,
      ) / 10;
  }

  const days = [...byDate.values()].filter((b) => b.total > 0);
  let trendAvg: number | null = null;
  if (days.length > 0) {
    trendAvg =
      Math.round(
        (days.reduce((s, b) => s + ((b.present + b.late) / b.total) * 100, 0) /
          days.length) *
          10,
      ) / 10;
  }
  return { todayPct, trendAvg };
}

/**
 * Attendance % for teacher dashboard — mirrors web ERPDashboardTab.
 *
 * Web dashHasAtt = trend.some(total>0) || today_attendance_pct != null
 * If the dashboard has no marked days, web rebuilds % from attendance records.
 * Empty 0%-padded trend must not win over that fallback (that was mobile 0% vs web 75%).
 */
export function computeTeacherAttendanceMetrics(
  dashKpis: Record<string, unknown> | null,
  dashTrend: unknown,
  attRecords: unknown,
  teacherClassIds: number[],
): { overallPct: number | null; avgAttPct: number | null; kpiPct: number | null } {
  let trendItems = normalizeAttendanceTrend(dashTrend);

  const readTodayKpi = (): number | null => {
    if (!dashKpis || !Object.prototype.hasOwnProperty.call(dashKpis, 'today_attendance_pct')) {
      return null;
    }
    const raw = dashKpis.today_attendance_pct;
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
  };

  let todayFromKpis = readTodayKpi();
  let trendDaysWithData = trendItems.filter((t) => t.total > 0);

  // Dashboard often sends today_attendance_pct: 0 when nothing is marked yet.
  // That is not a real 0% day (no totals). Web then rebuilds from records → 75%.
  const dashHasAtt =
    trendDaysWithData.length > 0 ||
    (todayFromKpis != null && !(todayFromKpis === 0 && trendDaysWithData.length === 0));
  const fb = buildAttendanceFallbackFromRecords(attRecords, teacherClassIds);
  if (!dashHasAtt) {
    todayFromKpis = fb.todayPct;
  }

  const trendAvgAll =
    trendItems.length > 0
      ? trendItems.reduce((s, t) => s + t.percentage, 0) / trendItems.length
      : null;
  trendDaysWithData = trendItems.filter((t) => t.total > 0);
  const trendAvgMarked =
    trendDaysWithData.length > 0
      ? trendDaysWithData.reduce((s, t) => s + t.percentage, 0) /
        trendDaysWithData.length
      : null;

  // Do not treat an all-zero padded trend as 0% overall when records have a real avg.
  const usableTrendAvg =
    trendDaysWithData.length > 0 && trendAvgAll != null
      ? Math.round(trendAvgAll * 10) / 10
      : null;

  let overallPct: number | null = todayFromKpis ?? usableTrendAvg;
  if (overallPct == null && fb.todayPct != null) overallPct = fb.todayPct;
  if (overallPct == null && fb.trendAvg != null) overallPct = fb.trendAvg;

  let avgAttPct: number | null =
    trendAvgMarked != null ? Math.round(trendAvgMarked * 10) / 10 : null;
  if (avgAttPct == null && fb.trendAvg != null) avgAttPct = fb.trendAvg;
  if (avgAttPct == null && overallPct != null) avgAttPct = overallPct;

  const kpiPct = overallPct ?? avgAttPct ?? null;

  return { overallPct, avgAttPct, kpiPct };
}

/** @deprecated Prefer computeTeacherAttendanceMetrics — kept for call sites needing a single number. */
export function computeTeacherAttendancePct(
  dashKpis: Record<string, unknown> | null,
  dashTrend: unknown,
  attRecords: unknown,
  teacherClassIds: number[],
): number {
  return (
    computeTeacherAttendanceMetrics(dashKpis, dashTrend, attRecords, teacherClassIds)
      .kpiPct ?? 0
  );
}

export function pickOutstandingDues(dues: unknown, feeSummary: unknown): number {
  const d = (dues ?? {}) as Record<string, unknown>;
  const f = (feeSummary ?? {}) as Record<string, unknown>;
  return (
    pickNumber(d.total_overdue, d.outstanding, d.total_outstanding) ||
    Math.max(pickNumber(f.total_pending, f.pending), 0)
  );
}
