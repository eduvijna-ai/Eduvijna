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
  holidaysApi,
  libraryTransactionsApi,
  lmsEnrollmentsApi,
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
  pickNumber,
  pickString,
  safeList,
  settledValue,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import {
  buildUpcomingEvents,
  computeFeeSummaryFromPayments,
  computeYearAttendanceMetrics,
  formatCurrencyInr,
  formatDateLabel,
  initialsFromName,
  mapEnrolledSubjects,
  resolveAcademicYearAttendancePeriod,
  weeklySchedulePercent,
  ymd,
  type DashboardSubjectCard,
  type UpcomingDashEvent,
} from '../utils/studentDashboardMeta';
import { useSchoolsSession } from './useSchoolsSession';

export type StudentDashboard = {
  classLabel: string;
  studentMeta: string;
  dateLabel: string;
  yearLabel: string;
  schoolName: string;
  initials: string;
  weeklySchedulePct: number;
  subjectCount: number;
  noticeCount: number;
  feeSummary: {
    total: number;
    paid: number;
    due: number;
    nextDueDate: string;
    nextDueLabel: string;
    assignmentCount: number;
    dueLabel: string;
    nextDueDisplay: string;
  };
  attendanceBuckets: {
    present: number;
    absent: number;
    leave: number;
    totalDays: number;
    percentage: number;
    periodLabel: string;
    isFutureYear: boolean;
    markedDays: number;
  };
  subjects: DashboardSubjectCard[];
  overallAvgScore: number | null;
  examScheduleRaw: Record<string, unknown>[];
  holidays: Record<string, unknown>[];
  upcomingEvents: UpcomingDashEvent[];
  examHeadline: { title: string; detail: string } | null;
};

function emptyDashboard(displayName: string, yearLabel = ''): StudentDashboard {
  return {
    classLabel: '',
    studentMeta: '',
    dateLabel: new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    yearLabel,
    schoolName: '',
    initials: initialsFromName(displayName),
    weeklySchedulePct: weeklySchedulePercent(),
    subjectCount: 0,
    noticeCount: 0,
    feeSummary: {
      total: 0,
      paid: 0,
      due: 0,
      nextDueDate: '',
      nextDueLabel: '',
      assignmentCount: 0,
      dueLabel: formatCurrencyInr(0),
      nextDueDisplay: '',
    },
    attendanceBuckets: {
      present: 0,
      absent: 0,
      leave: 0,
      totalDays: 0,
      percentage: 0,
      periodLabel: 'Academic year to date',
      isFutureYear: false,
      markedDays: 0,
    },
    subjects: [],
    overallAvgScore: null,
    examScheduleRaw: [],
    holidays: [],
    upcomingEvents: [],
    examHeadline: null,
  };
}

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
    dashboard: {
      ...emptyDashboard(mock.studentProfile.name, mock.academicYears[0] ?? ''),
      classLabel: mock.studentProfile.className,
      studentMeta: mock.studentProfile.admissionNo
        ? `ADM #${mock.studentProfile.admissionNo}`
        : '',
      initials: initialsFromName(mock.studentProfile.name),
      subjectCount: mock.subjectMarks.length,
      noticeCount: mock.studentNotices.length,
      feeSummary: {
        total: mock.feeSummary.total,
        paid: mock.feeSummary.paid,
        due: mock.feeSummary.due,
        nextDueDate: '',
        nextDueLabel: '',
        assignmentCount: mock.feeInstallments.length,
        dueLabel: formatCurrencyInr(mock.feeSummary.due),
        nextDueDisplay: '',
      },
      attendanceBuckets: {
        present: mock.attendanceOverallPercent,
        absent: 0,
        leave: 0,
        totalDays: 100,
        percentage: mock.attendanceOverallPercent,
        periodLabel: 'Academic year to date',
        isFutureYear: false,
        markedDays: 100,
      },
      subjects: mock.subjectMarks.map((s) => ({
        id: s.id,
        name: s.subject,
        classroomName: s.subject,
        teacher: '',
        classLabel: mock.studentProfile.className,
        percentage: s.percent,
      })),
      overallAvgScore: mock.studentOverview.averageMarks,
    },
  };
}

