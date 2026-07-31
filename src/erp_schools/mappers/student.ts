/**
 * Student mappers — API DTOs → erp_schools UI types.
 */

import type {
  AttendanceBucket,
  AttendanceDayRecord,
  ExamResultItem,
  ExamScheduleItem,
  FeeInstallment,
  FeePayment,
  IssuedBook,
  StudentAnnouncement,
  StudentAssignment,
  StudentDashboardOverview,
  StudentEvent,
  StudentNotice,
  StudentProfile,
  StudentScheduleItem,
  SubjectMark,
  TimetableDay,
  TimetableSlot,
} from '../types/student';
import {
  formatDisplayDate,
  formatDisplayTime,
  pickNumber,
  pickString,
  safeList,
  toLocalDateStr,
} from '../utils/apiHelpers';

const ACCENTS = ['teal', 'blue', 'green', 'orange', 'purple', 'pink', 'red'] as const;

function accentAt(i: number) {
  return ACCENTS[i % ACCENTS.length];
}

function subjectIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('math')) return 'calculator-outline';
  if (n.includes('science') || n.includes('physics') || n.includes('chem') || n.includes('bio'))
    return 'flask-outline';
  if (n.includes('english') || n.includes('lang')) return 'book-outline';
  if (n.includes('histor') || n.includes('social')) return 'globe-outline';
  if (n.includes('computer') || n.includes('it')) return 'laptop-outline';
  return 'school-outline';
}

export const emptyStudentProfile = (displayName = 'Student'): StudentProfile => ({
  name: displayName,
  className: '',
  rollNo: '',
  admissionNo: '',
  academicYear: '',
  attendancePercent: 0,
  averageMarks: 0,
  classRank: 0,
  classStrength: 0,
  guardianName: '',
  dateOfBirth: '',
  bloodGroup: '',
  email: '',
  phone: '',
  address: '',
});

export const emptyOverview = (): StudentDashboardOverview => ({
  attendancePercent: 0,
  averageMarks: 0,
  classRank: 0,
  totalAssignments: 0,
  pendingAssignments: 0,
});

type RosterRow = Record<string, unknown>;

export function mapRosterToProfile(
  roster: unknown,
  user: { displayName: string; email: string; userId: number | null },
  academicYearName: string,
  attendancePercent: number,
  averageMarks: number,
): StudentProfile {
  const rows = safeList<RosterRow>(roster);
  const me =
    rows.find((r) => Number(r.user_id ?? r.student_user_id ?? r.id) === user.userId) ??
    rows[0];

  if (!me) {
    return {
      ...emptyStudentProfile(user.displayName),
      email: user.email,
      academicYear: academicYearName,
      attendancePercent,
      averageMarks,
    };
  }

  const className = pickString(
    me.class_name,
    me.className,
    [me.class, me.section].filter(Boolean).join('-'),
    me.grade_name,
  );
  const roll = pickString(me.roll_no, me.roll_number, me.rollNo, me.admission_roll);

  return {
    name: pickString(me.student_name, me.full_name, me.name, user.displayName),
    className: className ? (className.startsWith('Class') ? className : `Class ${className}`) : '',
    rollNo: roll,
    admissionNo: pickString(me.admission_number, me.admission_no, me.admissionNo),
    academicYear: academicYearName,
    attendancePercent,
    averageMarks,
    classRank: pickNumber(me.class_rank, me.rank),
    classStrength: pickNumber(me.class_strength, me.total_students),
    guardianName: pickString(me.guardian_name, me.primary_guardian_name),
    dateOfBirth: formatDisplayDate(pickString(me.date_of_birth, me.dob) || null),
    bloodGroup: pickString(me.blood_group, me.bloodGroup),
    email: pickString(me.email, user.email),
    phone: pickString(me.phone, me.mobile, me.contact_number),
    address: pickString(me.address, me.residential_address),
  };
}

