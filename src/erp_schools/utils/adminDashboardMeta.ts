/**
 * Admin dashboard helpers — mirrors web adminDashboard/shared.tsx +
 * useAdminDashboardData derived metrics (alerts, staff split, formatters).
 */

import type { IconName } from '../types/admin';
import type { AccentKey } from '../theme/accents';
import { pickNumber, pickString, toLocalDateStr } from './apiHelpers';

export function formatCurrency(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '₹0';
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

export function formatFullCurrency(n: number): string {
  if (!Number.isFinite(n)) return '₹0';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Number(n).toFixed(digits)}%`;
}

export function greetingForHour(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function formatDashboardDate(d = new Date()): string {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function shortYearLabel(name: string): string {
  return name.replace(/^Academic Year\s*/i, '').trim() || name;
}

export function buildMonthCells(year: number, monthIndex: number): Array<number | null> {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startDow = first.getDay();
  const cells: Array<number | null> = [];
  for (let i = 0; i < startDow; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export type DashAlertSeverity = 'high' | 'medium' | 'low';

export interface DashAlert {
  id: string;
  severity: DashAlertSeverity;
  title: string;
  detail: string;
  route:
    | 'FeeCollection'
    | 'AttendanceDashboard'
    | 'StaffManagement'
    | 'Library'
    | 'InventoryDashboard'
    | 'Engagement';
  icon: IconName;
  accent: AccentKey;
  count?: number;
  label?: string;
}

export interface StaffAttendanceSplit {
  teachingPresent: number;
  teachingTotal: number;
  teachingPct: number;
  nonTeachingPresent: number;
  nonTeachingTotal: number;
  nonTeachingPct: number;
}

export interface ModuleStats {
  transport: { vehicles: number; routes: number; students: number };
  library: { books: number; issued: number; available: number; overdue: number };
  payroll: { staff: number; processed: number; pending: number; totalNet: number };
  inventory: { items: number; lowStock: number; outOfStock: number; totalValue: number };
  hostel: { rooms: number; occupied: number; available: number; occupancyPct: number };
}

export function emptyModules(): ModuleStats {
  return {
    transport: { vehicles: 0, routes: 0, students: 0 },
    library: { books: 0, issued: 0, available: 0, overdue: 0 },
    payroll: { staff: 0, processed: 0, pending: 0, totalNet: 0 },
    inventory: { items: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
    hostel: { rooms: 0, occupied: 0, available: 0, occupancyPct: 0 },
  };
}

const NON_TEACHING_RE =
  /non.?teach|office|account|reception|security|driver|librarian|lab.?assist|warden|housekeep|clerk|admin.?staff|peon|gardener|transport|nurse|counsel/;
const TEACHING_RE =
  /instructor|teacher|faculty|lecturer|tutor|class.?teacher|principal|head/;

export function computeStaffSplit(
  staffProfiles: Record<string, unknown>[],
  staffToday: Record<string, unknown>[],
): StaffAttendanceSplit {
  const isNonTeaching = (s: Record<string, unknown>) => {
    const d = `${pickString(s.designation)} ${pickString(s.department)} ${pickString(s.employment_type)}`.toLowerCase();
    return NON_TEACHING_RE.test(d);
  };
  const attended = new Set(['present', 'half_day']);
  const todayByStaff = new Map<number, string>();
  for (const row of staffToday) {
    const id = pickNumber(row.staff_user_id, row.user_id, row.staff_id);
    if (!id) continue;
    const status = pickString(row.status).toLowerCase();
    const prev = todayByStaff.get(id);
    if (!prev) todayByStaff.set(id, status);
    else if (attended.has(status) && !attended.has(prev)) todayByStaff.set(id, status);
  }

  let teaching = staffProfiles.filter((s) => !isNonTeaching(s));
  let nonTeaching = staffProfiles.filter(isNonTeaching);
  if (teaching.length === 0 && staffProfiles.length > 0) {
    teaching = staffProfiles.filter((s) =>
      TEACHING_RE.test(`${pickString(s.designation)} ${pickString(s.department)}`.toLowerCase()),
    );
    nonTeaching = staffProfiles.filter((s) => !teaching.includes(s));
    if (teaching.length === 0) {
      teaching = staffProfiles;
      nonTeaching = [];
    }
  }

  const presentOf = (list: Record<string, unknown>[]) =>
    list.filter((s) => {
      const id = pickNumber(s.user_id, s.id, s.staff_id);
      return id > 0 && attended.has(todayByStaff.get(id) || '');
    }).length;

  const teachingPresent = presentOf(teaching);
  const nonTeachingPresent = presentOf(nonTeaching);
  return {
    teachingPresent,
    teachingTotal: teaching.length,
    teachingPct: teaching.length ? (teachingPresent / teaching.length) * 100 : 0,
    nonTeachingPresent,
    nonTeachingTotal: nonTeaching.length,
    nonTeachingPct: nonTeaching.length ? (nonTeachingPresent / nonTeaching.length) * 100 : 0,
  };
}

export function buildDashboardAlerts(input: {
  feePending: number;
  avgAttendancePct: number | null;
  staffLeaveToday: number;
  libraryOverdue: number;
  inventoryLow: number;
  inventoryOut: number;
  openGrievances: number;
}): DashAlert[] {
  const list: DashAlert[] = [];
  if (input.feePending > 0) {
    list.push({
      id: 'fees',
      severity: 'high',
      title: 'Overdue / pending fee payments',
      detail: `${formatFullCurrency(input.feePending)} outstanding`,
      route: 'FeeCollection',
      icon: 'cash-outline',
      accent: 'red',
      count: Math.round(input.feePending),
      label: 'Fee Defaulters',
    });
  }
  if (input.avgAttendancePct != null && input.avgAttendancePct < 75) {
    list.push({
      id: 'att',
      severity: 'high',
      title: 'Low student attendance',
      detail: `Average ${input.avgAttendancePct}% over recent days`,
      route: 'AttendanceDashboard',
      icon: 'stats-chart-outline',
      accent: 'red',
      count: Math.round(input.avgAttendancePct),
      label: 'Low Attendance',
    });
  }
  if (input.staffLeaveToday > 0) {
    list.push({
      id: 'leave',
      severity: 'medium',
      title: 'Staff on leave today',
      detail: `${input.staffLeaveToday} staff marked on leave`,
      route: 'StaffManagement',
      icon: 'people-outline',
      accent: 'orange',
      count: input.staffLeaveToday,
      label: 'Staff on Leave',
    });
  }
  if (input.libraryOverdue > 0) {
    list.push({
      id: 'lib',
      severity: 'medium',
      title: 'Overdue library books',
      detail: `${input.libraryOverdue} overdue transaction(s)`,
      route: 'Library',
      icon: 'library-outline',
      accent: 'purple',
      count: input.libraryOverdue,
      label: 'Library Overdue',
    });
  }
  if (input.inventoryLow > 0 || input.inventoryOut > 0) {
    list.push({
      id: 'inv',
      severity: 'medium',
      title: 'Inventory stock alerts',
      detail: `${input.inventoryLow} low · ${input.inventoryOut} out of stock`,
      route: 'InventoryDashboard',
      icon: 'cube-outline',
      accent: 'orange',
      count: input.inventoryLow + input.inventoryOut,
      label: 'Stock Alerts',
    });
  }
  if (input.openGrievances > 0) {
    list.push({
      id: 'griev',
      severity: 'low',
      title: 'Open student grievances',
      detail: `${input.openGrievances} open`,
      route: 'Engagement',
      icon: 'chatbubbles-outline',
      accent: 'blue',
      count: input.openGrievances,
      label: 'Grievances',
    });
  }
  return list.slice(0, 6);
}

export function admissionPipeline(counts: Record<string, number>) {
  const get = (...keys: string[]) =>
    keys.reduce((n, k) => n + (Number(counts[k]) || 0), 0);
  return {
    enquiries: get('enquiry', 'enquiries'),
    applied: get('applied', 'application', 'applications'),
    admitted: get('accepted', 'enrolled', 'offered', 'admitted'),
    pending: get('entrance_test', 'interview', 'pending', 'review'),
    enrolled: get('enrolled'),
    accepted: get('accepted', 'offered'),
  };
}

export function resolveSchoolNameFromUser(user: unknown): string {
  if (!user || typeof user !== 'object') return '';
  const u = user as Record<string, unknown>;
  const school = u.school as Record<string, unknown> | undefined;
  const profile = u.profile as Record<string, unknown> | undefined;
  const profileSchool = profile?.school as Record<string, unknown> | undefined;
  const candidates = [
    u.school_name,
    u.schoolName,
    typeof u.school === 'string' ? u.school : undefined,
    school?.name,
    school?.school_name,
    profile?.school_name,
    profile?.schoolName,
    profileSchool?.name,
    profileSchool?.school_name,
  ];
  return (
    candidates.find((v): v is string => typeof v === 'string' && v.trim().length > 0)?.trim() ||
    ''
  );
}

export function leaveDatesInMonth(
  leaveRows: Record<string, unknown>[],
  ranges: Array<{ from: string; to: string }>,
  year: number,
  monthIndex: number,
): Set<string> {
  const marked = new Set<string>();
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  for (const row of leaveRows) {
    const d = pickString(row.date).slice(0, 10);
    if (d.startsWith(prefix)) marked.add(d);
  }
  for (const r of ranges) {
    if (!r.from) continue;
    const from = new Date(`${r.from}T12:00:00`);
    const to = new Date(`${(r.to || r.from).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) continue;
    for (let t = from.getTime(); t <= to.getTime(); t += 86400000) {
      const d = new Date(t);
      if (d.getFullYear() === year && d.getMonth() === monthIndex) {
        marked.add(toLocalDateStr(d));
      }
    }
  }
  return marked;
}
