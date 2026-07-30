/**
 * useAdminDashboardData — web adminDashboard/useAdminDashboardData parity.
 * School-wide dashboard for Admin / Principal. Empty + loader in live mode.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUserStore } from '@core/store/user.store';
import {
  admissionsApi,
  booksApi,
  classOverviewApi,
  erpDashboardApi,
  eventsApi,
  examAllItemsApi,
  examSubjectsApi,
  feeReportsApi,
  holidaysApi,
  hostelAllocationsApi,
  hostelRoomsApi,
  inventoryItemsApi,
  leaveApplicationsApi,
  libraryTransactionsApi,
  noticesApi,
  payslipsApi,
  routesApi,
  staffAttendanceApi,
  staffProfilesApi,
  studentFeeAssignmentsApi,
  studentGrievancesApi,
  transportAssignmentsApi,
  vehiclesApi,
  visitorsApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import {
  admissionPipeline,
  buildDashboardAlerts,
  computeStaffSplit,
  emptyModules,
  formatCurrency,
  formatDashboardDate,
  greetingForHour,
  resolveSchoolNameFromUser,
  shortYearLabel,
  type DashAlert,
  type ModuleStats,
  type StaffAttendanceSplit,
} from '../utils/adminDashboardMeta';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  settledValue,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';
import type { AdminMetric } from '../types/admin';
import type { AccentKey } from '../theme/accents';

export interface AttendanceTrendPoint {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
}

export interface ClassOverviewRow {
  classId: string;
  className: string;
  sectionName: string;
  label: string;
  studentCount: number;
}

export interface FeeKpisView {
  totalDue: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
  studentsWithDues: number;
  todayCollection: number;
  thisMonthCollection: number;
}

export interface AdminExamScheduleEntry {
  id: string;
  examItemId: string;
  examName: string;
  examGroupName: string;
  subjectName: string;
  className: string;
  examDate: string;
  startTime: string;
  roomNo: string;
}

export interface AdminHolidayItem {
  id: string;
  name: string;
  type: string;
  date: string;
  endDate: string;
}

export interface AdminDashEvent {
  id: string;
  day: string;
  month: string;
  title: string;
  meta: string;
  date: string;
}

export interface AdminDashboardView {
  status: LoadStatus;
  error: string | null;
  refreshing: boolean;
  refetch: () => Promise<void>;
  displayName: string;
  firstName: string;
  schoolName: string;
  academicYearLabel: string;
  greeting: string;
  dateLabel: string;
  today: string;
  kpis: AdminMetric[];
  secondaryKpis: AdminMetric[];
  todayAttendancePct: number | null;
  avgAttendancePct: number | null;
  trend: AttendanceTrendPoint[];
  classRows: ClassOverviewRow[];
  fee: FeeKpisView;
  admissionCounts: Record<string, number>;
  admissions: ReturnType<typeof admissionPipeline>;
  noticesCount: number;
  noticesPinned: number;
  staffCount: number;
  staffSplit: StaffAttendanceSplit;
  staffLeaveToday: number;
  modules: ModuleStats;
  alerts: DashAlert[];
  events: AdminDashEvent[];
  holidays: AdminHolidayItem[];
  examSchedules: AdminExamScheduleEntry[];
  examDates: Set<string>;
  leaveDates: Set<string>;
  grievances: { open: number; resolved: number };
  visitors: { onCampus: number; checkedOut: number; active: number; total: number };
  eventsThisMonth: number;
  incomeAmount: number;
}

function emptyFee(): FeeKpisView {
  return {
    totalDue: 0,
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0,
    collectionRate: 0,
    studentsWithDues: 0,
    todayCollection: 0,
    thisMonthCollection: 0,
  };
}

function fmtCount(n: number): string {
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function useAdminDashboardData(): AdminDashboardView {
  const session = useSchoolsSession();
  const user = useUserStore((s) => s.user);
  const { selectedYearId, selectedYear } = useAcademicYear();
  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [raw, setRaw] = useState({
    kpis: {} as Record<string, unknown>,
    trend: [] as AttendanceTrendPoint[],
    classRows: [] as ClassOverviewRow[],
    fee: emptyFee(),
    admissionCounts: {} as Record<string, number>,
    notices: [] as Record<string, unknown>[],
    staffProfiles: [] as Record<string, unknown>[],
    staffToday: [] as Record<string, unknown>[],
    staffLeave: [] as Record<string, unknown>[],
    approvedLeaveRanges: [] as Array<{ from: string; to: string; staffId: number }>,
    modules: emptyModules(),
    holidays: [] as AdminHolidayItem[],
    events: [] as AdminDashEvent[],
    grievances: [] as Record<string, unknown>[],
    visitors: [] as Record<string, unknown>[],
    examSchedules: [] as AdminExamScheduleEntry[],
    schoolName: '',
  });

  const load = useCallback(
    async (isRefresh = false) => {
      if (USE_MOCK_DATA) {
        setStatus('ready');
        setError(null);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setStatus('loading');
      setError(null);

      const schoolId = session.schoolId ?? undefined;
      const yearId = selectedYearId ?? undefined;
      const now = new Date();
      const today = toLocalDateStr(now);
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const monthEnd = toLocalDateStr(new Date(year, month, 0));
      const schoolParams: Record<string, string | number> = { per_page: 200 };
      if (schoolId != null) schoolParams.school_id = schoolId;

      try {
        const results = await Promise.allSettled([
          erpDashboardApi.get(7, schoolId, yearId),
          yearId
            ? classOverviewApi.getKPIs({
                academic_year_id: yearId,
                school_id: schoolId,
              })
            : Promise.resolve([]),
          staffAttendanceApi.getAll({
            ...schoolParams,
            date_from: monthStart,
            date_to: monthEnd,
            status: 'leave',
            approval_status: 'approved',
          }),
          leaveApplicationsApi.list({
            ...schoolParams,
            status: 'approved',
            per_page: 200,
          }),
          staffAttendanceApi.getAll({
            ...schoolParams,
            date_from: today,
            date_to: today,
          }),
          staffProfilesApi.list({ ...schoolParams, per_page: 200 }),
          noticesApi.getAll({ ...schoolParams, per_page: 20, is_active: true }),
          admissionsApi.statusCounts(
            schoolId != null ? { school_id: schoolId } : undefined,
          ),
          feeReportsApi.summary(
            schoolId != null ? { school_id: schoolId } : undefined,
          ),
          studentFeeAssignmentsApi.list({
            ...schoolParams,
            academic_year_id: yearId,
            per_page: 200,
          }),
          feeReportsApi.outstandingDues(
            schoolId != null ? { school_id: schoolId } : undefined,
          ),
          booksApi.list({ ...schoolParams, per_page: 200 }),
          libraryTransactionsApi.list({ ...schoolParams, per_page: 200 }),
          vehiclesApi.list({ ...schoolParams, per_page: 200 }),
          routesApi.list({ ...schoolParams, per_page: 200 }),
          transportAssignmentsApi.list({ ...schoolParams, per_page: 200 }),
          hostelRoomsApi.list({ ...schoolParams, per_page: 200 }),
          hostelAllocationsApi.list({ ...schoolParams, per_page: 200 }),
          inventoryItemsApi.list({ ...schoolParams, per_page: 200 }),
          payslipsApi.list({ ...schoolParams, month, year, per_page: 200 }),
          holidaysApi.getAll({ ...schoolParams, year, per_page: 100 }),
          eventsApi.list({ ...schoolParams, per_page: 50 }),
          studentGrievancesApi.list({ ...schoolParams, per_page: 100 }),
          visitorsApi.list({ ...schoolParams, per_page: 50 }),
          examAllItemsApi.list(schoolId),
        ]);

        const dashRaw = settledValue(results[0], null) as Record<string, unknown> | null;
        const classRaw = settledValue(results[1], null);
        const leaveMonthRaw = settledValue(results[2], null);
        const leaveAppRaw = settledValue(results[3], null);
        const staffTodayRaw = settledValue(results[4], null);
        const staffRaw = settledValue(results[5], null);
        const noticesRaw = settledValue(results[6], null);
        const admCountsRaw = settledValue(results[7], null) as Record<string, number> | null;
        const feeSumRaw = settledValue(results[8], null) as Record<string, unknown> | null;
        const feeAssignRaw = settledValue(results[9], null);
        const duesRaw = settledValue(results[10], null) as Record<string, unknown> | null;
        const booksRaw = settledValue(results[11], null);
        const libTxRaw = settledValue(results[12], null);
        const vehiclesRaw = settledValue(results[13], null);
        const routesRaw = settledValue(results[14], null);
        const transportRaw = settledValue(results[15], null);
        const roomsRaw = settledValue(results[16], null);
        const allocRaw = settledValue(results[17], null);
        const invRaw = settledValue(results[18], null);
        const payslipRaw = settledValue(results[19], null);
        const holidayRaw = settledValue(results[20], null);
        const eventsRaw = settledValue(results[21], null);
        const grievanceRaw = settledValue(results[22], null);
        const visitorsRaw = settledValue(results[23], null);
        const examItemsRaw = settledValue(results[24], null);

        const classList = safeList<Record<string, unknown>>(classRaw);
        const classRows: ClassOverviewRow[] = classList.map((c, i) => {
          const className = pickString(c.class_name, c.name, `Class ${i + 1}`);
          const sectionName = pickString(c.section_name, c.section);
          const classId = pickString(c.class_id, c.id);
          const sectionId = pickString(c.section_id, c.section);
          // class_id alone can repeat across sections — keep row keys unique
          return {
            classId: [classId || 'cls', sectionId || sectionName || 'sec', String(i)].join('-'),
            className,
            sectionName,
            label: sectionName ? `${className} ${sectionName}` : className,
            studentCount: pickNumber(c.student_count),
          };
        });

        let kpis = ((dashRaw?.kpis as Record<string, unknown>) ?? dashRaw ?? {}) as Record<
          string,
          unknown
        >;
        const trendRaw = safeList<Record<string, unknown>>(dashRaw?.attendance_trend);
        const trend: AttendanceTrendPoint[] = trendRaw.map((t) => ({
          date: pickString(t.date),
          present: pickNumber(t.present),
          absent: pickNumber(t.absent),
          late: pickNumber(t.late),
          total: pickNumber(t.total),
          percentage: pickNumber(t.percentage, t.attendance_pct),
        }));

        const classStudentSum = classRows.reduce((s, c) => s + c.studentCount, 0);
        if (!pickNumber(kpis.active_students, kpis.total_students) && classStudentSum > 0) {
          kpis = {
            ...kpis,
            active_students: classStudentSum,
            total_students: Math.max(pickNumber(kpis.total_students), classStudentSum),
            total_classes: pickNumber(kpis.total_classes) || classRows.length,
          };
        }

        const staffProfiles = safeList<Record<string, unknown>>(staffRaw).filter(
          (s) => s.is_active !== false,
        );
        const staffToday = safeList<Record<string, unknown>>(staffTodayRaw);
        const staffLeave = safeList<Record<string, unknown>>(leaveMonthRaw);
        const approvedLeaveRanges = safeList<Record<string, unknown>>(leaveAppRaw)
          .filter(
            (a) =>
              pickString(a.status).toLowerCase() === 'approved' && a.is_active !== false,
          )
          .map((a) => ({
            from: pickString(a.from_date).slice(0, 10),
            to: pickString(a.to_date, a.from_date).slice(0, 10),
            staffId: pickNumber(a.staff_id, a.user_id),
          }))
          .filter((r) => !!r.from);

        let fee: FeeKpisView = {
          totalDue: pickNumber(feeSumRaw?.total_due),
          totalCollected: pickNumber(feeSumRaw?.total_collected, feeSumRaw?.collected),
          totalPending: pickNumber(feeSumRaw?.total_pending, feeSumRaw?.pending),
          totalOverdue: pickNumber(
            duesRaw?.total_overdue,
            feeSumRaw?.total_overdue,
            feeSumRaw?.overdue,
          ),
          collectionRate: pickNumber(feeSumRaw?.collection_rate),
          studentsWithDues: pickNumber(
            feeSumRaw?.total_students_with_dues,
            duesRaw?.student_count,
          ),
          todayCollection: pickNumber(feeSumRaw?.today_collection),
          thisMonthCollection: pickNumber(feeSumRaw?.this_month_collection),
        };

        if (fee.totalDue === 0) {
          const assigns = safeList<Record<string, unknown>>(feeAssignRaw);
          const assignDue = assigns.reduce((s, a) => s + pickNumber(a.total_fee), 0);
          if (assignDue > 0) {
            fee = {
              ...fee,
              totalDue: assignDue,
              totalPending: Math.max(assignDue - fee.totalCollected, 0),
              studentsWithDues: new Set(
                assigns.map((a) => pickString(a.student_id, a.id)).filter(Boolean),
              ).size,
              collectionRate:
                fee.totalCollected > 0
                  ? Math.round((fee.totalCollected / assignDue) * 1000) / 10
                  : 0,
            };
          }
        }

        const books = safeList<Record<string, unknown>>(booksRaw);
        const libTx = safeList<Record<string, unknown>>(libTxRaw);
        const totalBookCopies = books.reduce((s, b) => s + pickNumber(b.total_copies, 1), 0);
        const availableCopies = books.reduce((s, b) => s + pickNumber(b.available_copies), 0);
        const issuedTx = libTx.filter((t) =>
          /issued|active/.test(pickString(t.status).toLowerCase()),
        );
        const overdueTx = libTx.filter((t) =>
          pickString(t.status).toLowerCase().includes('overdue'),
        );

        const vehicles = safeList<Record<string, unknown>>(vehiclesRaw);
        const routesList = safeList<Record<string, unknown>>(routesRaw);
        const transport = safeList<Record<string, unknown>>(transportRaw);
        const rooms = safeList<Record<string, unknown>>(roomsRaw);
        const allocs = safeList<Record<string, unknown>>(allocRaw);
        const occupiedBeds =
          rooms.reduce((s, r) => s + pickNumber(r.occupied), 0) || allocs.length;
        const capacity = rooms.reduce((s, r) => s + pickNumber(r.capacity), 0);
        const availableBeds = Math.max(0, capacity - occupiedBeds);

        const inv = safeList<Record<string, unknown>>(invRaw);
        const lowStock = inv.filter(
          (i) =>
            pickNumber(i.quantity) > 0 &&
            pickNumber(i.quantity) <= pickNumber(i.min_stock_level),
        );
        const outStock = inv.filter((i) => pickNumber(i.quantity) <= 0);
        const invValue = inv.reduce(
          (s, i) => s + pickNumber(i.quantity) * pickNumber(i.unit_price),
          0,
        );

        const payslips = safeList<Record<string, unknown>>(payslipRaw);
        const processed = payslips.filter((p) =>
          ['paid', 'processed', 'approved'].includes(pickString(p.status).toLowerCase()),
        );
        const pendingPays = payslips.filter((p) =>
          ['pending', 'draft', 'generated'].includes(pickString(p.status).toLowerCase()),
        );
        const totalNet = payslips.reduce((s, p) => s + pickNumber(p.net_salary), 0);

        const modules: ModuleStats = {
          transport: {
            vehicles: vehicles.length,
            routes: routesList.length,
            students: transport.filter((t) => t.is_active !== false).length,
          },
          library: {
            books: totalBookCopies || books.length,
            issued: issuedTx.length,
            available: availableCopies,
            overdue: overdueTx.length,
          },
          payroll: {
            staff: staffProfiles.length,
            processed: processed.length,
            pending: pendingPays.length || Math.max(0, staffProfiles.length - processed.length),
            totalNet,
          },
          inventory: {
            items: inv.length,
            lowStock: lowStock.length,
            outOfStock: outStock.length,
            totalValue: invValue,
          },
          hostel: {
            rooms: rooms.length,
            occupied: occupiedBeds,
            available: availableBeds || Math.max(0, rooms.length - occupiedBeds),
            occupancyPct:
              capacity > 0
                ? Math.round((occupiedBeds / capacity) * 1000) / 10
                : rooms.length > 0
                  ? Math.round((occupiedBeds / rooms.length) * 1000) / 10
                  : 0,
          },
        };

        const holidays: AdminHolidayItem[] = safeList<Record<string, unknown>>(holidayRaw).map(
          (h, i) => ({
            id: `${pickString(h.id, 'h')}-${i}`,
            name: pickString(h.name, h.title, 'Holiday'),
            type: pickString(h.holiday_type, h.type, 'holiday'),
            date: pickString(h.start_date, h.date, h.holiday_date).slice(0, 10),
            endDate: pickString(h.end_date, h.start_date, h.date).slice(0, 10),
          }),
        );

        const events: AdminDashEvent[] = safeList<Record<string, unknown>>(eventsRaw).map(
          (e, i) => {
            const start = pickString(e.start_date, e.event_date, e.date);
            const d = start ? new Date(start) : null;
            const valid = d && !Number.isNaN(d.getTime());
            return {
              id: `${pickString(e.id, 'ev')}-${i}`,
              day: valid ? String(d!.getDate()) : '',
              month: valid ? d!.toLocaleString(undefined, { month: 'short' }) : '',
              title: pickString(e.title, e.name, 'Event'),
              meta: pickString(e.location, e.venue, e.description),
              date: start.slice(0, 10),
            };
          },
        );

        const examItems = Array.isArray(examItemsRaw)
          ? (examItemsRaw as Record<string, unknown>[])
          : safeList<Record<string, unknown>>(examItemsRaw);
        const activeItems = examItems.filter((i) => i.is_active !== false).slice(0, 40);
        const subjectBatches = await Promise.all(
          activeItems.map(async (item) => {
            try {
              const itemId = pickNumber(item.id);
              if (!itemId) return [] as AdminExamScheduleEntry[];
              const res = await examSubjectsApi.list(itemId, schoolId);
              return safeList<Record<string, unknown>>(res)
                .filter((s) => s.is_active !== false && pickString(s.exam_date))
                .map(
                  (s, si): AdminExamScheduleEntry => ({
                    id: `${itemId}-${pickString(s.id, 's')}-${si}`,
                    examItemId: String(itemId),
                    examName: pickString(item.name, 'Exam'),
                    examGroupName: pickString(item.exam_group_name),
                    subjectName: pickString(s.subject_name, `Subject ${s.subject_id}`),
                    className: pickString(s.class_name),
                    examDate: pickString(s.exam_date).slice(0, 10),
                    startTime: pickString(s.start_time),
                    roomNo: pickString(s.room_no),
                  }),
                );
            } catch {
              return [] as AdminExamScheduleEntry[];
            }
          }),
        );

        setRaw({
          kpis,
          trend,
          classRows,
          fee,
          admissionCounts: (admCountsRaw && typeof admCountsRaw === 'object'
            ? admCountsRaw
            : {}) as Record<string, number>,
          notices: safeList<Record<string, unknown>>(noticesRaw),
          staffProfiles,
          staffToday,
          staffLeave,
          approvedLeaveRanges,
          modules,
          holidays,
          events,
          grievances: safeList<Record<string, unknown>>(grievanceRaw),
          visitors: safeList<Record<string, unknown>>(visitorsRaw),
          examSchedules: subjectBatches.flat(),
          schoolName: resolveSchoolNameFromUser(user),
        });
        setStatus('ready');
      } catch (e) {
        setError(extractErrorMessage(e));
        setStatus('error');
      } finally {
        setRefreshing(false);
      }
    },
    [session.schoolId, selectedYearId, user],
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void loadRef.current(false);
  }, [session.schoolId, selectedYearId]);

  const refetch = useCallback(async () => {
    await loadRef.current(true);
  }, []);

  return useMemo((): AdminDashboardView => {
    const today = toLocalDateStr();
    const k = raw.kpis;
    const classStudentSum = raw.classRows.reduce((s, c) => s + c.studentCount, 0);
    const students =
      pickNumber(k.active_students, k.total_students) || classStudentSum;
    const staffCount = raw.staffProfiles.length || pickNumber(k.total_teachers);
    const classes = pickNumber(k.total_classes) || raw.classRows.length;

    const lastTrend = raw.trend.length ? raw.trend[raw.trend.length - 1] : null;
    const kpiToday =
      k.today_attendance_pct != null && Number.isFinite(Number(k.today_attendance_pct))
        ? Number(k.today_attendance_pct)
        : null;
    const todayAttendancePct =
      kpiToday ??
      (lastTrend?.percentage != null && Number.isFinite(lastTrend.percentage)
        ? Number(lastTrend.percentage)
        : null);
    const trendWithTotal = raw.trend.filter((t) => (t.total || 0) > 0);
    const avgAttendancePct = trendWithTotal.length
      ? Math.round(
          (trendWithTotal.reduce((s, t) => s + t.percentage, 0) / trendWithTotal.length) * 10,
        ) / 10
      : todayAttendancePct;

    const staffSplit = computeStaffSplit(raw.staffProfiles, raw.staffToday);
    const staffLeaveToday = raw.staffLeave.filter(
      (s) => pickString(s.date).slice(0, 10) === today,
    ).length;

    const openGrievances = raw.grievances.filter(
      (g) => !['resolved', 'closed', 'rejected'].includes(pickString(g.status).toLowerCase()),
    ).length;
    const resolvedGrievances = raw.grievances.filter((g) =>
      ['resolved', 'closed'].includes(pickString(g.status).toLowerCase()),
    ).length;

    const visitorsOnCampus = raw.visitors.filter((v) => {
      const st = pickString(v.status, v.visit_status).toLowerCase();
      return st.includes('campus') || st === 'checked_in' || (v.check_in && !v.check_out);
    }).length;
    const visitorsCheckedOut = raw.visitors.filter((v) => {
      const st = pickString(v.status, v.visit_status).toLowerCase();
      return st.includes('out') || !!v.check_out;
    }).length;

    const monthPrefix = today.slice(0, 7);
    const eventsThisMonth = raw.events.filter((e) => e.date.startsWith(monthPrefix)).length;
    const noticesActive = raw.notices.filter((n) => n.is_active !== false).length;
    const noticesPinned = raw.notices.filter((n) => n.is_pinned).length;

    const feePending = raw.fee.totalPending || raw.fee.totalOverdue || 0;

    const alerts = buildDashboardAlerts({
      feePending,
      avgAttendancePct,
      staffLeaveToday,
      libraryOverdue: raw.modules.library.overdue,
      inventoryLow: raw.modules.inventory.lowStock,
      inventoryOut: raw.modules.inventory.outOfStock,
      openGrievances,
    });

    const admissions = admissionPipeline(raw.admissionCounts);
    const admissionTotal =
      Object.values(raw.admissionCounts).reduce((s, n) => s + (Number(n) || 0), 0) ||
      admissions.enquiries + admissions.applied + admissions.admitted;

    const yearLabel = shortYearLabel(selectedYear?.name ?? '');
    const displayName = session.displayName || 'Admin';
    const firstName = session.firstName || displayName.split(/\s+/)[0] || 'Admin';
    const schoolName = raw.schoolName || 'School';

    const kpis: AdminMetric[] = [
      {
        key: 'students',
        icon: 'school-outline',
        value: fmtCount(students),
        label: 'Total Students',
        accent: 'teal',
      },
      {
        key: 'teachers',
        icon: 'people-outline',
        value: fmtCount(staffCount),
        label: 'Total Staff',
        accent: 'blue',
      },
      {
        key: 'classes',
        icon: 'business-outline',
        value: fmtCount(classes),
        label: 'Total Classes',
        accent: 'purple',
      },
      {
        key: 'attendance',
        icon: 'stats-chart-outline',
        value:
          todayAttendancePct != null ? `${Math.round(Number(todayAttendancePct))}%` : '—',
        label: 'Attendance Today',
        accent: 'green',
      },
    ];

    const secondaryKpis: AdminMetric[] = [
      {
        key: 'notices',
        icon: 'megaphone-outline',
        value: fmtCount(noticesActive || pickNumber(k.active_notices)),
        label: 'Active Notices',
        accent: 'orange' as AccentKey,
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
      {
        key: 'admissions',
        icon: 'person-add-outline',
        value: fmtCount(admissionTotal),
        label: 'Admissions',
        accent: 'orange',
      },
      {
        key: 'fees',
        icon: 'wallet-outline',
        value: formatCurrency(raw.fee.thisMonthCollection || raw.fee.totalCollected),
        label: 'Fees Collected',
        accent: 'green',
      },
    ];

    const now = new Date();
    const leaveDates = new Set<string>();
    for (const row of raw.staffLeave) {
      const d = pickString(row.date).slice(0, 10);
      if (d) leaveDates.add(d);
    }
    for (const r of raw.approvedLeaveRanges) {
      if (!r.from) continue;
      const from = new Date(`${r.from}T12:00:00`);
      const to = new Date(`${(r.to || r.from).slice(0, 10)}T12:00:00`);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) continue;
      for (let t = from.getTime(); t <= to.getTime(); t += 86400000) {
        leaveDates.add(toLocalDateStr(new Date(t)));
      }
    }

    const examDates = new Set(raw.examSchedules.map((e) => e.examDate).filter(Boolean));

    const upcomingHolidays = raw.holidays
      .filter((h) => h.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);

    const upcomingEvents = raw.events
      .filter((e) => !e.date || e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);

    return {
      status,
      error,
      refreshing,
      refetch,
      displayName,
      firstName,
      schoolName,
      academicYearLabel: yearLabel,
      greeting: greetingForHour(now),
      dateLabel: formatDashboardDate(now),
      today,
      kpis,
      secondaryKpis,
      todayAttendancePct: todayAttendancePct != null ? Number(todayAttendancePct) : null,
      avgAttendancePct,
      trend: raw.trend,
      classRows: raw.classRows,
      fee: raw.fee,
      admissionCounts: raw.admissionCounts,
      admissions,
      noticesCount: noticesActive || pickNumber(k.active_notices),
      noticesPinned,
      staffCount,
      staffSplit,
      staffLeaveToday,
      modules: raw.modules,
      alerts,
      events: upcomingEvents,
      holidays: upcomingHolidays,
      examSchedules: raw.examSchedules,
      examDates,
      leaveDates,
      grievances: { open: openGrievances, resolved: resolvedGrievances },
      visitors: {
        onCampus: visitorsOnCampus,
        checkedOut: visitorsCheckedOut,
        active: visitorsOnCampus,
        total: raw.visitors.length,
      },
      eventsThisMonth,
      incomeAmount: raw.fee.totalCollected || raw.fee.thisMonthCollection,
    };
  }, [
    raw,
    status,
    error,
    refreshing,
    refetch,
    session.displayName,
    session.firstName,
    selectedYear?.name,
  ]);
}
