/**
 * useStudentSubjectsData — web useStudentClassesData parity for Subject Overview.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  assignmentsApi,
  attendanceRecordsApi,
  examAllItemsApi,
  holidaysApi,
  lmsClassroomsApi,
  lmsEnrollmentsApi,
  noticesApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
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
  buildClassRows,
  computeExamStats,
  examPerformanceFromRows,
  fetchEnrolledClassroomsMobile,
  overallRankLabel,
  resolveAcademicYearAttendancePeriod,
  type SubjectClassRow,
} from '../utils/studentSubjectsMeta';
import { useSchoolsSession } from './useSchoolsSession';

function strengthsText(rows: SubjectClassRow[]): string {
  const sorted = [...rows]
    .filter((r) => r.percentage != null)
    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  if (sorted.length >= 2) {
    return `You are doing great in ${sorted[0].classroomName} and ${sorted[1].classroomName}. Keep it up!`;
  }
  if (sorted[0]) return `You are doing great in ${sorted[0].classroomName}. Keep it up!`;
  return 'Complete more exams to unlock strength insights.';
}

function improvementsText(rows: SubjectClassRow[]): string {
  const sorted = [...rows]
    .filter((r) => r.percentage != null)
    .sort((a, b) => (a.percentage || 0) - (b.percentage || 0));
  if (sorted[0] && (sorted[0].percentage ?? 100) < 80) {
    return `Focus more on ${sorted[0].classroomName} and practice regularly.`;
  }
  return 'Maintain consistent revision across all subjects.';
}

export function useStudentSubjectsData() {
  const session = useSchoolsSession();
  const { selectedYear, selectedYearId } = useAcademicYear();
  const schoolId = session.schoolId ?? undefined;

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<Record<string, unknown>[]>([]);
  const [perfItems, setPerfItems] = useState<Record<string, unknown>[]>([]);
  const [attSummary, setAttSummary] = useState<Record<string, unknown> | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, unknown>[]>([]);
  const [exams, setExams] = useState<Record<string, unknown>[]>([]);
  const [assignments, setAssignments] = useState<Record<string, unknown>[]>([]);
  const [holidays, setHolidays] = useState<Record<string, unknown>[]>([]);
  const [notices, setNotices] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setStatus('ready');
      setError(null);
      return;
    }

    if (!schoolId) {
      setEnrollments([]);
      setStatus('ready');
      return;
    }

    setStatus('loading');
    setError(null);

    const today = new Date();
    const y = today.getFullYear();
    const { periodStart, periodEnd, isFutureYear } = resolveAcademicYearAttendancePeriod(
      selectedYear?.start_date,
      selectedYear?.end_date,
      today,
    );
    const attTo = isFutureYear ? periodStart : periodEnd;

    try {
      const results = await Promise.allSettled([
        fetchEnrolledClassroomsMobile(
          lmsEnrollmentsApi.myClassrooms,
          lmsEnrollmentsApi.list,
          lmsClassroomsApi.list,
          schoolId,
          session.userId,
        ),
        examAllItemsApi.mySubjectPerformance({ school_id: schoolId }),
        isFutureYear
          ? Promise.resolve(null)
          : attendanceRecordsApi.mySummary({
              date_from: periodStart,
              date_to: attTo,
              school_id: schoolId,
            }),
        isFutureYear
          ? Promise.resolve({ items: [] })
          : attendanceRecordsApi.getAll({
              school_id: schoolId,
              date_from: periodStart,
              date_to: attTo,
              per_page: 5000,
              ...(session.userId ? { student_id: session.userId } : {}),
            }),
        examAllItemsApi.mySchedule({ school_id: schoolId }),
        assignmentsApi.list({
          school_id: schoolId,
          per_page: 100,
          is_published: true,
        }),
        holidaysApi.getAll({ school_id: schoolId, year: y, per_page: 200 }),
        noticesApi.getAll({ school_id: schoolId, per_page: 20, is_active: true }),
      ]);

      setEnrollments(settledValue(results[0], []));
      const perfRaw = settledValue(results[1], null);
      setPerfItems(safeList((perfRaw as any)?.items ?? perfRaw));
      setAttSummary(
        results[2].status === 'fulfilled' && results[2].value
          ? (results[2].value as Record<string, unknown>)
          : null,
      );
      const recRaw = settledValue(results[3], null);
      setAttendanceRecords(safeList((recRaw as any)?.items ?? recRaw));
      const examRaw = settledValue(results[4], null);
      setExams(safeList((examRaw as any)?.items ?? examRaw));
      const asgRaw = settledValue(results[5], null);
      setAssignments(safeList((asgRaw as any)?.items ?? asgRaw));
      const holRaw = settledValue(results[6], null);
      setHolidays(safeList((holRaw as any)?.items ?? holRaw));
      const nRaw = settledValue(results[7], null);
      setNotices(safeList((nRaw as any)?.items ?? nRaw));

      setStatus('ready');
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length === results.length) {
        setError('Unable to load subjects. Pull to refresh.');
        setStatus('error');
      }
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
    }
  }, [
    schoolId,
    session.userId,
    selectedYear?.start_date,
    selectedYear?.end_date,
    selectedYearId,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const built = useMemo(
    () =>
      buildClassRows(
        enrollments,
        perfItems,
        attendanceRecords,
        selectedYear?.start_date,
        selectedYear?.end_date,
        attSummary,
      ),
    [enrollments, perfItems, attendanceRecords, selectedYear?.start_date, selectedYear?.end_date, attSummary],
  );

  const todayStr = toLocalDateStr();
  const examStats = useMemo(() => computeExamStats(exams, todayStr), [exams, todayStr]);
  const performanceBands = useMemo(
    () => examPerformanceFromRows(built.classRows),
    [built.classRows],
  );

  const overall = useMemo(() => {
    const first = built.classRows[0];
    const classLabel = first
      ? [first.className, first.sectionName].filter(Boolean).join(' · ')
      : '';
    const scored = built.classRows.filter((r) => r.percentage != null);
    const avgAtt = built.classRows.length
      ? built.classRows.reduce((s, r) => s + r.attendancePct, 0) / built.classRows.length
      : built.attendanceMetrics.percentage;
    const avgScore = scored.length
      ? scored.reduce((s, r) => s + (r.percentage || 0), 0) / scored.length
      : built.overallPct;
    const certificates = scored.filter((r) => (r.percentage || 0) >= 80).length;
    return {
      classLabel,
      enrolled: built.classRows.length,
      avgAtt,
      avgScore,
      certificates,
      yearLabel: selectedYear?.name ?? '',
    };
  }, [built, selectedYear?.name]);

  const upcomingExams = useMemo(
    () =>
      [...exams]
        .filter((e) => pickString(e.exam_date).slice(0, 10) >= todayStr)
        .sort((a, b) => pickString(a.exam_date).localeCompare(pickString(b.exam_date)))
        .slice(0, 6),
    [exams, todayStr],
  );

  const recentExams = useMemo(
    () =>
      [...exams]
        .filter((e) => pickString(e.exam_date).slice(0, 10) < todayStr)
        .sort((a, b) => pickString(b.exam_date).localeCompare(pickString(a.exam_date)))
        .slice(0, 5)
        .map((e) => {
          const subj = pickString(e.subject_name).toLowerCase();
          const row = built.classRows.find(
            (r) =>
              subj.includes(r.subject.toLowerCase()) ||
              subj.includes(r.classroomName.toLowerCase()) ||
              r.classroomName.toLowerCase().includes(subj),
          );
          const pct = row?.percentage ?? null;
          const max = pickNumber(e.max_marks) || 100;
          const score = pct != null ? Math.round((pct / 100) * max) : null;
          return {
            id: String(e.exam_subject_id ?? e.id ?? pickString(e.exam_name) + pickString(e.exam_date)),
            examName: pickString(e.exam_name, 'Exam'),
            subject: row?.classroomName || pickString(e.subject_name),
            date: pickString(e.exam_date).slice(0, 10),
            score,
            max,
            pct,
            grade: row?.grade || '—',
          };
        }),
    [exams, todayStr, built.classRows],
  );

  const getRowByKey = useCallback(
    (key?: string): SubjectClassRow | undefined => {
      if (!built.classRows.length) return undefined;
      if (!key) return built.classRows[0];
      return built.classRows.find((r) => r.key === key) ?? built.classRows[0];
    },
    [built.classRows],
  );

  return useMemo(
    () => ({
      status,
      error,
      refetch: load,
      classRows: built.classRows,
      attendanceMetrics: built.attendanceMetrics,
      attendanceRecords,
      exams,
      assignments,
      holidays,
      notices,
      overall,
      examStats,
      performanceBands,
      strengths: strengthsText(built.classRows),
      improvements: improvementsText(built.classRows),
      upcomingExams,
      recentExams,
      overallRankLabel: overallRankLabel(built.classRows),
      todayStr,
      yearLabel: selectedYear?.name ?? '',
      getRowByKey,
    }),
    [
      status,
      error,
      load,
      built,
      attendanceRecords,
      exams,
      assignments,
      holidays,
      notices,
      overall,
      examStats,
      performanceBands,
      upcomingExams,
      recentExams,
      todayStr,
      selectedYear?.name,
      getRowByKey,
    ],
  );
}
