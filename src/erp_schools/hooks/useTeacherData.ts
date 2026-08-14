/**
 * useTeacherData — live ERP seam for Teacher screens.
 * Teacher Home mirrors web ERPDashboardTab instructor path (source of truth).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  assignmentsApi,
  attendanceRecordsApi,
  classOverviewApi,
  erpDashboardApi,
  feeReportsApi,
  noticesApi,
  studentFeeAssignmentsApi,
  studentsByUserApi,
  timetableSlotsApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import {
  classesSummary as mockSummary,
  dashboardOverview as mockOverview,
  recentAnnouncements as mockAnnouncements,
  rosterByClass as mockRosterByClass,
  teacherClasses as mockClasses,
  todaysSchedule as mockSchedule,
  allStudents as mockStudents,
} from '../data';
import {
  collectTeacherClassIds,
  computeClassOverviewKpis,
  computeTeacherAttendanceMetrics,
  mapTeacherAnnouncements,
  mapTeacherClasses,
  mapTeacherSchedule,
  mapTeacherStudents,
  pickOutstandingDues,
  webApiDayOfWeek,
} from '../mappers/teacher';
import type { ClassInfo, ClassOverviewKpis, Notice, StudentInfo } from '../types/domain';
import {
  extractErrorMessage,
  formatDisplayDate,
  pickNumber,
  pickString,
  safeList,
  settledValue,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

type TeacherPayload = {
  classes: ClassInfo[];
  classesSummary: {
    classesAssigned: number;
    totalStudents: number;
    subjectsTeaching: number;
    weeklyPeriods: number;
  };
  students: StudentInfo[];
  schedule: ReturnType<typeof mapTeacherSchedule>;
  announcements: ReturnType<typeof mapTeacherAnnouncements>;
  notices: Notice[];
  overview: {
    students: number;
    classes: number;
    assignments: number;
    avgAttendance: number | null;
    /** Web overallPct — used in “Today at a glance”. */
    todayAttendance: number | null;
    /** Web avgAttPct — Attendance Overview “Avg. Att.”. */
    avgAttPct: number | null;
    todayClasses: number;
    feesOverdue: number;
  };
  rosterByClass: Record<string, StudentInfo[]>;
};

function mapNoticesList(raw: unknown): Notice[] {
  return safeList<Record<string, unknown>>(raw).map((n, i) => {
    const scopeRaw = pickString(n.target_audience, n.scope).toLowerCase();
    const scope: Notice['scope'] = scopeRaw.includes('class')
      ? 'class'
      : scopeRaw.includes('group')
        ? 'group'
        : 'school';
    const category = pickString(n.category, 'general').toLowerCase() || 'general';
    const publish = pickString(n.publish_date, n.created_at, n.date);
    const noticeId = pickNumber(n.id, i + 1);
    return {
      id: String(noticeId || `notice-${i}`),
      noticeId,
      scope,
      category,
      title: pickString(n.title, n.subject, 'Notice'),
      body: pickString(n.content, n.body, n.description),
      date: formatDisplayDate(publish || null),
      publishDate: publish.slice(0, 10) || undefined,
      expiryDate: pickString(n.expiry_date).slice(0, 10) || undefined,
      author: pickString(n.author_name, n.created_by_name, 'School'),
      audience: category,
      pinned: Boolean(n.is_pinned),
      scheduled: Boolean(n.is_scheduled),
      isActive: n.is_active !== false,
    };
  });
}

function mockPayload(): TeacherPayload {
  return {
    classes: mockClasses,
    classesSummary: mockSummary,
    students: mockStudents,
    schedule: mockSchedule,
    announcements: mockAnnouncements,
    notices: [],
    overview: mockOverview,
    rosterByClass: mockRosterByClass,
  };
}