type StudentPayload = Omit<ReturnType<typeof mockStudentPayload>, 'dashboard'> & {
  dashboard: StudentDashboard;
};

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
    dashboard: emptyDashboard(displayName, yearNames[0] ?? ''),
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
    const todayStr = toLocalDateStr();
    const yearName = selectedYear?.name ?? '';
    const years = yearNamesKey ? yearNamesKey.split('|') : [];
    const period = resolveAcademicYearAttendancePeriod(
      selectedYear?.start_date,
      selectedYear?.end_date,
    );
    const attTo = period.isFutureYear ? period.periodStart : period.periodEnd;
    const holidayYears = new Set<number>([new Date().getFullYear()]);
    if (selectedYear?.start_date) holidayYears.add(Number(selectedYear.start_date.slice(0, 4)));
    if (selectedYear?.end_date) holidayYears.add(Number(selectedYear.end_date.slice(0, 4)));

    try {
      const baseParams: Record<string, unknown> = { per_page: 100 };
      if (schoolId) baseParams.school_id = schoolId;

      const rosterParams: Record<string, unknown> = { ...baseParams };
      if (selectedYearId) rosterParams.academic_year_id = selectedYearId;

      const results = await Promise.allSettled([
        studentsByUserApi.getAll(rosterParams),
        period.isFutureYear
          ? Promise.resolve(null)
          : attendanceRecordsApi.mySummary({
              date_from: period.periodStart,
              date_to: attTo,
              school_id: schoolId,
            }),
        period.isFutureYear
          ? Promise.resolve({ items: [] })
          : attendanceRecordsApi.getAll({
              ...baseParams,
              date_from: period.periodStart,
              date_to: attTo,
              per_page: 5000,
              ...(session.userId ? { student_id: session.userId } : {}),
            }),
        noticesApi.getAll({ ...baseParams, is_active: true, per_page: 30 }),
        timetableSlotsApi.myStudentTimetable(schoolId).catch(() =>
          timetableSlotsApi.list({ ...baseParams, per_page: 200 }),
        ),
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
        Promise.all(
          [...holidayYears].sort().map((year) =>
            holidaysApi.getAll({ school_id: schoolId, year, per_page: 200 }),
          ),
        ),
        lmsEnrollmentsApi.myClassrooms(schoolId),
      ]);

      const roster = settledValue(results[0], null);
      const attSummaryRaw = settledValue(results[1], null);
      const attRecordsRaw = settledValue(results[2], null);
      const noticesRaw = settledValue(results[3], null);
      const slotsRaw = settledValue(results[4], null);
      const examSchedRaw = settledValue(results[5], null);
      const perfRaw = settledValue(results[6], null);
      const asgRaw = settledValue(results[7], null);
      let feesRaw = settledValue(results[8], null);
      const libTxnRaw = settledValue(results[9], null);
      const booksRaw = settledValue(results[10], null);
      const eventsRaw = settledValue(results[11], null);
      const holidaysPages = settledValue(results[12], [] as unknown[]);
      const enrolledRaw = settledValue(results[13], null);

      // Fee fallback without academic_year filter (web parity)
      if (
        feesRaw &&
        safeList((feesRaw as Record<string, unknown>).items ?? feesRaw).length === 0 &&
        selectedYearId
      ) {
        try {
          feesRaw = await studentFeesApi.myPayments({ school_id: schoolId });
        } catch {
          /* keep empty */
        }
      }

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

      const holidayMap = new Map<number, Record<string, unknown>>();
      for (const page of holidaysPages as unknown[]) {
        for (const h of safeList<Record<string, unknown>>(page)) {
          const id = pickNumber(h.id);
          if (id) holidayMap.set(id, h);
        }
      }
      const holidays = [...holidayMap.values()];

      const enrollmentsList = safeList<Record<string, unknown>>(enrolledRaw);
      const perfItems = safeList<Record<string, unknown>>(
        (perfRaw as Record<string, unknown> | null)?.items ?? perfRaw,
      );
      const examItems = safeList<Record<string, unknown>>(
        (examSchedRaw as Record<string, unknown> | null)?.items ?? examSchedRaw,
      );
      const noticeItems = safeList<Record<string, unknown>>(
        (noticesRaw as Record<string, unknown> | null)?.items ?? noticesRaw,
      );
      const attRecords = safeList<Record<string, unknown>>(
        (attRecordsRaw as Record<string, unknown> | null)?.items ?? attRecordsRaw,
      );
      const attSummaryObj = (attSummaryRaw ?? {}) as Record<string, unknown>;

      const subjects = mapEnrolledSubjects(enrollmentsList, perfItems);
      const feeDash = computeFeeSummaryFromPayments(feesRaw);
      const attMetrics = computeYearAttendanceMetrics(
        attRecords,
        selectedYear?.start_date,
        selectedYear?.end_date,
        {
          present: pickNumber(attSummaryObj.present, attSummaryObj.present_days, att.present),
          absent: pickNumber(attSummaryObj.absent, attSummaryObj.absent_days, att.absent),
          late: pickNumber(attSummaryObj.late, attSummaryObj.late_days, att.late),
          excused: pickNumber(attSummaryObj.excused, attSummaryObj.leave, attSummaryObj.on_leave),
          leave: pickNumber(attSummaryObj.leave, attSummaryObj.on_leave),
          total_days: pickNumber(attSummaryObj.total_days, att.total),
        },
      );

      // Class label from roster / enrollments
      let classLabel = '';
      const rosterRows = safeList<Record<string, unknown>>(roster);
      const uid = Number(session.userId);
      const me =
        rosterRows.find((r) => r.user_id != null && Number(r.user_id) === uid) ||
        rosterRows.find((r) => pickString(r.class_name, r.className)) ||
        rosterRows[0];
      if (me) {
        classLabel = [pickString(me.class_name, me.className), pickString(me.section_name, me.section)]
          .filter(Boolean)
          .join(' · ');
      }
      if (!classLabel && enrollmentsList.length > 0) {
        const first = enrollmentsList.find((e) => e.is_active !== false) || enrollmentsList[0];
        classLabel = [
          pickString(first.academic_class_name),
          pickString(first.section_name),
        ]
          .filter(Boolean)
          .join(' · ');
      }

      const studentMetaParts = [
        feeDash.studentName || '',
        feeDash.admissionNumber ? `ADM #${feeDash.admissionNumber}` : '',
      ].filter(Boolean);
      if (!studentMetaParts.length && me) {
        const adm = pickString(me.admission_number, me.admission_no);
        if (adm) studentMetaParts.push(`ADM #${adm}`);
      }
      const studentMeta = studentMetaParts.join(' · ');

      const overallAvgScore =
        perfItems.length > 0
          ? Math.round(
              (perfItems.reduce((acc, p) => acc + pickNumber(p.percentage), 0) / perfItems.length) *
                10,
            ) / 10
          : perf.averageMarks || null;

      const upcomingEvents = buildUpcomingEvents({
        exams: examItems,
        holidays,
        notices: noticeItems,
        todayStr,
      });

      // Next / today exam headline
      let examHeadline: StudentDashboard['examHeadline'] = null;
      const upcomingExams = examItems
        .map((e) => ({ e, d: ymd(pickString(e.exam_date)) }))
        .filter((x) => x.d && x.d >= todayStr)
        .sort((a, b) => a.d.localeCompare(b.d));
      if (upcomingExams.length) {
        const { e, d } = upcomingExams[0];
        const isToday = d === todayStr;
        examHeadline = {
          title: isToday
            ? `Today · ${pickString(e.subject_name, e.exam_name, 'Exam')}`
            : `Next · ${pickString(e.subject_name, e.exam_name, 'Exam')}`,
          detail: [
            formatDateLabel(d),
            pickString(e.start_time) ? String(e.start_time).slice(0, 5) : '',
            pickString(e.room_no) ? `Room ${pickString(e.room_no)}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
        };
      }

      const profile = mapRosterToProfile(
        roster,
        {
          displayName: session.displayName,
          email: session.email,
          userId: session.userId,
        },
        yearName,
        attMetrics.percentage || att.overallPercent,
        overallAvgScore ?? perf.averageMarks,
      );

      const overview = {
        attendancePercent: attMetrics.percentage || att.overallPercent || profile.attendancePercent,
        averageMarks: overallAvgScore ?? (perf.averageMarks || profile.averageMarks),
        classRank: profile.classRank,
        totalAssignments: asg.stats.total,
        pendingAssignments: asg.stats.pending,
      };

      const enrichedProfile: StudentProfile = {
        ...profile,
        attendancePercent: overview.attendancePercent,
        averageMarks: overview.averageMarks,
        className: classLabel
          ? classLabel.startsWith('Class')
            ? classLabel
            : `Class ${classLabel}`
          : profile.className,
        admissionNo: feeDash.admissionNumber || profile.admissionNo,
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

      // Prefer feeDash rollup for fees summary when richer
      const feesMerged =
        feeDash.assignmentCount > 0
          ? {
              ...fees,
              summary: {
                total: feeDash.total || fees.summary.total,
                paid: feeDash.paid || fees.summary.paid,
                due: feeDash.due || fees.summary.due,
                balancePercent:
                  feeDash.total > 0
                    ? Math.round((feeDash.paid / feeDash.total) * 100)
                    : fees.summary.balancePercent,
              },
            }
          : fees;

      const dashboard: StudentDashboard = {
        classLabel: classLabel || enrichedProfile.className.replace(/^Class\s+/i, ''),
        studentMeta,
        dateLabel: new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        yearLabel: yearName,
        schoolName: '',
        initials: initialsFromName(enrichedProfile.name || session.displayName),
        weeklySchedulePct: weeklySchedulePercent(),
        subjectCount: subjects.length,
        noticeCount: notices.length,
        feeSummary: {
          ...feeDash,
          dueLabel: formatCurrencyInr(feeDash.due),
          nextDueDisplay: feeDash.nextDueDate
            ? `${feeDash.nextDueLabel} · ${formatDateLabel(feeDash.nextDueDate)}`
            : feeDash.assignmentCount > 0
              ? `Total ${formatCurrencyInr(feeDash.total)} · Paid ${formatCurrencyInr(feeDash.paid)}`
              : 'No fee assignments found for your account.',
        },
        attendanceBuckets: {
          present: attMetrics.present,
          absent: attMetrics.absent,
          leave: attMetrics.leave,
          totalDays: attMetrics.calendarTotalDays || attMetrics.totalDays,
          percentage: attMetrics.percentage,
          periodLabel: attMetrics.periodLabel,
          isFutureYear: attMetrics.isFutureYear,
          markedDays: attMetrics.markedDays,
        },
        subjects,
        overallAvgScore: overallAvgScore && overallAvgScore > 0 ? overallAvgScore : null,
        examScheduleRaw: examItems,
        holidays,
        upcomingEvents,
        examHeadline,
      };

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
          overallPercent: overview.attendancePercent,
        },
        academics: {
          summary: {
            overallAverage: overview.averageMarks,
            rank: overview.classRank,
            classStrength: enrichedProfile.classStrength,
            subjects: subjects.length || perf.subjects.length,
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
            totalPeriods: week.reduce(
              (n, d) => n + d.slots.filter((s) => s.kind === 'period').length,
              0,
            ),
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
        fees: feesMerged,
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
        dashboard,
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
    selectedYear?.start_date,
    selectedYear?.end_date,
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
