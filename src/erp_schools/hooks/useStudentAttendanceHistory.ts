/**
 * useStudentAttendanceHistory — live attendance for one student (current week by default).
 * APIs: attendanceRecordsApi.getAll + studentSummary (web Student Report parity).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { attendanceRecordsApi } from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
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

export type StudentAttStatus = 'present' | 'absent' | 'late' | 'half_day' | 'excused';

export type StudentAttRecord = {
  id: string;
  date: string;
  status: StudentAttStatus;
  subjectName?: string;
  remarks?: string;
};

export type StudentAttSummary = {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  excused: number;
  total: number;
  percentage: number | null;
};

function startOfWeekMonday(d = new Date()): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfWeekSunday(monday: Date): Date {
  const out = new Date(monday);
  out.setDate(monday.getDate() + 6);
  return out;
}

function normalizeStatus(raw: string): StudentAttStatus | null {
  const st = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (st === 'present' || st === 'p') return 'present';
  if (st === 'absent' || st === 'a') return 'absent';
  if (st === 'late' || st === 'l') return 'late';
  if (st === 'half_day' || st === 'halfday' || st === 'half') return 'half_day';
  if (st === 'excused' || st === 'leave' || st === 'on_leave') return 'excused';
  return null;
}

const STATUS_PRIORITY: Record<StudentAttStatus, number> = {
  absent: 4,
  late: 3,
  half_day: 2,
  excused: 2,
  present: 1,
};

function summarize(records: StudentAttRecord[]): StudentAttSummary {
  let present = 0;
  let absent = 0;
  let late = 0;
  let halfDay = 0;
  let excused = 0;
  records.forEach((r) => {
    if (r.status === 'present') present += 1;
    else if (r.status === 'absent') absent += 1;
    else if (r.status === 'late') late += 1;
    else if (r.status === 'half_day') halfDay += 1;
    else if (r.status === 'excused') excused += 1;
  });
  const total = records.length;
  const attended = present + late + halfDay * 0.5;
  const percentage =
    total > 0 ? Math.round((attended / total) * 1000) / 10 : null;
  return { present, absent, late, halfDay, excused, total, percentage };
}

export function useStudentAttendanceHistory(studentIdParam?: string) {
  const session = useSchoolsSession();
  const { getStudentById, status: rosterStatus } = useTeacherData();
  const student = getStudentById(studentIdParam);
  const rosterLoading = rosterStatus === 'idle' || rosterStatus === 'loading';

  const weekRange = useMemo(() => {
    const monday = startOfWeekMonday(new Date());
    const sunday = endOfWeekSunday(monday);
    return {
      from: toLocalDateStr(monday),
      to: toLocalDateStr(sunday),
      label: `${monday.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      })} – ${sunday.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`,
    };
  }, []);

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<StudentAttRecord[]>([]);
  const [summary, setSummary] = useState<StudentAttSummary>({
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    excused: 0,
    total: 0,
    percentage: null,
  });

  const erpStudentId = student?.userId ?? (student?.id ? Number(student.id) : null);

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setStatus('ready');
      return;
    }
    // Wait for roster before deciding student is missing
    if (rosterLoading) {
      setStatus('loading');
      return;
    }
    if (!erpStudentId || !Number.isFinite(erpStudentId)) {
      setRecords([]);
      setSummary(summarize([]));
      setStatus('ready');
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);
    const schoolId = session.schoolId ?? undefined;

    try {
      const [recordsRaw, summaryRaw] = await Promise.all([
        attendanceRecordsApi.getAll({
          student_id: erpStudentId,
          date_from: weekRange.from,
          date_to: weekRange.to,
          school_id: schoolId,
          per_page: 500,
          ...(student?.classId ? { class_id: student.classId } : {}),
        }),
        attendanceRecordsApi
          .studentSummary({
            student_id: erpStudentId,
            date_from: weekRange.from,
            date_to: weekRange.to,
            school_id: schoolId,
          })
          .catch(() => null),
      ]);

      let items = safeList<Record<string, unknown>>(recordsRaw);
      items = items.filter((r) => {
        const sid = pickNumber(r.student_id, r.user_id);
        return sid === erpStudentId;
      });

      const byDate = new Map<string, StudentAttRecord>();
      items.forEach((r, i) => {
        const date = pickString(r.date).slice(0, 10);
        const st = normalizeStatus(pickString(r.status));
        if (!date || !st) return;
        const next: StudentAttRecord = {
          id: pickString(r.id, `${date}-${i}`),
          date,
          status: st,
          subjectName: pickString(r.subject_name) || undefined,
          remarks: pickString(r.remarks) || undefined,
        };
        const prev = byDate.get(date);
        if (!prev || STATUS_PRIORITY[st] >= STATUS_PRIORITY[prev.status]) {
          byDate.set(date, next);
        }
      });

      const list = [...byDate.values()].sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
      );
      setRecords(list);

      const fromRecords = summarize(list);
      const s = (summaryRaw ?? {}) as Record<string, unknown>;
      const hasApiSummary =
        summaryRaw != null &&
        (s.present != null ||
          s.present_days != null ||
          s.total_days != null ||
          s.total != null);

      if (hasApiSummary) {
        setSummary({
          present: pickNumber(s.present, s.present_days, fromRecords.present),
          absent: pickNumber(s.absent, s.absent_days, fromRecords.absent),
          late: pickNumber(s.late, s.late_days, fromRecords.late),
          halfDay: pickNumber(s.half_day, s.half_days, fromRecords.halfDay),
          excused: pickNumber(s.excused, s.leave_days, fromRecords.excused),
          total: pickNumber(s.total_days, s.total, fromRecords.total),
          percentage: (() => {
            const n = Number(s.percentage ?? s.attendance_percentage);
            return Number.isFinite(n) ? Math.round(n * 10) / 10 : fromRecords.percentage;
          })(),
        });
      } else {
        setSummary(fromRecords);
      }

      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load attendance'));
      setRecords([]);
      setSummary(summarize([]));
      setStatus('error');
    }
  }, [
    erpStudentId,
    rosterLoading,
    session.schoolId,
    student?.classId,
    weekRange.from,
    weekRange.to,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    student,
    weekRange,
    records,
    summary,
    status,
    error,
    rosterLoading,
    refetch: load,
  };
}