function emptyPayload(): TeacherPayload {
  return {
    classes: [],
    classesSummary: {
      classesAssigned: 0,
      totalStudents: 0,
      subjectsTeaching: 0,
      weeklyPeriods: 0,
    },
    students: [],
    schedule: [],
    announcements: [],
    notices: [],
    overview: {
      students: 0,
      classes: 0,
      assignments: 0,
      avgAttendance: null,
      todayAttendance: null,
      avgAttPct: null,
      todayClasses: 0,
      feesOverdue: 0,
    },
    rosterByClass: {},
  };
}

function unwrapDashKpis(dash: unknown): Record<string, unknown> | null {
  if (!dash || typeof dash !== 'object') return null;
  let obj = dash as Record<string, unknown>;
  // Some clients wrap payload as { data: { kpis, attendance_trend } }
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    const inner = obj.data as Record<string, unknown>;
    if (inner.kpis != null || inner.attendance_trend != null) obj = inner;
  }
  if (obj.kpis && typeof obj.kpis === 'object') return obj.kpis as Record<string, unknown>;
  return obj;
}

function unwrapDashTrend(dash: unknown): unknown {
  if (!dash || typeof dash !== 'object') return null;
  let obj = dash as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    const inner = obj.data as Record<string, unknown>;
    if (
      inner.kpis != null ||
      inner.attendance_trend != null ||
      inner.attendanceTrend != null
    ) {
      obj = inner;
    }
  }
  return obj.attendance_trend ?? obj.attendanceTrend ?? null;
}

