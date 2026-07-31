/**
 * Student dashboard helpers — ported from web StudentERPDashboard +
 * studentClassesOverview/utils (attendance window, fees, upcoming events).
 */

import { pickNumber, pickString, safeList, toLocalDateStr } from './apiHelpers';

export function ymd(value?: string | null): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export function formatCurrencyInr(n: number): string {
  if (!Number.isFinite(n)) return '₹0';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function formatDateLabel(iso?: string | null): string {
  const d = ymd(iso);
  if (!d) return '—';
  const dt = new Date(`${d}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTimeLabel(t?: string | null): string {
  if (!t) return '';
  const raw = String(t).slice(0, 5);
  const [h, m] = raw.split(':').map(Number);
  if (Number.isNaN(h)) return raw;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

export function inclusiveCalendarDays(fromYmd: string, toYmd: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const from = parse(fromYmd);
  const to = parse(toYmd);
  if (to < from) return 0;
  return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
}

export function resolveAcademicYearAttendancePeriod(
  yearStartDate?: string | null,
  yearEndDate?: string | null,
  today: Date = new Date(),
) {
  const todayStr = toLocalDateStr(today);
  const y = today.getFullYear();
  const start = yearStartDate?.slice(0, 10) || `${y}-04-01`;
  let endBound = yearEndDate?.slice(0, 10) || `${y + 1}-03-31`;
  if (start > endBound) endBound = start;

  if (todayStr < start) {
    return {
      periodStart: start,
      periodEnd: start,
      calendarTotalDays: 0,
      isFutureYear: true,
      isPastYear: false,
      isActiveYear: false,
    };
  }

  const isPastYear = endBound < todayStr;
  const periodEnd = isPastYear ? endBound : todayStr;
  return {
    periodStart: start,
    periodEnd,
    calendarTotalDays: inclusiveCalendarDays(start, periodEnd),
    isFutureYear: false,
    isPastYear,
    isActiveYear: !isPastYear && todayStr <= endBound,
  };
}

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

export function computeYearAttendanceMetrics(
  records: Record<string, unknown>[],
  yearStart?: string | null,
  yearEnd?: string | null,
  summary?: {
    present?: number;
    absent?: number;
    late?: number;
    excused?: number;
    leave?: number;
    total_days?: number;
  } | null,
) {
  const period = resolveAcademicYearAttendancePeriod(yearStart, yearEnd);
  const scoped = records.filter((r) => {
    const d = ymd(pickString(r.date));
    return d && d >= period.periodStart && d <= period.periodEnd;
  });

  const byDate = new Map<string, string>();
  for (const r of scoped) {
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
  let markedDays = byDate.size;

  if (markedDays === 0 && summary) {
    present = Number(summary.present || 0);
    absent = Number(summary.absent || 0);
    late = Number(summary.late || 0);
    leave = Number(summary.excused ?? summary.leave ?? 0);
    markedDays = Number(summary.total_days || present + absent + late + leave);
  }

  if (period.calendarTotalDays > 0) {
    const inferredAbsent = Math.max(0, period.calendarTotalDays - (present + late + leave));
    absent = Math.max(absent, inferredAbsent);
  }

  const attended = present + late;
  const percentage =
    period.calendarTotalDays > 0
      ? Math.round((attended / period.calendarTotalDays) * 1000) / 10
      : markedDays > 0
        ? Math.round((attended / markedDays) * 1000) / 10
        : 0;

  const periodLabel = period.isPastYear
    ? 'Full academic year'
    : period.isFutureYear
      ? 'Year not started'
      : 'Academic year to date';

  return {
    ...period,
    present,
    absent,
    late,
    leave,
    markedDays,
    percentage,
    periodLabel,
    totalDays: period.calendarTotalDays || markedDays,
  };
}

/** Web StudentERPDashboard fee rollup from my-payments items. */
export function computeFeeSummaryFromPayments(data: unknown): {
  total: number;
  paid: number;
  due: number;
  nextDueDate: string;
  nextDueLabel: string;
  assignmentCount: number;
  studentName: string;
  admissionNumber: string;
} {
  const root = (data ?? {}) as Record<string, unknown>;
  const items = safeList<Record<string, unknown>>(root.items ?? data);
  let total = 0;
  let paid = 0;
  let due = 0;
  let nextDueDate = '';
  let nextDueLabel = '';

  for (const row of items) {
    const assignment = (row.assignment ?? row) as Record<string, unknown>;
    const terms = safeList<Record<string, unknown>>(row.terms);
    total += pickNumber(assignment.total_fee, assignment.amount, assignment.total_amount);

    if (terms.length > 0) {
      for (const term of terms) {
        const st = pickString(term.status).toLowerCase();
        const amt = pickNumber(term.amount_due, term.amount);
        if (st === 'paid' || st === 'waived') {
          paid += amt;
        } else {
          due += amt;
          const d = ymd(pickString(term.due_date));
          if (d && (!nextDueDate || d < nextDueDate)) {
            nextDueDate = d;
            nextDueLabel = pickString(term.term_label, 'Next installment');
          }
        }
      }
    } else {
      const statusRaw = pickString(row.status, assignment.status, row.payment_status).toLowerCase();
      const amount = pickNumber(assignment.total_fee, row.amount, row.total_amount);
      const paidAmt = pickNumber(row.paid_amount, row.amount_paid);
      if (statusRaw.includes('paid') || (paidAmt >= amount && amount > 0)) {
        paid += amount || paidAmt;
      } else {
        due += Math.max(amount - paidAmt, 0) || amount;
        const d = ymd(pickString(row.due_date, assignment.due_date));
        if (d && (!nextDueDate || d < nextDueDate)) {
          nextDueDate = d;
          nextDueLabel = pickString(row.fee_type_name, assignment.title, 'Next installment');
        }
      }
    }
  }

  return {
    total,
    paid,
    due,
    nextDueDate,
    nextDueLabel,
    assignmentCount: items.length,
    studentName: pickString(root.student_name),
    admissionNumber: pickString(root.admission_number),
  };
}

export type DashboardSubjectCard = {
  id: string;
  name: string;
  classroomName: string;
  teacher: string;
  classLabel: string;
  subjectId?: number;
  percentage: number | null;
  obtained?: number;
  maxMarks?: number;
};

export function mapEnrolledSubjects(
  enrollmentsRaw: unknown,
  perfItems: Record<string, unknown>[],
): DashboardSubjectCard[] {
  const enrollments = safeList<Record<string, unknown>>(enrollmentsRaw).filter(
    (e) => e.is_active !== false,
  );

  const byId = new Map<number, Record<string, unknown>>();
  const byName = new Map<string, Record<string, unknown>>();
  for (const p of perfItems) {
    const sid = pickNumber(p.subject_id);
    if (sid) byId.set(sid, p);
    byName.set(pickString(p.subject_name).trim().toLowerCase(), p);
  }

  const matchPerf = (name: string, subjectId?: number) => {
    if (subjectId && byId.has(subjectId)) return byId.get(subjectId)!;
    const exact = byName.get(name.trim().toLowerCase());
    if (exact) return exact;
    const n = name.trim().toLowerCase();
    for (const [key, val] of byName) {
      if (key && n && (key.includes(n) || n.includes(key))) return val;
    }
    return null;
  };

  if (enrollments.length > 0) {
    return enrollments
      .map((e, i) => {
        const name =
          pickString(e.subject_name).trim() || pickString(e.name) || 'Subject';
        const classroomName = pickString(e.name).trim() || name;
        const subjectId = pickNumber(e.subject_id) || undefined;
        const perf = matchPerf(name, subjectId);
        const pct = perf ? pickNumber(perf.percentage) : null;
        return {
          id: pickString(e.class_id, e.enrollment_id, `subj-${i}`),
          name,
          classroomName,
          teacher: pickString(e.instructor_name),
          classLabel: [pickString(e.academic_class_name), pickString(e.section_name)]
            .filter(Boolean)
            .join(' · '),
          subjectId,
          percentage: pct != null && pct > 0 ? pct : perf ? pickNumber(perf.percentage) : null,
          obtained: perf ? pickNumber(perf.obtained) : undefined,
          maxMarks: perf ? pickNumber(perf.max_marks) : undefined,
        };
      })
      .sort((a, b) => a.classroomName.localeCompare(b.classroomName));
  }

  // Fallback: performance-only subjects
  return perfItems.map((p, i) => ({
    id: `perf-${pickNumber(p.subject_id, i)}`,
    name: pickString(p.subject_name, 'Subject'),
    classroomName: pickString(p.subject_name, 'Subject'),
    teacher: '',
    classLabel: '',
    subjectId: pickNumber(p.subject_id) || undefined,
    percentage: pickNumber(p.percentage) || null,
    obtained: pickNumber(p.obtained) || undefined,
    maxMarks: pickNumber(p.max_marks) || undefined,
  }));
}

export type UpcomingDashEvent = {
  id: string;
  date: string;
  kind: 'exam' | 'holiday' | 'announcement';
  title: string;
  brief: string;
};

function isInCurrentMonth(date: string, todayStr: string): boolean {
  return date.slice(0, 7) === todayStr.slice(0, 7);
}

function isUpcomingThisMonth(date: string, todayStr: string): boolean {
  return isInCurrentMonth(date, todayStr) && date >= todayStr;
}

export function buildUpcomingEvents(input: {
  exams: Record<string, unknown>[];
  holidays: Record<string, unknown>[];
  notices: Record<string, unknown>[];
  todayStr?: string;
}): UpcomingDashEvent[] {
  const todayStr = input.todayStr || toLocalDateStr();
  const list: UpcomingDashEvent[] = [];

  for (const e of input.exams) {
    const d = ymd(pickString(e.exam_date));
    if (!d || !isUpcomingThisMonth(d, todayStr)) continue;
    const subject = pickString(e.subject_name, e.exam_name, 'Exam');
    const when = [formatTimeLabel(pickString(e.start_time)), pickString(e.room_no) ? `Room ${pickString(e.room_no)}` : '']
      .filter(Boolean)
      .join(' · ');
    list.push({
      id: `exam-${pickNumber(e.exam_subject_id, e.id)}-${d}`,
      date: d,
      kind: 'exam',
      title: subject,
      brief: when
        ? `Exam · ${pickString(e.exam_name, 'Scheduled')} · ${when}`
        : `Exam · ${pickString(e.exam_name, 'Scheduled')}`,
    });
  }

  for (const h of input.holidays) {
    const start = ymd(pickString(h.start_date));
    const end = ymd(pickString(h.end_date)) || start;
    if (!start) continue;
    if (end < todayStr) continue;
    if (!isInCurrentMonth(start, todayStr) && !isInCurrentMonth(end, todayStr) && !(start <= todayStr && end >= todayStr)) {
      // still allow if range overlaps current month upcoming
      const month = todayStr.slice(0, 7);
      if (!start.startsWith(month) && !end.startsWith(month) && !(start < `${month}-01` && end > `${month}-28`)) {
        continue;
      }
    }
    if (end < todayStr) continue;
    const showDate = start >= todayStr ? start : todayStr;
    if (!isInCurrentMonth(showDate, todayStr) && !isInCurrentMonth(start, todayStr)) continue;
    list.push({
      id: `hol-${pickNumber(h.id)}-${start}`,
      date: start >= todayStr ? start : showDate,
      kind: 'holiday',
      title: pickString(h.name, 'Holiday'),
      brief: [pickString(h.holiday_type), pickString(h.description)].filter(Boolean).join(' · ') || 'Holiday',
    });
  }

  const notices = [...input.notices]
    .sort((a, b) => Number(!!b.is_pinned) - Number(!!a.is_pinned))
    .slice(0, 3);
  for (const n of notices) {
    const created = ymd(pickString(n.publish_date, n.created_at, n.start_date)) || todayStr;
    list.push({
      id: `ann-${pickNumber(n.id)}`,
      date: created,
      kind: 'announcement',
      title: pickString(n.title, 'Announcement'),
      brief: ['Announcement', pickString(n.category, n.notice_type), pickString(n.content, n.body).slice(0, 60)]
        .filter(Boolean)
        .join(' · '),
    });
  }

  return list
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
    .slice(0, 8);
}

export function weeklySchedulePercent(today: Date = new Date()): number {
  const dow = today.getDay();
  if (dow === 0 || dow === 6) return 100;
  return Math.round((dow / 5) * 100);
}

export function initialsFromName(name?: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function buildMonthCells(year: number, monthIndex: number): (number | null)[] {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay(); // Sun-first for compact mobile cal
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((startPad + daysInMonth) / 7) * 7;
  return Array.from({ length: cellCount }, (_, i) => {
    const day = i - startPad + 1;
    if (day < 1 || day > daysInMonth) return null;
    return day;
  });
}

export function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