export function mapAttendanceSummary(data: unknown): {
  overallPercent: number;
  buckets: AttendanceBucket[];
  present: number;
  absent: number;
  late: number;
  total: number;
} {
  const d = (data ?? {}) as Record<string, unknown>;
  const present = pickNumber(d.present, d.present_days, d.present_count);
  const absent = pickNumber(d.absent, d.absent_days, d.absent_count);
  const late = pickNumber(d.late, d.late_days, d.late_count);
  const leave = pickNumber(d.leave, d.leave_days, d.on_leave);
  const total = pickNumber(d.total_days, d.total, present + absent + late + leave);
  const pct =
    pickNumber(d.percentage, d.attendance_percentage, d.pct) ||
    (total > 0 ? Math.round((present / total) * 100) : 0);

  return {
    overallPercent: pct,
    present,
    absent,
    late,
    total,
    buckets: [
      {
        key: 'present',
        label: 'Present',
        value: String(present),
        sublabel: 'Days',
        icon: 'checkmark-circle-outline',
        accent: 'green',
      },
      {
        key: 'absent',
        label: 'Absent',
        value: String(absent),
        sublabel: 'Days',
        icon: 'close-circle-outline',
        accent: 'red',
      },
      {
        key: 'leave',
        label: 'Leave / Late',
        value: String(leave + late),
        sublabel: 'Days',
        icon: 'time-outline',
        accent: 'orange',
      },
      {
        key: 'total',
        label: 'Total',
        value: String(total),
        sublabel: `${pct}%`,
        icon: 'calendar-outline',
        accent: 'teal',
      },
    ],
  };
}

export function mapAttendanceRecords(data: unknown): AttendanceDayRecord[] {
  return safeList<Record<string, unknown>>(data).map((r, i) => {
    const dateStr = pickString(r.date, r.attendance_date, r.day);
    const d = dateStr ? new Date(dateStr) : null;
    const statusRaw = pickString(r.status, r.attendance_status).toLowerCase();
    let status: AttendanceDayRecord['status'] = 'present';
    if (statusRaw.includes('absent')) status = 'absent';
    else if (statusRaw.includes('late') || statusRaw.includes('half')) status = 'late';
    else if (statusRaw.includes('leave')) status = 'leave';

    return {
      id: pickString(r.id, `att-${i}`),
      day: d && !Number.isNaN(d.getTime()) ? d.getDate() : pickNumber(r.day),
      month:
        d && !Number.isNaN(d.getTime())
          ? d.toLocaleString(undefined, { month: 'short' })
          : pickString(r.month),
      status,
      weekday:
        d && !Number.isNaN(d.getTime())
          ? d.toLocaleString(undefined, { weekday: 'short' })
          : pickString(r.weekday),
      note: pickString(r.remarks, r.note) || undefined,
    };
  });
}

export function mapNoticesToAnnouncements(data: unknown): StudentAnnouncement[] {
  return safeList<Record<string, unknown>>(data)
    .slice(0, 8)
    .map((n, i) => ({
      id: pickString(n.id, `an-${i}`),
      title: pickString(n.title, n.subject, 'Notice'),
      body: pickString(n.content, n.body, n.description, n.message),
      date: formatDisplayDate(pickString(n.publish_date, n.created_at, n.date) || null),
      isNew: Boolean(n.is_pinned || n.is_new),
    }));
}

export function mapNotices(data: unknown): StudentNotice[] {
  return safeList<Record<string, unknown>>(data).map((n, i) => {
    const created = pickString(n.publish_date, n.created_at, n.date);
    const d = created ? new Date(created) : null;
    const catRaw = pickString(n.target_audience, n.category, n.notice_type).toLowerCase();
    let category: StudentNotice['category'] = 'school';
    if (catRaw.includes('class')) category = 'class';
    else if (catRaw.includes('urgent') || catRaw.includes('important')) category = 'urgent';
    else if (catRaw.includes('circular')) category = 'circular';

    return {
      id: pickString(n.id, `notice-${i}`),
      category,
      title: pickString(n.title, n.subject, 'Notice'),
      body: pickString(n.content, n.body, n.description, n.message),
      author: pickString(n.author_name, n.created_by_name, n.author, 'School'),
      dateLabel: formatDisplayDate(created || null),
      timeLabel:
        d && !Number.isNaN(d.getTime())
          ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
          : '',
      icon: n.is_pinned ? 'pin' : 'megaphone-outline',
      accent: accentAt(i),
      pinned: Boolean(n.is_pinned),
    };
  });
}

