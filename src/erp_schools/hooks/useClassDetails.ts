/**
 * useClassDetails — live data for Class Details screen (one class/section/subject).
 * Banner/roster from teacher data; avg attendance & score from attendance + marks APIs.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { attendanceRecordsApi, examMarksApi, timetableSlotsApi } from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import type { AttendanceStatus, ClassInfo, StudentInfo } from '../types/domain';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import { countPeriodsForClass } from '../mappers/teacher';
import { useSchoolsSession } from './useSchoolsSession';
import { useTeacherData } from './useTeacherData';

export type ClassRosterStudent = StudentInfo & {
  todayStatus: AttendanceStatus | null;
};

function normalizeAttStatus(raw: string): AttendanceStatus | null {
  const st = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (st === 'present' || st === 'p') return 'present';
  if (st === 'absent' || st === 'a') return 'absent';
  if (st === 'late' || st === 'l') return 'late';
  if (st === 'half_day' || st === 'halfday' || st === 'half') return 'half_day';
  if (st === 'leave' || st === 'excused' || st === 'on_leave') return 'leave';
  return null;
}

function filterRosterForClass(
  students: StudentInfo[],
  classInfo: ClassInfo | undefined,
): StudentInfo[] {
  if (!classInfo) return [];
  const seen = new Set<string>();
  const out: StudentInfo[] = [];
  students.forEach((s) => {
    if (classInfo.classId != null && s.classId != null && s.classId !== classInfo.classId) {
      return;
    }
    if (
      classInfo.sectionId != null &&
      s.sectionId != null &&
      s.sectionId !== classInfo.sectionId
    ) {
      return;
    }
    // Fallback name match when ids missing
    if (classInfo.classId == null && classInfo.className && s.className) {
      if (s.className !== classInfo.className) return;
    }
    if (classInfo.sectionName && s.sectionName && classInfo.sectionId == null) {
      if (s.sectionName !== classInfo.sectionName) return;
    }
    const key =
      s.profileId != null && s.profileId > 0
        ? `p:${s.profileId}`
        : s.userId != null
          ? `u:${s.userId}`
          : `id:${s.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  });
  return out;
}

export function useClassDetails(classIdParam?: string) {
  const session = useSchoolsSession();
  const { selectedYearId, selectedYear } = useAcademicYear();
  const {
    getClassById,
    students,
    status: rosterStatus,
    refetch: refetchRoster,
  } = useTeacherData();

  const classInfo = getClassById(classIdParam);
  const baseRoster = useMemo(
    () => filterRosterForClass(students, classInfo),
    [students, classInfo],
  );

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [roster, setRoster] = useState<ClassRosterStudent[]>([]);
  const [avgAttendance, setAvgAttendance] = useState<number | null>(null);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [periodsPerWeek, setPeriodsPerWeek] = useState(0);

  const dateRange = useMemo(() => {
    const to = toLocalDateStr();
    const from =
      pickString(selectedYear?.start_date).slice(0, 10) ||
      (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        return toLocalDateStr(d);
      })();
    return { from, to };
  }, [selectedYear?.start_date]);

  const today = toLocalDateStr();

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setRoster(
        baseRoster.map((s) => ({
          ...s,
          todayStatus: (s.attendanceStatus as AttendanceStatus) ?? null,
        })),
      );
      setPeriodsPerWeek(classInfo?.periodsPerWeek ?? 0);
      setAvgAttendance(null);
      setAvgScore(null);
      setStatus('ready');
      return;
    }

    if (rosterStatus === 'idle' || rosterStatus === 'loading') {
      setStatus('loading');
      return;
    }

    if (!classInfo) {
      setRoster([]);
      setStatus('ready');
      return;
    }

    setStatus('loading');
    setError(null);
    const schoolId = session.schoolId ?? undefined;
    const numericClassId = classInfo.classId ?? (Number(classInfo.id) || undefined);
    const studentIds = new Set(
      baseRoster
        .map((s) => s.userId)
        .filter((id): id is number => id != null && id > 0),
    );

    try {
      const [todayRaw, rangeRaw, marksRaw, slotsRaw] = await Promise.all([
        numericClassId
          ? attendanceRecordsApi
              .getAll({
                school_id: schoolId,
                class_id: numericClassId,
                date_from: today,
                date_to: today,
                per_page: 2000,
              })
              .catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
        numericClassId
          ? attendanceRecordsApi
              .getAll({
                school_id: schoolId,
                class_id: numericClassId,
                date_from: dateRange.from,
                date_to: dateRange.to,
                per_page: 10000,
              })
              .catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
        examMarksApi
          .list({
            school_id: schoolId,
            academic_year_id: selectedYearId ?? undefined,
            per_page: 5000,
          })
          .catch(() => ({ items: [] })),
        numericClassId
          ? timetableSlotsApi
              .list({
                school_id: schoolId,
                class_id: numericClassId,
                is_active: true,
                per_page: 200,
              })
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      // Today's status per student
      const todayMap = new Map<number, AttendanceStatus>();
      safeList<Record<string, unknown>>(todayRaw).forEach((r) => {
        const sid = pickNumber(r.student_id, r.user_id);
        const st = normalizeAttStatus(pickString(r.status));
        if (!sid || !st) return;
        if (classInfo.sectionId != null && r.section_id != null) {
          if (Number(r.section_id) !== classInfo.sectionId) return;
        }
        if (classInfo.subjectId != null && r.subject_id != null) {
          if (Number(r.subject_id) !== classInfo.subjectId) return;
        }
        // Prefer absent > late > present when multiple subjects
        const prev = todayMap.get(sid);
        const rank = { absent: 3, leave: 3, late: 2, half_day: 2, present: 1 } as const;
        if (!prev || (rank[st] ?? 0) >= (rank[prev] ?? 0)) todayMap.set(sid, st);
      });

      // Range attendance % for class students
      const buckets = new Map<number, { present: number; late: number; total: number }>();
      safeList<Record<string, unknown>>(rangeRaw).forEach((r) => {
        const sid = pickNumber(r.student_id, r.user_id);
        if (!sid || (studentIds.size > 0 && !studentIds.has(sid))) return;
        if (classInfo.sectionId != null && r.section_id != null) {
          if (Number(r.section_id) !== classInfo.sectionId) return;
        }
        const st = pickString(r.status).toLowerCase();
        if (!st) return;
        const b = buckets.get(sid) || { present: 0, late: 0, total: 0 };
        b.total += 1;
        if (st === 'present') b.present += 1;
        else if (st === 'late') b.late += 1;
        buckets.set(sid, b);
      });

      let attSum = 0;
      let attCount = 0;
      buckets.forEach((b) => {
        if (b.total <= 0) return;
        attSum += ((b.present + b.late) / b.total) * 100;
        attCount += 1;
      });
      setAvgAttendance(
        attCount > 0 ? Math.round((attSum / attCount) * 10) / 10 : null,
      );

      // Marks avg for students in this class
      let scoreSum = 0;
      let scoreCount = 0;
      const perStudent = new Map<number, { sum: number; n: number }>();
      safeList<Record<string, unknown>>(marksRaw).forEach((r) => {
        const sid = pickNumber(r.student_id, r.user_id);
        if (!sid || (studentIds.size > 0 && !studentIds.has(sid))) return;
        if (r.is_absent === true || r.is_absent === 'true') return;
        const pct = pickNumber(r.percentage, r.percent, r.score_percentage);
        const obtained = pickNumber(r.marks_obtained, r.obtained, r.marks);
        const maxMarks = pickNumber(r.max_marks, r.total_marks, r.out_of);
        let value: number | null = null;
        if (pct > 0) value = pct;
        else if (maxMarks > 0 && obtained >= 0) {
          value = Math.round((obtained / maxMarks) * 1000) / 10;
        } else if (obtained > 0 && obtained <= 100) value = obtained;
        if (value == null) return;
        const cur = perStudent.get(sid) || { sum: 0, n: 0 };
        cur.sum += value;
        cur.n += 1;
        perStudent.set(sid, cur);
      });
      perStudent.forEach((v) => {
        scoreSum += v.sum / v.n;
        scoreCount += 1;
      });
      setAvgScore(
        scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : null,
      );

      const fromClass = classInfo.periodsPerWeek || 0;
      const fromSlots = countPeriodsForClass(
        slotsRaw,
        numericClassId ?? null,
        classInfo.className,
      );
      setPeriodsPerWeek(fromSlots || fromClass);

      setRoster(
        baseRoster.map((s) => {
          const sid = s.userId ?? (Number(s.id) || 0);
          return {
            ...s,
            todayStatus: sid ? todayMap.get(sid) ?? null : null,
          };
        }),
      );
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load class details'));
      setRoster(baseRoster.map((s) => ({ ...s, todayStatus: null })));
      setPeriodsPerWeek(classInfo.periodsPerWeek ?? 0);
      setStatus('error');
    }
  }, [
    baseRoster,
    classInfo,
    dateRange.from,
    dateRange.to,
    rosterStatus,
    session.schoolId,
    selectedYearId,
    today,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    classInfo,
    roster,
    studentCount: baseRoster.length || classInfo?.studentCount || 0,
    periodsPerWeek,
    avgAttendance,
    avgScore,
    status,
    rosterStatus,
    error,
    refetch: async () => {
      await refetchRoster();
      await load();
    },
  };
}
