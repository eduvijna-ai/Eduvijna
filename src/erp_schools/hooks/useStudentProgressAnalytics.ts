/**
 * useStudentProgressAnalytics — live Top Performers / Needs Attention.
 * Enriches roster with attendance % (records) + avg exam score (marks).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { attendanceRecordsApi, examMarksApi } from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import type { StudentInfo } from '../types/domain';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';
import { useTeacherData } from './useTeacherData';

export type ProgressStudent = StudentInfo & {
  attendancePercent: number;
  averageScore: number;
  hasAttendanceData: boolean;
  hasScoreData: boolean;
};

function uniqueStudents(students: StudentInfo[]): StudentInfo[] {
  const map = new Map<string, StudentInfo>();
  students.forEach((s) => {
    const key =
      s.userId != null
        ? `u:${s.userId}`
        : s.profileId != null
          ? `p:${s.profileId}`
          : `id:${s.id}`;
    if (!map.has(key)) map.set(key, s);
  });
  return [...map.values()];
}

function attPctFromBucket(b: { present: number; late: number; total: number }): number {
  if (b.total <= 0) return 0;
  return Math.round(((b.present + b.late) / b.total) * 1000) / 10;
}

export function useStudentProgressAnalytics() {
  const session = useSchoolsSession();
  const { selectedYearId, selectedYear } = useAcademicYear();
  const { students, status: rosterStatus, refetch: refetchRoster } = useTeacherData();

  const roster = useMemo(() => uniqueStudents(students), [students]);

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [enriched, setEnriched] = useState<ProgressStudent[]>([]);

  const dateRange = useMemo(() => {
    const to = toLocalDateStr();
    const from =
      pickString(selectedYear?.start_date).slice(0, 10) ||
      (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        return toLocalDateStr(d);
      })();
    return { from, to };
  }, [selectedYear?.start_date]);

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setEnriched(
        roster.map((s) => ({
          ...s,
          attendancePercent: s.attendancePercent ?? 0,
          averageScore: s.averageScore ?? 0,
          hasAttendanceData: (s.attendancePercent ?? 0) > 0,
          hasScoreData: (s.averageScore ?? 0) > 0,
        })),
      );
      setStatus('ready');
      return;
    }

    if (rosterStatus === 'idle' || rosterStatus === 'loading') {
      setStatus('loading');
      return;
    }

    if (roster.length === 0) {
      setEnriched([]);
      setStatus('ready');
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);
    const schoolId = session.schoolId ?? undefined;
    const idSet = new Set(
      roster.map((s) => s.userId).filter((id): id is number => id != null && id > 0),
    );

    try {
      const classIds = [
        ...new Set(
          roster.map((s) => s.classId).filter((id): id is number => id != null && id > 0),
        ),
      ];

      const [attRaw, marksRaw] = await Promise.all([
        attendanceRecordsApi
          .getAll({
            school_id: schoolId,
            date_from: dateRange.from,
            date_to: dateRange.to,
            per_page: 10000,
            ...(classIds.length === 1 ? { class_id: classIds[0] } : {}),
          })
          .catch(() => ({ items: [] })),
        examMarksApi
          .list({
            school_id: schoolId,
            academic_year_id: selectedYearId ?? undefined,
            per_page: 5000,
          })
          .catch(() => ({ items: [] })),
      ]);

      const attBuckets = new Map<
        number,
        { present: number; late: number; total: number }
      >();
      safeList<Record<string, unknown>>(attRaw).forEach((r) => {
        const sid = pickNumber(r.student_id, r.user_id);
        if (!sid || (idSet.size > 0 && !idSet.has(sid))) return;
        const st = pickString(r.status).toLowerCase();
        if (!st) return;
        const b = attBuckets.get(sid) || { present: 0, late: 0, total: 0 };
        b.total += 1;
        if (st === 'present') b.present += 1;
        else if (st === 'late') b.late += 1;
        attBuckets.set(sid, b);
      });

      // scoreSums: student_id -> { sum of % or marks ratio, count }
      const scoreSums = new Map<number, { sum: number; count: number }>();
      safeList<Record<string, unknown>>(marksRaw).forEach((r) => {
        const sid = pickNumber(r.student_id, r.user_id);
        if (!sid || (idSet.size > 0 && !idSet.has(sid))) return;
        if (r.is_absent === true || r.is_absent === 'true') return;
        const pct = pickNumber(
          r.percentage,
          r.percent,
          r.score_percentage,
          r.marks_percentage,
        );
        const obtained = pickNumber(r.marks_obtained, r.obtained, r.marks);
        const maxMarks = pickNumber(r.max_marks, r.total_marks, r.out_of);
        let value: number | null = null;
        if (pct > 0) value = pct;
        else if (maxMarks > 0 && obtained >= 0) {
          value = Math.round((obtained / maxMarks) * 1000) / 10;
        } else if (obtained > 0 && obtained <= 100) {
          // Heuristic: treat as already-percent when no max provided
          value = obtained;
        }
        if (value == null) return;
        const cur = scoreSums.get(sid) || { sum: 0, count: 0 };
        cur.sum += value;
        cur.count += 1;
        scoreSums.set(sid, cur);
      });

      const next: ProgressStudent[] = roster.map((s) => {
        const sid = s.userId ?? (Number(s.id) || 0);
        const bucket = sid ? attBuckets.get(sid) : undefined;
        const score = sid ? scoreSums.get(sid) : undefined;
        const attendancePercent = bucket
          ? attPctFromBucket(bucket)
          : s.attendancePercent ?? 0;
        const averageScore = score && score.count > 0
          ? Math.round((score.sum / score.count) * 10) / 10
          : s.averageScore ?? 0;
        return {
          ...s,
          attendancePercent,
          averageScore,
          hasAttendanceData: !!bucket && bucket.total > 0,
          hasScoreData: !!score && score.count > 0,
        };
      });

      setEnriched(next);
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load progress analytics'));
      setEnriched(
        roster.map((s) => ({
          ...s,
          attendancePercent: s.attendancePercent ?? 0,
          averageScore: s.averageScore ?? 0,
          hasAttendanceData: false,
          hasScoreData: false,
        })),
      );
      setStatus('error');
    }
  }, [
    roster,
    rosterStatus,
    session.schoolId,
    selectedYearId,
    dateRange.from,
    dateRange.to,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const avgScore = useMemo(() => {
    const withScore = enriched.filter((s) => s.hasScoreData);
    if (!withScore.length) return null;
    return Math.round(
      withScore.reduce((sum, s) => sum + s.averageScore, 0) / withScore.length,
    );
  }, [enriched]);

  const avgAttendance = useMemo(() => {
    const withAtt = enriched.filter((s) => s.hasAttendanceData);
    if (!withAtt.length) return null;
    return Math.round(
      withAtt.reduce((sum, s) => sum + s.attendancePercent, 0) / withAtt.length,
    );
  }, [enriched]);

  const topPerformers = useMemo(() => {
    return [...enriched]
      .filter((s) => s.hasScoreData)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);
  }, [enriched]);

  const needsAttention = useMemo(() => {
    return [...enriched]
      .filter((s) => {
        const lowScore = s.hasScoreData && s.averageScore < 60;
        const lowAtt = s.hasAttendanceData && s.attendancePercent < 75;
        return lowScore || lowAtt;
      })
      .sort((a, b) => {
        const aRisk =
          (a.hasScoreData ? 100 - a.averageScore : 0) +
          (a.hasAttendanceData ? 100 - a.attendancePercent : 0);
        const bRisk =
          (b.hasScoreData ? 100 - b.averageScore : 0) +
          (b.hasAttendanceData ? 100 - b.attendancePercent : 0);
        return bRisk - aRisk;
      })
      .slice(0, 8);
  }, [enriched]);

  return {
    students: enriched,
    studentCount: enriched.length,
    avgScore,
    avgAttendance,
    topPerformers,
    needsAttention,
    dateRange,
    status,
    rosterStatus,
    error,
    refetch: async () => {
      await refetchRoster();
      await load();
    },
  };
}