export function mapEvents(data: unknown): StudentEvent[] {
  return safeList<Record<string, unknown>>(data).map((e, i) => {
    const start = pickString(e.start_date, e.event_date, e.date, e.starts_at);
    const d = start ? new Date(start) : null;
    const valid = d && !Number.isNaN(d.getTime());
    const catRaw = pickString(e.category, e.event_type, e.type).toLowerCase();
    let category: StudentEvent['category'] = 'school';
    if (catRaw.includes('sport')) category = 'sports';
    else if (catRaw.includes('acad')) category = 'academic';
    else if (catRaw.includes('comp')) category = 'competition';
    else if (catRaw.includes('holiday')) category = 'holiday';

    return {
      id: pickString(e.id, `ev-${i}`),
      title: pickString(e.title, e.name, 'Event'),
      category,
      categoryLabel: pickString(e.category, e.event_type, 'School'),
      day: valid ? String(d!.getDate()) : '',
      month: valid ? d!.toLocaleString(undefined, { month: 'short' }) : '',
      weekday: valid ? d!.toLocaleString(undefined, { weekday: 'short' }) : '',
      timeLabel: formatDisplayTime(pickString(e.start_time, e.time, start) || null),
      location: pickString(e.location, e.venue, e.place),
      icon: 'calendar-outline',
      accent: accentAt(i),
      completed: Boolean(e.is_completed || e.completed),
    };
  });
}

export function mapTimetableSlotsToSchedule(data: unknown): StudentScheduleItem[] {
  const today = new Date().getDay(); // 0 Sun
  const slots = safeList<Record<string, unknown>>(data).filter((s) => {
    const dow = pickNumber(s.day_of_week, s.weekday, s.day);
    // API often uses 1=Mon..7=Sun or 0=Sun
    if (!dow && dow !== 0) return true;
    if (dow === today) return true;
    if (dow === 7 && today === 0) return true;
    if (today === 0 && dow === 0) return true;
    // Mon=1 mapping: JS Sun=0 → skip unless matched
    const jsFromMon = today === 0 ? 7 : today;
    return dow === jsFromMon;
  });

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  return slots.slice(0, 8).map((s, i) => {
    const start = pickString(s.start_time, s.from_time);
    const end = pickString(s.end_time, s.to_time);
    const startMins = parseTimeToMinutes(start);
    const endMins = parseTimeToMinutes(end);
    let status: StudentScheduleItem['status'] = 'upcoming';
    if (startMins != null && endMins != null) {
      if (nowMins >= endMins) status = 'completed';
      else if (nowMins >= startMins) status = 'ongoing';
    }

    return {
      id: pickString(s.id, `slot-${i}`),
      startTime: formatDisplayTime(start),
      endTime: formatDisplayTime(end),
      subject: pickString(s.subject_name, s.subject, s.title, 'Period'),
      room: pickString(s.room_name, s.room, s.classroom),
      teacher: pickString(s.teacher_name, s.instructor_name, s.teacher),
      status,
    };
  });
}