export function useTeacherData() {
  const session = useSchoolsSession();
  const { selectedYearId } = useAcademicYear();
  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TeacherPayload>(() =>
    USE_MOCK_DATA ? mockPayload() : emptyPayload(),
  );

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setData(mockPayload());
      setStatus('ready');
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);
    const schoolId = session.schoolId ?? undefined;
    const academicYearId = selectedYearId ?? undefined;
    const teacherUserId = session.userId ?? undefined;
    const apiDow = webApiDayOfWeek();
    const today = toLocalDateStr();
    const trendFromDate = new Date();
    trendFromDate.setDate(trendFromDate.getDate() - 6);
    const trendFrom = toLocalDateStr(trendFromDate);

    const yearParams: Record<string, string | number> = { per_page: 200 };
    if (schoolId) yearParams.school_id = schoolId;
    if (academicYearId) yearParams.academic_year_id = academicYearId;

    try {
      // Same Promise set as web ERPDashboardTab instructor path
      const [
        dashResult,
        classKpiResult,
        noticeResult,
        classOverviewResult,
        scheduleResult,
        slotsFallback,
        attFallback,
        asgResult,
        rosterResult,
      ] = await Promise.allSettled([
        erpDashboardApi.get(7, schoolId, academicYearId),
        classOverviewApi.getKPIs(yearParams),
        noticesApi.getAll({
          school_id: schoolId,
          per_page: 20,
          is_active: true,
          ...(academicYearId ? { academic_year_id: academicYearId } : {}),
        }),
        classOverviewApi.getAll(yearParams),
        timetableSlotsApi.myTeacherTimetable(schoolId),
        teacherUserId != null
          ? timetableSlotsApi.list({
              school_id: schoolId,
              teacher_id: teacherUserId,
              day_of_week: apiDow,
              is_active: true,
              per_page: 100,
            })
          : Promise.resolve({ items: [] }),
        attendanceRecordsApi.getAll({
          school_id: schoolId,
          date_from: trendFrom,
          date_to: today,
          per_page: 10000,
        }),
        assignmentsApi.list({ ...yearParams, per_page: 50 }),
        studentsByUserApi.getAll(yearParams),
      ]);

      const dashRaw = settledValue(dashResult, null);
      const kpiRaw = settledValue(classKpiResult, null);
      const noticesRaw = settledValue(noticeResult, null);
      const overviewRaw = settledValue(classOverviewResult, kpiRaw);
      const scheduleRaw = settledValue(scheduleResult, null);
      const slotsRaw = settledValue(slotsFallback, null);
      const attRaw = settledValue(attFallback, null);
      const asgRaw = settledValue(asgResult, null);
      const rosterRaw = settledValue(rosterResult, null);

      const teacherClassIds = collectTeacherClassIds(overviewRaw, teacherUserId);
      if (teacherClassIds.length === 0) {
        safeList<Record<string, unknown>>(kpiRaw).forEach((c) => {
          const cid = pickNumber(c.class_id);
          if (cid) teacherClassIds.push(cid);
        });
      }
      const uniqueClassIds = [...new Set(teacherClassIds)];

      // Outstanding dues + fee summary (web instructor follow-ups)
      let duesRaw: unknown = null;
      let feeSummaryRaw: unknown = null;
      try {
        duesRaw = await feeReportsApi.outstandingDues({
          school_id: schoolId,
          class_ids: uniqueClassIds.length > 0 ? uniqueClassIds.join(',') : undefined,
          ...(academicYearId ? { academic_year_id: academicYearId } : {}),
        });
      } catch {
        duesRaw = null;
      }
      try {
        const [kpiData, assignData] = await Promise.all([
          feeReportsApi.summary({ school_id: schoolId }).catch(() => null),
          studentFeeAssignmentsApi
            .list({
              school_id: schoolId,
              academic_year_id: academicYearId,
              per_page: 200,
            })
            .catch(() => null),
        ]);
        feeSummaryRaw = kpiData;
        if (
          kpiData &&
          typeof kpiData === 'object' &&
          pickNumber((kpiData as Record<string, unknown>).total_due) === 0 &&
          assignData
        ) {
          let items = safeList<Record<string, unknown>>(assignData);
          if (uniqueClassIds.length > 0) {
            const idSet = new Set(uniqueClassIds);
            const scoped = items.filter(
              (a) => a.class_id != null && idSet.has(Number(a.class_id)),
            );
            if (scoped.length > 0) items = scoped;
          }
          const assignDue = items.reduce(
            (sum, a) => sum + pickNumber(a.total_fee),
            0,
          );
          if (assignDue > 0) {
            const collected = pickNumber(
              (kpiData as Record<string, unknown>).total_collected,
            );
            feeSummaryRaw = {
              ...(kpiData as Record<string, unknown>),
              total_due: assignDue,
              total_pending: Math.max(assignDue - collected, 0),
            };
          }
        }
      } catch {
        feeSummaryRaw = null;
      }

      const students = mapTeacherStudents(rosterRaw);
      // Weekly grid (all days) vs today's periods (must match today's day_of_week).
      const mineSlots = safeList(scheduleRaw);
      const todayListSlots = safeList(slotsRaw);
      const weekSlots = mineSlots.length > 0 ? mineSlots : todayListSlots;
      const mapped = mapTeacherClasses(overviewRaw ?? kpiRaw, {
        teacherUserId: teacherUserId ?? null,
        students,
        timetableSlots: weekSlots,
      });
      const kpiMapped = mapTeacherClasses(kpiRaw, {
        students,
        timetableSlots: weekSlots,
      });
      const classes =
        mapped.classes.length > 0 ? mapped.classes : kpiMapped.classes;
      const classesSummary =
        mapped.classes.length > 0 ? mapped.summary : kpiMapped.summary;

      // teacher-timetable is the full week. Only keep rows for today's weekday.
      // If none match, use slots?day_of_week=today (already scoped to this teacher).
      const todayFromWeek = mapTeacherSchedule(mineSlots, { apiDow, strictToday: true });
      const todayFromList = mapTeacherSchedule(todayListSlots, { assumeToday: true });
      const schedule =
        todayFromWeek.length > 0 ? todayFromWeek : todayFromList;
      const announcements = mapTeacherAnnouncements(noticesRaw);
      const notices = mapNoticesList(noticesRaw);
      const asgItems = safeList(asgRaw);

      const rosterByClass: Record<string, StudentInfo[]> = {};
      students.forEach((s) => {
        const key = s.classCode || 'all';
        rosterByClass[key] = rosterByClass[key] ?? [];
        rosterByClass[key].push(s);
      });

      const dashKpis = unwrapDashKpis(dashRaw);
      const dashTrend = unwrapDashTrend(dashRaw);
      // Prefer Class Overview KPI math (distinct class/section + distinct students)
      const classesCount =
        classesSummary.classesAssigned ||
        pickNumber(dashKpis?.total_classes) ||
        classes.length;
      const studentsCount =
        classesSummary.totalStudents ||
        pickNumber(dashKpis?.active_students, dashKpis?.total_students) ||
        students.length;

      const attMetrics = computeTeacherAttendanceMetrics(
        dashKpis,
        dashTrend,
        attRaw,
        uniqueClassIds,
      );

      if (__DEV__) {
        console.log('[TeacherHome] Student Att. %', {
          schoolId,
          academicYearId,
          kpiTodayPct: dashKpis?.today_attendance_pct,
          overallPct: attMetrics.overallPct,
          avgAttPct: attMetrics.avgAttPct,
          kpiPct: attMetrics.kpiPct,
          recordCount: safeList(attRaw).length,
          teacherClassIds: uniqueClassIds,
        });
      }

      setData({
        classes,
        classesSummary: {
          ...classesSummary,
          classesAssigned: classesCount,
          totalStudents: studentsCount,
        },
        students,
        schedule,
        announcements,
        notices,
        overview: {
          students: studentsCount,
          classes: classesCount,
          assignments: asgItems.length,
          avgAttendance: attMetrics.kpiPct,
          todayAttendance: attMetrics.overallPct,
          avgAttPct: attMetrics.avgAttPct,
          todayClasses: schedule.length,
          feesOverdue: pickOutstandingDues(duesRaw, feeSummaryRaw),
        },
        rosterByClass,
      });
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
      setData(emptyPayload());
    }
  }, [session.schoolId, session.userId, selectedYearId]);

  useEffect(() => {
    void load();
  }, [load]);

  const getClassById = useCallback(
    (classId?: string): ClassInfo | undefined => {
      if (!data.classes.length) return undefined;
      if (!classId) return data.classes[0];
      return data.classes.find((c) => c.id === classId) ?? data.classes[0];
    },
    [data.classes],
  );

  const getRoster = useCallback(
    (classCode: string): StudentInfo[] => data.rosterByClass[classCode] ?? data.students,
    [data.rosterByClass, data.students],
  );

  const getStudentById = useCallback(
    (studentId?: string): StudentInfo | undefined => {
      if (!data.students.length) return undefined;
      if (!studentId) return data.students[0];
      return (
        data.students.find((s) => s.id === studentId) ||
        data.students.find((s) => String(s.profileId) === studentId) ||
        data.students.find((s) => String(s.userId) === studentId) ||
        data.students[0]
      );
    },
    [data.students],
  );

  const getOverviewKpis = useCallback(
    (filters?: {
      className?: string;
      sectionName?: string;
      subjectName?: string;
    }): ClassOverviewKpis =>
      computeClassOverviewKpis(
        data.classes,
        data.students,
        filters ?? {},
        true,
      ),
    [data.classes, data.students],
  );

  return useMemo(
    () => ({
      classes: data.classes,
      classesSummary: data.classesSummary,
      students: data.students,
      schedule: data.schedule,
      announcements: data.announcements,
      notices: data.notices,
      overview: data.overview,
      status,
      error,
      refetch: load,
      getClassById,
      getRoster,
      getStudentById,
      getOverviewKpis,
    }),
    [
      data,
      status,
      error,
      load,
      getClassById,
      getRoster,
      getStudentById,
      getOverviewKpis,
    ],
  );
}
