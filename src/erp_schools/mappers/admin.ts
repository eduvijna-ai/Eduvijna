/**
 * Admin mappers — ERP API payloads → admin UI types.
 */

import type {
  AdminAnnouncement,
  AdminEvent,
  AdminMetric,
  AdminProfile,
  DirectoryPerson,
  FeeRecord,
  PendingApproval,
} from '../types/admin';
import type { AccentKey } from '../theme/accents';
import {
  formatDisplayDate,
  pickNumber,
  pickString,
  safeList,
} from '../utils/apiHelpers';

const ACCENTS: AccentKey[] = ['teal', 'blue', 'green', 'orange', 'purple', 'pink', 'red'];

function fmtCount(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function formatMoneyLabel(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

export function mapAdminProfile(
  session: { displayName: string; email: string; persona: string },
  yearName: string,
  schoolName: string,
): AdminProfile {
  return {
    name: session.displayName,
    role: session.persona === 'principal' ? 'Principal' : 'School Admin',
    schoolName: schoolName || 'School',
    academicYear: yearName,
    email: session.email,
    phone: '',
  };
}

export function mapDashboardKpis(dash: unknown, classKpis: unknown): {
  kpis: AdminMetric[];
  secondaryKpis: AdminMetric[];
  attendancePct: number;
} {
  const d = (dash ?? {}) as Record<string, unknown>;
  const k = (d.kpis ?? d) as Record<string, unknown>;
  const classRows = safeList<Record<string, unknown>>(classKpis);
  const studentCount =
    pickNumber(k.total_students, k.active_students) ||
    classRows.reduce((n, r) => n + pickNumber(r.student_count), 0);
  const teacherCount = pickNumber(k.total_teachers, k.teachers);
  const classCount = pickNumber(k.total_classes, k.classes) || classRows.length;
  const attendancePct = pickNumber(
    k.today_attendance_pct,
    k.attendance_pct,
    k.attendance_percentage,
  );

  return {
    attendancePct,
    kpis: [
      {
        key: 'students',
        icon: 'school-outline',
        value: fmtCount(studentCount),
        label: 'Total Students',
        accent: 'teal',
      },
      {
        key: 'teachers',
        icon: 'people-outline',
        value: fmtCount(teacherCount),
        label: 'Total Teachers',
        accent: 'blue',
      },
      {
        key: 'classes',
        icon: 'business-outline',
        value: fmtCount(classCount),
        label: 'Total Classes',
        accent: 'purple',
      },
      {
        key: 'attendance',
        icon: 'stats-chart-outline',
        value: `${Math.round(attendancePct)}%`,
        label: 'Attendance Today',
        accent: 'green',
      },
    ],
    secondaryKpis: [
      {
        key: 'notices',
        icon: 'megaphone-outline',
        value: fmtCount(pickNumber(k.active_notices)),
        label: 'Active Notices',
        accent: 'orange',
      },
      {
        key: 'courses',
        icon: 'book-outline',
        value: fmtCount(pickNumber(k.total_courses)),
        label: 'Courses',
        accent: 'blue',
      },
      {
        key: 'batches',
        icon: 'layers-outline',
        value: fmtCount(pickNumber(k.total_batches)),
        label: 'Batches',
        accent: 'teal',
      },
    ],
  };
}

export function mapDirectoryPeople(rows: unknown, kind: 'student' | 'teacher' | 'staff' | 'parent'): DirectoryPerson[] {
  return safeList<Record<string, unknown>>(rows).map((r, i) => {
    const name = pickString(r.student_name, r.full_name, r.name, r.teacher_name, 'User');
    const subtitle = pickString(r.class_name, r.designation, r.department, r.role_name, kind);
    const meta = pickString(r.email, r.phone, r.admission_number, r.employee_id);
    const statusRaw = pickString(r.status).toLowerCase();
    let status: DirectoryPerson['status'] = 'active';
    if (statusRaw.includes('absent')) status = 'absent';
    else if (statusRaw.includes('leave')) status = 'leave';
    else if (statusRaw.includes('inactive')) status = 'inactive';

    return {
      id: pickString(r.user_id, r.id, r.student_id, r.staff_id, `${kind}-${i}`),
      name,
      subtitle,
      meta,
      value: pickString(r.attendance_percent, r.performance) || subtitle,
      status,
      accent: ACCENTS[i % ACCENTS.length],
      avatarUrl: pickString(r.avatar_url, r.photo_url) || undefined,
    };
  });
}

export function mapFeeRecords(collections: unknown): FeeRecord[] {
  return safeList<Record<string, unknown>>(collections).map((r, i) => {
    const statusRaw = pickString(r.status, r.payment_status).toLowerCase();
    let status: FeeRecord['status'] = 'pending';
    if (statusRaw.includes('paid') || statusRaw.includes('collected')) status = 'paid';
    else if (statusRaw.includes('over')) status = 'overdue';
    return {
      id: pickString(r.id, `fee-${i}`),
      studentName: pickString(r.student_name, r.name, 'Student'),
      studentId: pickString(r.student_id, r.user_id, ''),
      grade: pickString(r.class_name, r.class, r.grade),
      dueLabel: formatDisplayDate(pickString(r.due_date, r.date) || null),
      amount: pickNumber(r.amount, r.total_amount, r.paid_amount),
      status,
    };
  });
}

export function mapAdminAnnouncements(notices: unknown): AdminAnnouncement[] {
  return safeList<Record<string, unknown>>(notices).map((n, i) => ({
    id: pickString(n.id, `ann-${i}`),
    category: 'general',
    categoryLabel: 'General',
    title: pickString(n.title, n.subject, 'Announcement'),
    body: pickString(n.content, n.body, n.description),
    dateLabel: formatDisplayDate(pickString(n.publish_date, n.created_at) || null),
    author: pickString(n.author_name, n.created_by_name, 'Admin'),
    icon: n.is_pinned ? 'pin' : 'megaphone-outline',
    accent: ACCENTS[i % ACCENTS.length],
    pinned: Boolean(n.is_pinned),
  }));
}

export function mapAdminEvents(events: unknown): AdminEvent[] {
  return safeList<Record<string, unknown>>(events).map((e, i) => {
    const start = pickString(e.start_date, e.event_date, e.date);
    const d = start ? new Date(start) : null;
    const valid = d && !Number.isNaN(d.getTime());
    return {
      id: pickString(e.id, `ev-${i}`),
      day: valid ? String(d!.getDate()) : '',
      month: valid ? d!.toLocaleString(undefined, { month: 'short' }) : '',
      title: pickString(e.title, e.name, 'Event'),
      meta: pickString(e.location, e.venue, e.description),
    };
  });
}

export function mapApprovalsFromLeaves(leaves: unknown): PendingApproval[] {
  const pending = safeList<Record<string, unknown>>(leaves).filter((l) =>
    pickString(l.status).toLowerCase().includes('pend'),
  );
  return [
    {
      id: 'leave',
      icon: 'people-outline',
      accent: 'blue',
      label: 'Leave Requests',
      count: pending.length,
    },
  ];
}
