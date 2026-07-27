/**
 * useStudentData — single read seam for Student screens.
 * Live ERP APIs by default; mocks when USE_MOCK_DATA is true.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  assignmentsApi,
  attendanceRecordsApi,
  booksApi,
  eventsApi,
  examAllItemsApi,
  libraryTransactionsApi,
  noticesApi,
  studentsByUserApi,
  studentFeesApi,
  timetableSlotsApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import {
  emptyOverview,
  emptyStudentProfile,
  mapAssignments,
  mapAttendanceRecords,
  mapAttendanceSummary,
  mapEvents,
  mapExamSchedule,
  mapFees,
  mapLibraryBooks,
  mapLibraryIssued,
  mapNotices,
  mapNoticesToAnnouncements,
  mapRosterToProfile,
  mapSubjectPerformance,
  mapTimetableSlotsToSchedule,
  mapTimetableWeek,
} from '../mappers/student';
import * as mock from '../data/student';
import type { SubjectMark, StudentAssignment, StudentProfile } from '../types/student';
import {
  extractErrorMessage,
  settledValue,
  startOfAcademicWindow,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

function mockStudentPayload() {
  return {
    profile: mock.studentProfile,
    academicYears: mock.academicYears,
    overview: mock.studentOverview,
    schedule: mock.todaysSchedule,
    announcements: mock.studentAnnouncements,
    attendance: {
      buckets: mock.attendanceBuckets,
      trend: mock.attendanceTrend,
      recent: mock.recentAttendance,
      overallPercent: mock.attendanceOverallPercent,
    },
    academics: {
      summary: mock.academicSummary,
      subjects: mock.subjectMarks,
      distribution: mock.marksDistribution,
      termComparison: mock.termComparison,
      detailedReportSummary: mock.detailedReportSummary,
      assessmentBreakdown: mock.assessmentBreakdown,
      assessmentDetails: mock.assessmentDetails,
    },
    assignments: {
      stats: mock.assignmentStats,
      list: mock.studentAssignments,
      performanceStats: mock.performanceStats,
      performanceDistribution: mock.performanceDistribution,
      subjectPerformance: mock.subjectPerformance,
    },
    timetable: {
      week: mock.timetableWeek,
      timing: mock.schoolTiming,
    },
    exams: {
      schedule: mock.examSchedule,
      resultsSummary: mock.examResultsSummary,
      results: mock.examResults,
    },
    fees: {
      summary: mock.feeSummary,
      installments: mock.feeInstallments,
      payments: mock.feePayments,
      breakup: mock.feeBreakup,
    },
    library: {
      categories: mock.libraryCategories,
      recommended: mock.recommendedBooks,
      ebooks: mock.ebooks,
      issued: mock.issuedBooks,
    },
    notices: mock.studentNotices,
    events: { upcoming: mock.studentEvents, recent: mock.recentEvents },
    notifications: mock.studentNotifications,
  };
}

type StudentPayload = ReturnType<typeof mockStudentPayload>;

function emptyPayload(displayName: string, yearNames: string[]): StudentPayload {
  const profile = emptyStudentProfile(displayName);
  return {
    profile,
    academicYears: yearNames,
    overview: emptyOverview(),
    schedule: [],
    announcements: [],
    attendance: { buckets: [], trend: [], recent: [], overallPercent: 0 },
    academics: {
      summary: {
        overallAverage: 0,
        rank: 0,
        classStrength: 0,
        subjects: 0,
        improvement: 0,
      },
      subjects: [],
      distribution: [],
      termComparison: [],
      detailedReportSummary: {
        totalMarks: 0,
        outOf: 0,
        percentage: 0,
        grade: '',
        classAverage: 0,
        highestInClass: 0,
      },
      assessmentBreakdown: [],
      assessmentDetails: [],
    },
    assignments: {
      stats: { total: 0, submitted: 0, pending: 0, overdue: 0 },
      list: [],
      performanceStats: { total: 0, submitted: 0, graded: 0, averageScore: 0 },
      performanceDistribution: [],
      subjectPerformance: [],
    },
    timetable: { week: [], timing: { range: '', totalPeriods: 0 } },
    exams: {
      schedule: [],
      resultsSummary: {
        examName: '',
        overallPercent: 0,
        grade: '',
        rank: 0,
        classStrength: 0,
      },
      results: [],
    },
    fees: {
      summary: { total: 0, paid: 0, due: 0, balancePercent: 0 },
      installments: [],
      payments: [],
      breakup: [],
    },
    library: { categories: [], recommended: [], ebooks: [], issued: [] },
    notices: [],
    events: { upcoming: [], recent: [] },
    notifications: [],
  };
}

export function useStudentData() {
  const session = useSchoolsSession();
  const { selectedYearId, academicYears, selectedYear } = useAcademicYear();
  const yearNamesKey = academicYears.map((y) => y.name).join('|');

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudentPayload>(() =>
    USE_MOCK_DATA ? mockStudentPayload() : emptyPayload(session.displayName, []),
  );

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setData(mockStudentPayload());
      setStatus('ready');
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);

    const schoolId = session.schoolId ?? undefined;
    const dateFrom = startOfAcademicWindow(10);
    const dateTo = toLocalDateStr();
    const yearName = selectedYear?.name ?? '';
    const years = yearNamesKey ? yearNamesKey.split('|') : [];

    try {
      const baseParams: Record<string, unknown> = { per_page: 100 };
      if (schoolId) baseParams.school_id = schoolId;

      const rosterParams: Record<string, unknown> = { ...baseParams };
      if (selectedYearId) rosterParams.academic_year_id = selectedYearId;

      const results = await Promise.allSettled([
        studentsByUserApi.getAll(rosterParams),
        attendanceRecordsApi.mySummary({
          date_from: dateFrom,
          date_to: dateTo,
          school_id: schoolId,
        }),
        attendanceRecordsApi.getAll({
          ...baseParams,
          date_from: dateFrom,
          date_to: dateTo,
          per_page: 5000,
          ...(session.userId ? { student_id: session.userId } : {}),
        }),
        noticesApi.getAll({ ...baseParams, is_active: true, per_page: 30 }),
        timetableSlotsApi.list({ ...baseParams, per_page: 200 }),
        examAllItemsApi.mySchedule({ school_id: schoolId }),
        examAllItemsApi.mySubjectPerformance({ school_id: schoolId }),
        assignmentsApi.list({ ...baseParams, per_page: 50 }),
        studentFeesApi.myPayments({
          school_id: schoolId,
          academic_year_id: selectedYearId ?? undefined,
        }),
        libraryTransactionsApi.list({
          ...baseParams,
          ...(session.userId ? { student_id: session.userId } : {}),
        }),
        booksApi.list({ ...baseParams, per_page: 40 }),
        eventsApi.list({ ...baseParams, per_page: 30 }),
      ]);

      const roster = settledValue(results[0], null);
      const attSummaryRaw = settledValue(results[1], null);
      const attRecordsRaw = settledValue(results[2], null);
      const noticesRaw = settledValue(results[3], null);
      const slotsRaw = settledValue(results[4], null);
      const examSchedRaw = settledValue(results[5], null);
      const perfRaw = settledValue(results[6], null);
      const asgRaw = settledValue(results[7], null);
      const feesRaw = settledValue(results[8], null);
      const libTxnRaw = settledValue(results[9], null);
      const booksRaw = settledValue(results[10], null);
      const eventsRaw = settledValue(results[11], null);

      const att = mapAttendanceSummary(attSummaryRaw);
      const recent = mapAttendanceRecords(attRecordsRaw);
      const perf = mapSubjectPerformance(perfRaw);
      const asg = mapAssignments(asgRaw);
      const fees = mapFees(feesRaw);
      const schedule = mapTimetableSlotsToSchedule(slotsRaw);
      const week = mapTimetableWeek(slotsRaw);
      const examSchedule = mapExamSchedule(examSchedRaw);
      const notices = mapNotices(noticesRaw);
      const announcements = mapNoticesToAnnouncements(noticesRaw);
      const eventsAll = mapEvents(eventsRaw);
      const books = mapLibraryBooks(booksRaw);
      const issued = mapLibraryIssued(libTxnRaw);

      const profile = mapRosterToProfile(
        roster,
        {
          displayName: session.displayName,
          email: session.email,
          userId: session.userId,
        },
        yearName,
        att.overallPercent,
        perf.averageMarks,
      );

      const overview = {
        attendancePercent: att.overallPercent || profile.attendancePercent,
        averageMarks: perf.averageMarks || profile.averageMarks,
        classRank: profile.classRank,
        totalAssignments: asg.stats.total,
        pendingAssignments: asg.stats.pending,
      };

      const enrichedProfile: StudentProfile = {
        ...profile,
        attendancePercent: overview.attendancePercent,
        averageMarks: overview.averageMarks,
      };

      // Month trend from records (simple bucket by month)
      const trendMap = new Map<string, { present: number; total: number }>();
      recent.forEach((r) => {
        const key = r.month || '—';
        const cur = trendMap.get(key) ?? { present: 0, total: 0 };
        cur.total += 1;
        if (r.status === 'present') cur.present += 1;
        trendMap.set(key, cur);
      });
      const trend = Array.from(trendMap.entries()).map(([label, v]) => ({
        label,
        percent: v.total ? Math.round((v.present / v.total) * 100) : 0,
      }));

      const categoryMap = new Map<string, number>();
      books.forEach((b) => {
        categoryMap.set(b.category, (categoryMap.get(b.category) ?? 0) + 1);
      });
      const categories = Array.from(categoryMap.entries()).map(([label, count], i) => ({
        id: `cat-${i}`,
        label,
        icon: 'library-outline',
        accent: (['teal', 'blue', 'green', 'orange', 'purple'] as const)[i % 5],
        count,
      }));

      const next: StudentPayload = {
        profile: enrichedProfile,
        academicYears: years.length ? years : yearName ? [yearName] : [],
        overview,
        schedule,
        announcements,
        attendance: {
          buckets: att.buckets,
          trend,
          recent,
          overallPercent: att.overallPercent,
        },
        academics: {
          summary: {
            overallAverage: overview.averageMarks,
            rank: overview.classRank,
            classStrength: enrichedProfile.classStrength,
            subjects: perf.subjects.length,
            improvement: 0,
          },
          subjects: perf.subjects,
          distribution: [],
          termComparison: [],
          detailedReportSummary: {
            totalMarks: Math.round(overview.averageMarks),
            outOf: 100,
            percentage: overview.averageMarks,
            grade: perf.subjects[0]?.grade ?? '',
            classAverage: 0,
            highestInClass: 0,
          },
          assessmentBreakdown: [],
          assessmentDetails: perf.results.map((r) => ({
            id: r.id,
            title: r.subject,
            type: 'Exam',
            icon: r.icon,
            accent: r.accent,
            obtained: r.obtained,
            maxMarks: r.maxMarks,
            percent: r.percent,
            grade: r.grade,
          })),
        },
        assignments: {
          stats: asg.stats,
          list: asg.list,
          performanceStats: {
            total: asg.stats.total,
            submitted: asg.stats.submitted,
            graded: asg.list.filter((x) => x.status === 'graded').length,
            averageScore: 0,
          },
          performanceDistribution: [],
          subjectPerformance: [],
        },
        timetable: {
          week,
          timing: {
            range: week.flatMap((d) => d.slots).length
              ? `${week[0]?.slots[0]?.startTime ?? ''} – ${week[0]?.slots[week[0].slots.length - 1]?.endTime ?? ''}`
              : '',
            totalPeriods: week.reduce((n, d) => n + d.slots.filter((s) => s.kind === 'period').length, 0),
          },
        },
        exams: {
          schedule: examSchedule,
          resultsSummary: {
            examName: 'Subject Performance',
            overallPercent: overview.averageMarks,
            grade: perf.subjects[0]?.grade ?? '',
            rank: overview.classRank,
            classStrength: enrichedProfile.classStrength,
          },
          results: perf.results,
        },
        fees,
        library: {
          categories,
          recommended: books.slice(0, 8),
          ebooks: books.filter((b) => b.isEbook),
          issued,
        },
        notices,
        events: {
          upcoming: eventsAll.filter((e) => !e.completed),
          recent: eventsAll.filter((e) => e.completed),
        },
        notifications: announcements.map((a, i) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          timeLabel: a.date,
          icon: 'notifications-outline',
          accent: (['teal', 'blue', 'orange'] as const)[i % 3],
          read: !a.isNew,
        })),
      };

      setData(next);
      setStatus('ready');

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length === results.length) {
        setError('Unable to load school data. Pull to refresh or try again.');
        setStatus('error');
      }
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
      setData(emptyPayload(session.displayName, years));
    }
  }, [
    session.displayName,
    session.email,
    session.schoolId,
    session.userId,
    selectedYearId,
    selectedYear?.name,
    yearNamesKey,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const getSubjectById = useCallback(
    (subjectId?: string): SubjectMark | undefined => {
      if (!data.academics.subjects.length) return undefined;
      if (!subjectId) return data.academics.subjects[0];
      return (
        data.academics.subjects.find((s) => s.id === subjectId) ?? data.academics.subjects[0]
      );
    },
    [data.academics.subjects],
  );

  const getAssignmentById = useCallback(
    (assignmentId?: string): StudentAssignment | undefined => {
      if (!data.assignments.list.length) return undefined;
      if (!assignmentId) return data.assignments.list[0];
      return (
        data.assignments.list.find((a) => a.id === assignmentId) ?? data.assignments.list[0]
      );
    },
    [data.assignments.list],
  );

  return useMemo(
    () => ({
      ...data,
      status,
      error,
      refetch: load,
      getSubjectById,
      getAssignmentById,
    }),
    [data, status, error, load, getSubjectById, getAssignmentById],
  );
}