function parseTimeToMinutes(t?: string): number | null {
  if (!t) return null;
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

export function mapTimetableWeek(data: unknown): TimetableDay[] {
  const slots = safeList<Record<string, unknown>>(data);
  const byDay = new Map<number, TimetableSlot[]>();

  slots.forEach((s, i) => {
    let dow = pickNumber(s.day_of_week, s.weekday, s.day);
    if (dow === 0) dow = 7; // treat Sunday as 7
    const slot: TimetableSlot = {
      id: pickString(s.id, `ts-${i}`),
      periodNo: pickNumber(s.period_no, s.period_number, s.period) || undefined,
      startTime: formatDisplayTime(pickString(s.start_time, s.from_time)),
      endTime: formatDisplayTime(pickString(s.end_time, s.to_time)),
      kind: pickString(s.slot_type, s.kind).toLowerCase().includes('break') ? 'break' : 'period',
      subject: pickString(s.subject_name, s.subject) || undefined,
      topic: pickString(s.topic, s.title, s.subject_name, s.subject, 'Period'),
      teacher: pickString(s.teacher_name, s.instructor_name) || undefined,
      room: pickString(s.room_name, s.room) || undefined,
      icon: subjectIcon(pickString(s.subject_name, s.subject)),
      accent: accentAt(i),
    };
    const list = byDay.get(dow) ?? [];
    list.push(slot);
    byDay.set(dow, list);
  });

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const jsDow = today.getDay();
  const todayMonBased = jsDow === 0 ? 7 : jsDow;

  return labels.map((weekday, idx) => {
    const key = idx + 1;
    return {
      key: String(key),
      weekday,
      dateLabel: weekday,
      isToday: key === todayMonBased,
      slots: byDay.get(key) ?? [],
    };
  });
}

export function mapExamSchedule(data: unknown): ExamScheduleItem[] {
  const items = safeList<Record<string, unknown>>(data);
  // Support { items: [...] } already via safeList; also nested schedules
  const flat =
    items.length > 0
      ? items
      : safeList<Record<string, unknown>>((data as { schedules?: unknown })?.schedules);

  const today = toLocalDateStr();
  return flat.map((ex, i) => {
    const date = pickString(ex.exam_date, ex.date, ex.scheduled_date, ex.start_date);
    const state: ExamScheduleItem['state'] =
      date && date < today ? 'completed' : date === today ? 'ongoing' : 'upcoming';
    const subject = pickString(ex.subject_name, ex.subject, 'Subject');
    const durationMins = pickNumber(ex.duration_mins, ex.duration_minutes);
    const start = pickString(ex.start_time, ex.time);
    const durationLabel =
      pickString(ex.duration_label, ex.duration) ||
      (durationMins ? `${durationMins} min` : '');
    return {
      id: pickString(ex.exam_subject_id, ex.id, ex.exam_item_id, `exam-${i}`),
      subject,
      icon: subjectIcon(subject),
      accent: accentAt(i),
      dateLabel: formatDisplayDate(date || null),
      timeLabel: formatDisplayTime(start || null),
      room: pickString(ex.room_no, ex.room, ex.venue, ex.hall),
      durationLabel,
      state,
    };
  });
}

export function mapSubjectPerformance(data: unknown): {
  subjects: SubjectMark[];
  averageMarks: number;
  results: ExamResultItem[];
} {
  const root = (data ?? {}) as Record<string, unknown>;
  const rows = safeList<Record<string, unknown>>(
    root.subjects ?? root.items ?? root.performance ?? data,
  );
  const subjects: SubjectMark[] = rows.map((r, i) => {
    const name = pickString(r.subject_name, r.subject, r.name, `Subject ${i + 1}`);
    const percent = pickNumber(r.percentage, r.percent, r.avg_percent, r.score);
    const obtained = pickNumber(r.obtained, r.marks_obtained, r.total_obtained);
    const _maxMarks = pickNumber(r.max_marks, r.total_marks, r.out_of, 100);
    void _maxMarks;
    return {
      id: pickString(r.subject_id, r.id, `sub-${i}`),
      subject: name,
      icon: subjectIcon(name),
      accent: accentAt(i),
      periodicTest: pickString(r.periodic_test, r.pt) || '—',
      notebook: pickString(r.notebook, r.nb) || '—',
      enrichment: pickString(r.enrichment, r.sea) || '—',
      examination: pickString(r.examination, r.exam) || String(obtained || '—'),
      total: String(obtained || percent),
      percent,
      grade: pickString(r.grade, r.letter_grade) || gradeFromPercent(percent),
    };
  });

  const results: ExamResultItem[] = subjects.map((s) => ({
    id: s.id,
    subject: s.subject,
    icon: s.icon,
    accent: s.accent,
    obtained: pickNumber(s.total) || Math.round((s.percent / 100) * 100),
    maxMarks: 100,
    percent: s.percent,
    grade: s.grade,
  }));

  const averageMarks =
    pickNumber(root.overall_percentage, root.average, root.avg) ||
    (subjects.length
      ? Math.round(subjects.reduce((a, s) => a + s.percent, 0) / subjects.length)
      : 0);

  return { subjects, averageMarks, results };
}

function gradeFromPercent(p: number): string {
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B+';
  if (p >= 60) return 'B';
  if (p >= 50) return 'C';
  if (p > 0) return 'D';
  return '—';
}

export function mapAssignments(data: unknown): {
  list: StudentAssignment[];
  stats: { total: number; submitted: number; pending: number; overdue: number };
} {
  const list = safeList<Record<string, unknown>>(data).map((a, i) => {
    const statusRaw = pickString(a.status, a.submission_status).toLowerCase();
    let status: StudentAssignment['status'] = 'pending';
    if (statusRaw.includes('grad')) status = 'graded';
    else if (statusRaw.includes('submit')) status = 'submitted';
    else if (statusRaw.includes('over')) status = 'overdue';
    else if (a.is_overdue) status = 'overdue';

    const subject = pickString(a.subject_name, a.subject, a.class_name, 'Assignment');
    return {
      id: pickString(a.id, `asg-${i}`),
      title: pickString(a.title, a.name, 'Assignment'),
      subject,
      description: pickString(a.description, a.instructions, a.body),
      icon: 'document-text-outline',
      accent: accentAt(i),
      dueLabel: formatDisplayDate(pickString(a.due_date, a.deadline) || null),
      status,
      submittedLabel: a.submitted_at
        ? formatDisplayDate(String(a.submitted_at))
        : undefined,
      marks: a.marks_obtained != null ? Number(a.marks_obtained) : undefined,
      maxMarks: a.max_marks != null ? Number(a.max_marks) : undefined,
    };
  });

  return {
    list,
    stats: {
      total: list.length,
      submitted: list.filter((x) => x.status === 'submitted' || x.status === 'graded').length,
      pending: list.filter((x) => x.status === 'pending').length,
      overdue: list.filter((x) => x.status === 'overdue').length,
    },
  };
}

export function mapFees(data: unknown): {
  summary: { total: number; paid: number; due: number; balancePercent: number };
  installments: FeeInstallment[];
  payments: FeePayment[];
  breakup: { id: string; label: string; icon: string; amount: number }[];
} {
  const root = (data ?? {}) as Record<string, unknown>;
  const items = safeList<Record<string, unknown>>(root.items ?? data);

  let paid = 0;
  let due = 0;
  const installments: FeeInstallment[] = items.map((it, i) => {
    const amount = pickNumber(it.amount, it.total_amount, it.due_amount);
    const paidAmt = pickNumber(it.paid_amount, it.amount_paid);
    const statusRaw = pickString(it.status, it.payment_status).toLowerCase();
    let status: FeeInstallment['status'] = 'pending';
    if (statusRaw.includes('paid') || paidAmt >= amount && amount > 0) status = 'paid';
    else if (statusRaw.includes('over')) status = 'overdue';
    if (status === 'paid') paid += amount || paidAmt;
    else due += Math.max(amount - paidAmt, 0) || amount;

    return {
      id: pickString(it.id, `fee-${i}`),
      index: i + 1,
      label: pickString(it.fee_type_name, it.title, it.label, `Installment ${i + 1}`),
      dueDate: formatDisplayDate(pickString(it.due_date, it.deadline) || null),
      amount,
      status,
      paidDate: it.paid_date ? formatDisplayDate(String(it.paid_date)) : undefined,
    };
  });

  const total = pickNumber(root.total, paid + due) || paid + due;
  const balancePercent = total > 0 ? Math.round((paid / total) * 100) : 0;

  const payments: FeePayment[] = items
    .filter((it) => {
      const s = pickString(it.status).toLowerCase();
      return s.includes('paid') || pickNumber(it.paid_amount) > 0;
    })
    .map((it, i) => ({
      id: pickString(it.id, `pay-${i}`),
      label: pickString(it.fee_type_name, it.title, 'Payment'),
      method: pickString(it.payment_mode, it.method, '—'),
      amount: pickNumber(it.paid_amount, it.amount),
      date: formatDisplayDate(pickString(it.paid_date, it.payment_date, it.updated_at) || null),
    }));

  const breakup = installments.map((inst) => ({
    id: inst.id,
    label: inst.label,
    icon: 'wallet-outline',
    amount: inst.amount,
  }));

  return {
    summary: { total, paid, due, balancePercent },
    installments,
    payments,
    breakup,
  };
}

export function mapLibraryIssued(data: unknown): IssuedBook[] {
  return safeList<Record<string, unknown>>(data)
    .filter((t) => {
      const st = pickString(t.status, t.transaction_type).toLowerCase();
      return st.includes('issue') || st.includes('borrow') || !st.includes('return');
    })
    .map((t, i) => {
      const due = pickString(t.due_date, t.return_due_date);
      const dueDate = due ? new Date(due) : null;
      const daysLeft =
        dueDate && !Number.isNaN(dueDate.getTime())
          ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;
      return {
        id: pickString(t.id, `lib-${i}`),
        title: pickString(t.book_title, t.title, t.book_name, 'Book'),
        author: pickString(t.author, t.book_author, '—'),
        issuedOn: formatDisplayDate(pickString(t.issue_date, t.issued_on, t.created_at) || null),
        dueOn: formatDisplayDate(due || null),
        daysLeft,
      };
    });
}

export function mapLibraryBooks(data: unknown): {
  id: string;
  title: string;
  author: string;
  category: string;
  rating: number;
  coverColor: string;
  isEbook?: boolean;
}[] {
  const colors = ['#0B5563', '#0F6D7A', '#12B3C7', '#22C55E', '#F59E0B', '#6366F1'];
  return safeList<Record<string, unknown>>(data).map((b, i) => ({
    id: pickString(b.id, `book-${i}`),
    title: pickString(b.title, b.name, 'Book'),
    author: pickString(b.author, b.authors, '—'),
    category: pickString(b.category, b.genre, b.subject, 'General'),
    rating: pickNumber(b.rating, b.avg_rating) || 0,
    coverColor: colors[i % colors.length],
    isEbook: Boolean(b.is_ebook || b.ebook),
  }));
}
