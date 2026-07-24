/**
 * useAdminData — live ERP seam for Admin screens.
 * Preserves the mock return shape; screens stay unchanged.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  admissionsApi,
  booksApi,
  classOverviewApi,
  erpDashboardApi,
  eventsApi,
  feeCollectionsApi,
  feeReportsApi,
  holidaysApi,
  hostelRoomsApi,
  inventoryItemsApi,
  leaveApplicationsApi,
  noticesApi,
  routesApi,
  staffProfilesApi,
  studentsByUserApi,
  vehiclesApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import * as mock from '../data/admin';
import {
  formatMoneyLabel,
  mapAdminAnnouncements,
  mapAdminEvents,
  mapAdminProfile,
  mapApprovalsFromLeaves,
  mapDashboardKpis,
  mapDirectoryPeople,
  mapFeeRecords,
} from '../mappers/admin';
import {
  extractErrorMessage,
  pickNumber,
  safeList,
  settledValue,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

function mockAdminPayload() {
  return {
    profile: mock.adminProfile,
    dashboard: {
      kpis: mock.dashboardKpis,
      secondaryKpis: mock.dashboardSecondaryKpis,
      alerts: mock.dashboardAlerts,
      attendancePulses: mock.attendancePulses,
      feeCollection: mock.dashboardFeeCollection,
      insights: mock.dashboardInsights,
      approvals: mock.dashboardApprovals,
      events: mock.dashboardEvents,
    },
    school: {
      kpis: mock.schoolKpis,
      attendanceTrend: mock.schoolAttendanceTrend,
      attendanceDistribution: mock.schoolAttendanceDistribution,
      subjectPerformance: mock.schoolSubjectPerformance,
      gradeMarks: mock.schoolGradeMarks,
      infrastructure: mock.schoolInfraItems,
    },
    students: {
      kpis: mock.studentKpis,
      enrollmentTrend: mock.studentEnrollmentTrend,
      byGrade: mock.studentsByGrade,
      atRisk: mock.studentsAtRisk,
      recentAdmissions: mock.recentAdmissions,
    },
    teachers: {
      kpis: mock.teacherKpis,
      performanceCriteria: mock.teacherPerformanceCriteria,
      performanceDistribution: mock.teacherPerformanceDist,
      directory: mock.teacherDirectory,
      onLeave: mock.teachersOnLeave,
    },
    parents: { kpis: mock.parentKpis, directory: mock.parentDirectory },
    staff: { kpis: mock.staffKpis, directory: mock.staffDirectory },
    roles: mock.adminRoles,
    permissionGroups: mock.permissionGroups,
    academics: {
      kpis: mock.academicKpis,
      trend: mock.academicTrend,
      gradeMarks: mock.academicGradeMarks,
      subjectPerformance: mock.academicSubjectPerf,
      distribution: mock.academicDistribution,
      topClasses: mock.topClasses,
    },
    classes: { list: mock.adminClasses, overviewKpis: mock.classOverviewKpis },
    exams: {
      kpis: mock.examKpis,
      upcoming: mock.upcomingExams,
      ongoing: mock.ongoingExams,
      recent: mock.recentExamResults,
    },
    reports: {
      kpis: mock.academicReportKpis,
      academicReports: mock.academicReports,
      categories: mock.reportCategories,
      recent: mock.recentReports,
      analyticsKpis: mock.reportAnalyticsKpis,
    },
    admissions: {
      kpis: mock.admissionKpis,
      trend: mock.admissionTrend,
      byGrade: mock.admissionByGrade,
      applications: mock.admissionApplications,
      workflow: mock.approvalWorkflow,
    },
    attendance: {
      kpis: mock.attendanceKpis,
      trend: mock.attendanceTrend,
      distribution: mock.attendanceDistribution,
      classWise: mock.classWiseAttendance,
      alerts: mock.attendanceAlerts,
      teacherSummary: mock.teacherAttendanceSummary,
      absentees: mock.absentStudents,
      heatmap: mock.gradeHeatmap,
      heatmapDays: mock.heatmapDays,
    },
    finance: {
      kpis: mock.financeKpis,
      feeCollectionKpis: mock.feeCollectionKpis,
      collectionTrend: mock.collectionTrend,
      collectionDistribution: mock.collectionDistribution,
      feeTypes: mock.feeTypes,
      records: mock.feeRecords,
      transactions: mock.recentTransactions,
      concessions: mock.concessions,
      revenueKpis: mock.revenueKpis,
      revenueTrend: mock.revenueTrend,
      revenueSources: mock.revenueSources,
      expenseKpis: mock.expenseKpis,
      expenseTrend: mock.expenseTrend,
      expenseCategories: mock.expenseCategories,
    },
    operations: {
      libraryKpis: mock.libraryKpis,
      libraryActivity: mock.libraryActivity,
      bookKpis: mock.bookKpis,
      bookCatalog: mock.bookCatalog,
      transportKpis: mock.transportKpis,
      transportRoutes: mock.transportRoutesSummary,
      vehicleKpis: mock.vehicleKpis,
      vehicles: mock.vehicles,
      routes: mock.routes,
      hostelKpis: mock.hostelKpis,
      hostelOccupancy: mock.hostelOccupancy,
      hostelRooms: mock.hostelRooms,
      inventoryKpis: mock.inventoryKpis,
      inventoryItems: mock.inventoryItems,
    },
    announcements: mock.adminAnnouncements,
    notifications: mock.adminNotifications,
  };
}

type AdminPayload = ReturnType<typeof mockAdminPayload>;

function emptyFromMock(): AdminPayload {
  const base = mockAdminPayload();
  // Zero-out scalars while keeping structure for screens that map over arrays
  return {
    ...base,
    dashboard: {
      ...base.dashboard,
      kpis: base.dashboard.kpis.map((k) => ({ ...k, value: '0' })),
      secondaryKpis: base.dashboard.secondaryKpis.map((k) => ({ ...k, value: '0' })),
      alerts: [],
      attendancePulses: [
        { label: 'Students', percent: 0, accent: 'teal' },
        { label: 'Teachers', percent: 0, accent: 'green' },
      ],
      feeCollection: { collected: 0, pending: 0, overdue: 0, totalLabel: '₹0' },
      insights: [],
      approvals: [],
      events: [],
    },
    students: {
      ...base.students,
      kpis: base.students.kpis.map((k) => ({ ...k, value: '0' })),
      byGrade: [],
      atRisk: [],
      recentAdmissions: [],
      enrollmentTrend: [],
    },
    teachers: {
      ...base.teachers,
      directory: [],
      onLeave: [],
      kpis: base.teachers.kpis.map((k) => ({ ...k, value: '0' })),
    },
    parents: { kpis: base.parents.kpis.map((k) => ({ ...k, value: '0' })), directory: [] },
    staff: { kpis: base.staff.kpis.map((k) => ({ ...k, value: '0' })), directory: [] },
    classes: { list: [], overviewKpis: base.classes.overviewKpis.map((k) => ({ ...k, value: '0' })) },
    finance: {
      ...base.finance,
      records: [],
      transactions: [],
      kpis: base.finance.kpis.map((k) => ({ ...k, value: '0' })),
    },
    operations: {
      ...base.operations,
      bookCatalog: [],
      vehicles: [],
      routes: [],
      hostelRooms: [],
      inventoryItems: [],
    },
    announcements: [],
    notifications: [],
    admissions: {
      ...base.admissions,
      applications: [],
      workflow: [],
      kpis: base.admissions.kpis.map((k) => ({ ...k, value: '0' })),
    },
  };
}

export function useAdminData() {
  const session = useSchoolsSession();
  const { selectedYearId, selectedYear } = useAcademicYear();
  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminPayload>(() =>
    USE_MOCK_DATA ? mockAdminPayload() : emptyFromMock(),
  );

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setData(mockAdminPayload());
      setStatus('ready');
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);
    const schoolId = session.schoolId ?? undefined;
    const params: Record<string, string | number> = { per_page: 100 };
    if (schoolId) params.school_id = schoolId;
    if (selectedYearId) params.academic_year_id = selectedYearId;

    try {
      const results = await Promise.allSettled([
        erpDashboardApi.get(7, schoolId, selectedYearId ?? undefined),
        classOverviewApi.getKPIs(params),
        studentsByUserApi.getAll(params),
        staffProfilesApi.list({ ...params, per_page: 100 }),
        noticesApi.getAll({ ...params, is_active: true, per_page: 30 }),
        feeCollectionsApi.list({ ...params, per_page: 50 }),
        feeReportsApi.summary(params),
        admissionsApi.statusCounts(params),
        admissionsApi.list({ ...params, per_page: 40 }),
        leaveApplicationsApi.list({ ...params, status: 'pending', per_page: 20 }),
        eventsApi.list({ ...params, per_page: 20 }),
        booksApi.list({ ...params, per_page: 40 }),
        vehiclesApi.list({ ...params, per_page: 40 }),
        routesApi.list({ ...params, per_page: 40 }),
        hostelRoomsApi.list({ ...params, per_page: 40 }),
        inventoryItemsApi.list({ ...params, per_page: 40 }),
        holidaysApi.list({ ...params, per_page: 50 }),
      ]);

      const dash = settledValue(results[0], null);
      const classKpis = settledValue(results[1], null);
      const studentsRaw = settledValue(results[2], null);
      const staffRaw = settledValue(results[3], null);
      const noticesRaw = settledValue(results[4], null);
      const feesRaw = settledValue(results[5], null);
      const feeSummary = settledValue(results[6], null) as Record<string, unknown> | null;
      const admCounts = settledValue(results[7], null) as Record<string, unknown> | null;
      const admList = settledValue(results[8], null);
      const leavesRaw = settledValue(results[9], null);
      const eventsRaw = settledValue(results[10], null);
      const booksRaw = settledValue(results[11], null);
      const vehiclesRaw = settledValue(results[12], null);
      const routesRaw = settledValue(results[13], null);
      const hostelRaw = settledValue(results[14], null);
      const inventoryRaw = settledValue(results[15], null);

      const mappedKpis = mapDashboardKpis(dash, classKpis);
      const studentDir = mapDirectoryPeople(studentsRaw, 'student');
      const staffAll = mapDirectoryPeople(staffRaw, 'staff');
      const teacherDir = staffAll.filter((p) =>
        /teach|instructor|faculty/i.test(`${p.subtitle} ${p.meta}`),
      );
      const feeRecords = mapFeeRecords(feesRaw);
      const announcements = mapAdminAnnouncements(noticesRaw);
      const events = mapAdminEvents(eventsRaw);
      const approvals = mapApprovalsFromLeaves(leavesRaw);

      const collected = pickNumber(
        feeSummary?.collected,
        feeSummary?.total_collected,
        feeRecords.filter((f) => f.status === 'paid').reduce((n, f) => n + f.amount, 0),
      );
      const pending = pickNumber(
        feeSummary?.pending,
        feeSummary?.total_pending,
        feeRecords.filter((f) => f.status === 'pending').reduce((n, f) => n + f.amount, 0),
      );
      const overdue = pickNumber(
        feeSummary?.overdue,
        feeSummary?.total_overdue,
        feeRecords.filter((f) => f.status === 'overdue').reduce((n, f) => n + f.amount, 0),
      );

      const books = safeList<Record<string, unknown>>(booksRaw);
      const vehicles = safeList<Record<string, unknown>>(vehiclesRaw);
      const routesList = safeList<Record<string, unknown>>(routesRaw);
      const hostelRooms = safeList<Record<string, unknown>>(hostelRaw);
      const inventoryItems = safeList<Record<string, unknown>>(inventoryRaw);
      const classRows = safeList<Record<string, unknown>>(classKpis);

      const base = emptyFromMock();
      const profile = mapAdminProfile(
        session,
        selectedYear?.name ?? '',
        '',
      );

      const admissionTotal = pickNumber(
        admCounts?.total,
        admCounts?.enquiry,
        safeList(admList).length,
      );

      setData({
        ...base,
        profile,
        dashboard: {
          ...base.dashboard,
          kpis: mappedKpis.kpis,
          secondaryKpis: [
            ...mappedKpis.secondaryKpis,
            {
              key: 'admissions',
              icon: 'person-add-outline',
              value: String(admissionTotal),
              label: 'Admissions',
              accent: 'orange',
            },
            {
              key: 'fees',
              icon: 'wallet-outline',
              value: formatMoneyLabel(collected),
              label: 'Fees Collected',
              accent: 'green',
            },
          ],
          attendancePulses: [
            { label: 'Students', percent: mappedKpis.attendancePct, accent: 'teal' },
            { label: 'Teachers', percent: 0, accent: 'green' },
          ],
          feeCollection: {
            collected,
            pending,
            overdue,
            totalLabel: formatMoneyLabel(collected + pending + overdue),
          },
          approvals,
          events,
          alerts: [
            {
              id: 'fee-def',
              icon: 'cash-outline',
              accent: 'red',
              count: feeRecords.filter((f) => f.status === 'overdue').length,
              label: 'Fee Defaulters',
            },
            {
              id: 'leave',
              icon: 'document-text-outline',
              accent: 'purple',
              count: approvals[0]?.count ?? 0,
              label: 'Pending Leave',
            },
          ],
          insights: [],
        },
        students: {
          ...base.students,
          kpis: [
            {
              key: 'total',
              icon: 'school-outline',
              value: String(studentDir.length),
              label: 'Students',
              accent: 'teal',
            },
          ],
          recentAdmissions: [],
          atRisk: [],
          byGrade: [],
          enrollmentTrend: [],
        },
        teachers: {
          ...base.teachers,
          directory: teacherDir.length ? teacherDir : staffAll,
          onLeave: [],
          kpis: [
            {
              key: 'total',
              icon: 'people-outline',
              value: String(teacherDir.length || staffAll.length),
              label: 'Teachers / Staff',
              accent: 'blue',
            },
          ],
        },
        staff: {
          kpis: [
            {
              key: 'total',
              icon: 'briefcase-outline',
              value: String(staffAll.length),
              label: 'Staff',
              accent: 'purple',
            },
          ],
          directory: staffAll,
        },
        parents: { kpis: base.parents.kpis.map((k) => ({ ...k, value: '0' })), directory: [] },
        classes: {
          list: classRows.map((r, i) => ({
            id: String(r.class_id ?? r.id ?? i),
            subject: String(r.subject_name ?? r.subject ?? 'General'),
            grade: String(r.class_name ?? r.name ?? `Class ${i + 1}`),
            room: String(r.room_name ?? r.room ?? ''),
            teacher: String(r.teacher_name ?? ''),
            timeLabel: String(r.time_label ?? ''),
            syllabusPercent: pickNumber(r.syllabus_percent, r.completion_pct),
            icon: 'school-outline' as const,
            accent: (['teal', 'blue', 'green', 'orange'] as const)[i % 4],
          })),
          overviewKpis: [
            {
              key: 'classes',
              icon: 'business-outline',
              value: String(classRows.length),
              label: 'Classes',
              accent: 'teal',
            },
          ],
        },
        finance: {
          ...base.finance,
          records: feeRecords,
          transactions: feeRecords.map((f) => ({
            id: f.id,
            name: f.studentName,
            meta: f.grade,
            method: String(f.status),
            amount: f.amount,
            dateLabel: f.dueLabel,
          })),
          kpis: [
            {
              key: 'collected',
              icon: 'wallet-outline',
              value: formatMoneyLabel(collected),
              label: 'Collected',
              accent: 'green',
            },
            {
              key: 'pending',
              icon: 'time-outline',
              value: formatMoneyLabel(pending),
              label: 'Pending',
              accent: 'orange',
            },
            {
              key: 'overdue',
              icon: 'alert-circle-outline',
              value: formatMoneyLabel(overdue),
              label: 'Overdue',
              accent: 'red',
            },
          ],
        },
        admissions: {
          ...base.admissions,
          applications: safeList<Record<string, unknown>>(admList).map((a, i) => ({
            id: String(a.id ?? i),
            applicantName: String(a.student_name ?? a.applicant_name ?? a.name ?? 'Applicant'),
            grade: String(a.class_name ?? a.grade ?? ''),
            appliedOn: String(a.created_at ?? a.enquiry_date ?? a.applied_on ?? ''),
            guardian: String(a.guardian_name ?? a.parent_name ?? ''),
            status: (['new', 'review', 'approved', 'rejected', 'waitlist'].includes(
              String(a.status ?? 'new').toLowerCase(),
            )
              ? String(a.status ?? 'new').toLowerCase()
              : 'new') as 'new' | 'review' | 'approved' | 'rejected' | 'waitlist',
          })),
          workflow: [],
          kpis: [
            {
              key: 'total',
              icon: 'person-add-outline',
              value: String(admissionTotal),
              label: 'Applications',
              accent: 'teal',
            },
          ],
        },
        attendance: {
          ...base.attendance,
          kpis: [
            {
              key: 'today',
              icon: 'stats-chart-outline',
              value: `${Math.round(mappedKpis.attendancePct)}%`,
              label: 'Today',
              accent: 'green',
            },
          ],
        },
        operations: {
          ...base.operations,
          bookCatalog: books.map((b, i) => ({
            id: String(b.id ?? i),
            title: String(b.title ?? b.name ?? 'Book'),
            subtitle: String(b.author ?? ''),
            value: String(b.status ?? 'available'),
            icon: 'book-outline' as const,
            accent: (['teal', 'blue', 'green'] as const)[i % 3],
          })),
          bookKpis: [
            {
              key: 'books',
              icon: 'library-outline',
              value: String(books.length),
              label: 'Books',
              accent: 'teal',
            },
          ],
          libraryKpis: [
            {
              key: 'books',
              icon: 'library-outline',
              value: String(books.length),
              label: 'Catalog',
              accent: 'teal',
            },
          ],
          vehicles: vehicles.map((v, i) => ({
            id: String(v.id ?? i),
            title: String(v.vehicle_number ?? v.name ?? `Vehicle ${i + 1}`),
            subtitle: String(v.vehicle_type ?? v.type ?? ''),
            value: String(v.status ?? 'active'),
            icon: 'bus-outline' as const,
            accent: (['teal', 'blue'] as const)[i % 2],
          })),
          routes: routesList.map((r, i) => ({
            id: String(r.id ?? i),
            title: String(r.name ?? r.route_name ?? `Route ${i + 1}`),
            subtitle: String(r.description ?? r.start_point ?? ''),
            value: String(r.status ?? ''),
            icon: 'map-outline' as const,
            accent: 'orange' as const,
          })),
          vehicleKpis: [
            {
              key: 'vehicles',
              icon: 'bus-outline',
              value: String(vehicles.length),
              label: 'Vehicles',
              accent: 'blue',
            },
          ],
          transportKpis: [
            {
              key: 'routes',
              icon: 'map-outline',
              value: String(routesList.length),
              label: 'Routes',
              accent: 'orange',
            },
          ],
          transportRoutes: routesList.slice(0, 5).map((r, i) => ({
            id: String(r.id ?? i),
            title: String(r.name ?? r.route_name ?? `Route ${i + 1}`),
            subtitle: String(r.description ?? ''),
            value: String(r.student_count ?? ''),
            icon: 'map-outline' as const,
            accent: 'orange' as const,
          })),
          hostelRooms: hostelRooms.map((r, i) => ({
            id: String(r.id ?? i),
            title: String(r.room_number ?? r.name ?? `Room ${i + 1}`),
            subtitle: String(r.block ?? r.building ?? ''),
            value: String(r.status ?? ''),
            icon: 'bed-outline' as const,
            accent: 'purple' as const,
          })),
          hostelKpis: [
            {
              key: 'rooms',
              icon: 'bed-outline',
              value: String(hostelRooms.length),
              label: 'Rooms',
              accent: 'purple',
            },
          ],
          inventoryItems: inventoryItems.map((it, i) => ({
            id: String(it.id ?? i),
            title: String(it.name ?? it.item_name ?? `Item ${i + 1}`),
            subtitle: String(it.category ?? ''),
            value: String(it.quantity ?? it.stock ?? ''),
            icon: 'cube-outline' as const,
            accent: 'teal' as const,
          })),
          inventoryKpis: [
            {
              key: 'items',
              icon: 'cube-outline',
              value: String(inventoryItems.length),
              label: 'Items',
              accent: 'teal',
            },
          ],
        },
        announcements,
        notifications: announcements.slice(0, 10).map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          timeLabel: a.dateLabel,
          icon: a.icon,
          accent: a.accent,
          read: !a.pinned,
        })),
        academics: {
          ...base.academics,
          topClasses: classRows.slice(0, 8).map((r, i) => ({
            id: String(r.class_id ?? i),
            rank: i + 1,
            label: String(r.class_name ?? `Class ${i + 1}`),
            value: `${pickNumber(r.student_count)} students`,
            trend: { direction: 'flat' as const, label: '' },
          })),
        },
      });
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
      setData(emptyFromMock());
    }
  }, [session, selectedYearId, selectedYear?.name]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({
      ...data,
      status,
      error,
      refetch: load,
    }),
    [data, status, error, load],
  );
}
