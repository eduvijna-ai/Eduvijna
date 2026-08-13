/**
 * useTeacherAttendanceTracker — web AttendanceTab tracker seam for instructors.
 * APIs: studentsByUserApi, attendanceSettingsApi, attendanceRecordsApi
 * Rules: subject required to edit; teacher can edit today only (admin: any date); P/A/L cycle.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  attendanceRecordsApi,
  attendanceSettingsApi,
  studentsByUserApi,
  timetableLookupApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

export type AttStatus = 'present' | 'absent' | 'late' | 'leave' | '';
export type ViewPeriod =
  | 'month'
  | 'current-week'
  | 'last-week'
  | 'quarter'
  | 'half-year'
  | 'full-year';

export type AttStudent = {
  studentId: number;
  name: string;
  admissionNo: string;
  gender: string;
  classId: number;
  className: string;
  sectionId: number;
  sectionName: string;
  subjectId: number;
  subjectName: string;
  avatarUrl?: string;
};

export type AttMetrics = {
  total: number;
  male: number;
  female: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  presentTodayM: number;
  presentTodayF: number;
  absentTodayM: number;
  absentTodayF: number;
  lateTodayM: number;
  lateTodayF: number;
  avgPresent: number;
  avgAbsent: number;
  avgLate: number;
  workingDays: number;
};

export type TrackerOptions = {
  /** Web admin: edit any date in range. Teacher: today only. */
  canEditAnyDate?: boolean;
  /** Web admin cycle: P → A → L → empty → P */
  allowClearOnCycle?: boolean;
  /**
   * Mobile mark sheet: pick any calendar date ≤ today and mark that day
   * (not limited to “today” or working-day chips).
   */
  allowPastDates?: boolean;
};

const TEACHER_NEXT: Record<string, AttStatus> = {
  '': 'present',
  present: 'absent',
  absent: 'late',
  late: 'present',
};

const ADMIN_NEXT: Record<string, AttStatus> = {
  '': 'present',
  present: 'absent',
  absent: 'late',
  late: '',
};

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function getDateRange(
  viewPeriod: ViewPeriod,
  month: number,
  year: number,
  ayStart?: string,
  ayEnd?: string,
): { from: string; to: string } {
  const today = new Date();
  const todayStr = toLocalDateStr(today);
  const pad = (n: number) => String(n).padStart(2, '0');
  const clamp = (s: string) => (s > todayStr ? todayStr : s);

  switch (viewPeriod) {
    case 'current-week': {
      const dow = today.getDay();
      const mon = new Date(today);
      mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);
      return { from: toLocalDateStr(mon), to: clamp(toLocalDateStr(fri)) };
    }
    case 'last-week': {
      const dow = today.getDay();
      const thisMon = new Date(today);
      thisMon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
      const lastMon = new Date(thisMon);
      lastMon.setDate(thisMon.getDate() - 7);
      const lastFri = new Date(lastMon);
      lastFri.setDate(lastMon.getDate() + 4);
      return { from: toLocalDateStr(lastMon), to: toLocalDateStr(lastFri) };
    }
    case 'quarter': {
      const from = new Date(today);
      from.setMonth(today.getMonth() - 3);
      return { from: toLocalDateStr(from), to: todayStr };
    }
    case 'half-year': {
      const from = new Date(today);
      from.setMonth(today.getMonth() - 6);
      return { from: toLocalDateStr(from), to: todayStr };
    }
    case 'full-year': {
      const from = ayStart || `${year}-04-01`;
      const to = ayEnd ? clamp(ayEnd.slice(0, 10)) : todayStr;
      return { from: from.slice(0, 10), to };
    }
    default: {
      const lastDay = new Date(year, month, 0).getDate();
      return {
        from: `${year}-${pad(month)}-01`,
        to: clamp(`${year}-${pad(month)}-${pad(lastDay)}`),
      };
    }
  }
}

function buildWorkingDates(
  from: string,
  to: string,
  workingDayNames: Set<string>,
): string[] {
  const out: string[] = [];
  const cur = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (cur <= end) {
    const key = DOW_KEYS[cur.getDay()];
    if (workingDayNames.has(key) || key === 'sat') {
      out.push(toLocalDateStr(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function buildWeekGroups(dates: string[]): Array<{ label: string; dates: string[] }> {
  const groups: Array<{ label: string; dates: string[] }> = [];
  let curKey = '';
  dates.forEach((ds) => {
    const d = new Date(`${ds}T00:00:00`);
    const dow = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const key = toLocalDateStr(mon);
    if (key !== curKey) {
      curKey = key;
      groups.push({ label: `Week ${groups.length + 1}`, dates: [] });
    }
    groups[groups.length - 1].dates.push(ds);
  });
  return groups;
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function buildMonthGroups(
  dates: string[],
): Array<{ key: string; label: string; dates: string[] }> {
  const groups: Array<{ key: string; label: string; dates: string[] }> = [];
  let curMonth = '';
  dates.forEach((ds) => {
    const m = ds.slice(0, 7);
    if (m !== curMonth) {
      curMonth = m;
      const d = new Date(`${ds}T00:00:00`);
      groups.push({
        key: m,
        label: `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,
        dates: [],
      });
    }
    groups[groups.length - 1].dates.push(ds);
  });
  return groups;
}

function normalizeAttStatus(raw: string): AttStatus {
  const st = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (st === 'present' || st === 'p') return 'present';
  if (st === 'absent' || st === 'a') return 'absent';
  if (st === 'late' || st === 'l') return 'late';
  if (st === 'leave' || st === 'excused' || st === 'on_leave') return 'leave';
  return '';
}

function mapStudent(r: Record<string, unknown>): AttStudent {
  const photo = pickString(r.avatar_url, r.photo_url, r.image_url, r.profile_photo, r.photo);
  return {
    studentId: pickNumber(r.user_id, r.student_id, r.id),
    name: pickString(r.name, r.username, 'Student'),
    admissionNo: pickString(r.admission_number, '—'),
    gender: pickString(r.gender).toLowerCase(),
    classId: pickNumber(r.class_id),
    className: pickString(r.class_name, r.class_code, 'Class'),
    sectionId: pickNumber(r.section_id),
    sectionName: pickString(r.section_name, '—'),
    subjectId: pickNumber(r.subject_id),
    subjectName: pickString(r.subject_name, '—'),
    avatarUrl: photo || undefined,
  };
}

export function useTeacherAttendanceTracker(
  initialClassId?: string | number,
  options?: TrackerOptions,
) {
  const canEditAnyDate = !!options?.canEditAnyDate;
  const allowClearOnCycle = !!options?.allowClearOnCycle;
  const allowPastDates = !!options?.allowPastDates;
  const cycleMap = allowClearOnCycle ? ADMIN_NEXT : TEACHER_NEXT;

  const session = useSchoolsSession();
  const { selectedYearId, selectedYear } = useAcademicYear();
  const schoolId = session.schoolId ?? undefined;
  const todayStr = toLocalDateStr();

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [allStudents, setAllStudents] = useState<AttStudent[]>([]);
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('month');
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [classId, setClassId] = useState<number | undefined>(
    initialClassId != null ? Number(initialClassId) : undefined,
  );
  const [sectionId, setSectionId] = useState<number | undefined>();
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [query, setQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [workingDates, setWorkingDates] = useState<string[]>([]);
  const [baseAttendance, setBaseAttendance] = useState<
    Record<number, Record<string, AttStatus>>
  >({});
  const [baseRecordIds, setBaseRecordIds] = useState<Record<string, number>>({});
  const [localEdits, setLocalEdits] = useState<Record<number, Record<string, AttStatus>>>(
    {},
  );
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  /** Admin: timetable class subjects (web AttendanceTab merge). */
  const [lookupSubjects, setLookupSubjects] = useState<
    Array<{ id: number; name: string }>
  >([]);

  const isViewOnly = !subjectId;
  const canEditDate = useCallback(
    (date: string) => {
      if (date > todayStr) return false;
      if (allowPastDates) return true;
      if (canEditAnyDate) return workingDates.includes(date) || date === todayStr;
      return date === todayStr;
    },
    [allowPastDates, canEditAnyDate, workingDates, todayStr],
  );

  const classOptions = useMemo(() => {
    const map = new Map<number, string>();
    allStudents.forEach((s) => {
      if (s.classId) map.set(s.classId, s.className);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [allStudents]);

  const sectionOptions = useMemo(() => {
    const map = new Map<number, string>();
    allStudents
      .filter((s) => !classId || s.classId === classId)
      .forEach((s) => {
        if (s.sectionId) map.set(s.sectionId, s.sectionName);
      });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [allStudents, classId]);

  const subjectOptions = useMemo(() => {
    const map = new Map<number, string>();
    allStudents
      .filter(
        (s) =>
          (!classId || s.classId === classId) &&
          (!sectionId || s.sectionId === sectionId),
      )
      .forEach((s) => {
        if (s.subjectId) map.set(s.subjectId, s.subjectName);
      });
    /* Admins: merge full class timetable subjects (web AttendanceTab). */
    if (canEditAnyDate) {
      lookupSubjects.forEach((s) => {
        if (s.id && !map.has(s.id)) map.set(s.id, s.name);
      });
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allStudents, classId, sectionId, lookupSubjects, canEditAnyDate]);

  useEffect(() => {
    if (!canEditAnyDate || !schoolId || !classId || USE_MOCK_DATA) {
      setLookupSubjects([]);
      return;
    }
    let cancelled = false;
    void timetableLookupApi
      .subjects(classId, schoolId)
      .then((raw) => {
        if (cancelled) return;
        const items = safeList<Record<string, unknown>>(raw)
          .map((s) => ({
            id: pickNumber(s.subject_id, s.id),
            name: pickString(s.subject_name, s.name, `Subject ${pickNumber(s.subject_id, s.id)}`),
          }))
          .filter((s) => s.id > 0);
        setLookupSubjects(items);
      })
      .catch(() => {
        if (!cancelled) setLookupSubjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canEditAnyDate, schoolId, classId, sectionId]);

  const roster = useMemo(() => {
    const seen = new Map<number, AttStudent>();
    allStudents.forEach((s) => {
      if (classId && s.classId !== classId) return;
      if (sectionId && s.sectionId !== sectionId) return;
      if (!seen.has(s.studentId)) seen.set(s.studentId, s);
    });
    let rows = [...seen.values()];
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.admissionNo.toLowerCase().includes(q),
      );
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [allStudents, classId, sectionId, query]);

  const getStatus = useCallback(
    (studentId: number, date: string): AttStatus => {
      const edit = localEdits[studentId]?.[date];
      if (edit !== undefined) return edit;
      return baseAttendance[studentId]?.[date] || '';
    },
    [localEdits, baseAttendance],
  );

  const loadRoster = useCallback(async () => {
    if (USE_MOCK_DATA) return;
    try {
      const raw = await studentsByUserApi.getAll({
        academic_year_id: selectedYearId ?? undefined,
        school_id: schoolId,
        per_page: 500,
      });
      const mapped = safeList<Record<string, unknown>>(raw).map(mapStudent);
      setAllStudents(mapped);
      if (!classId && mapped.length > 0) {
        const first = mapped[0];
        setClassId(first.classId || undefined);
        setSectionId(first.sectionId || undefined);
      }
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load students'));
    }
  }, [selectedYearId, schoolId, classId]);

  const loadGrid = useCallback(async () => {
    if (USE_MOCK_DATA || !classId) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const range = getDateRange(
        viewPeriod,
        month,
        year,
        selectedYear?.start_date,
        selectedYear?.end_date,
      );

      const [settingsRaw, recordsRaw] = await Promise.all([
        attendanceSettingsApi.get({ school_id: schoolId }).catch(() => null),
        attendanceRecordsApi.getAll({
          class_id: classId,
          date_from: range.from,
          date_to: range.to,
          school_id: schoolId,
          per_page: 10000,
        }),
      ]);

      const settingsObj = (settingsRaw && typeof settingsRaw === 'object'
        ? ((settingsRaw as { data?: unknown }).data ?? settingsRaw)
        : null) as Record<string, unknown> | null;
      setSettings(settingsObj);

      const workingCsv = pickString(settingsObj?.working_days, 'mon,tue,wed,thu,fri,sat');
      const workingNames = new Set(
        workingCsv.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean),
      );
      if (!workingNames.has('sat')) workingNames.add('sat');
      const dates = buildWorkingDates(range.from, range.to, workingNames);
      setWorkingDates(dates);
      setSelectedDate((prev) => {
        if (dates.includes(prev)) return prev;
        if (prev >= range.from && prev <= range.to) return prev;
        return dates.includes(todayStr)
          ? todayStr
          : dates[dates.length - 1] || todayStr;
      });

      let records = safeList<Record<string, unknown>>(recordsRaw);
      if (subjectId) {
        records = records.filter((r) => Number(r.subject_id) === subjectId);
      }

      const nextBase: Record<number, Record<string, AttStatus>> = {};
      const nextIds: Record<string, number> = {};
      const STATUS_PRIORITY: Record<string, number> = {
        absent: 3,
        late: 2,
        leave: 2,
        present: 1,
      };

      records.forEach((r) => {
        const sid = pickNumber(r.student_id, r.user_id);
        const date = pickString(r.date).slice(0, 10);
        const st = normalizeAttStatus(pickString(r.status));
        if (!sid || !date) return;
        if (!st) return;
        const subjKey = subjectId ? subjectId : pickNumber(r.subject_id);
        const key = `${sid}|${date}|${subjKey || 0}|0`;
        const id = pickNumber(r.id);
        if (id) nextIds[key] = id;

        if (!nextBase[sid]) nextBase[sid] = {};
        if (!subjectId) {
          const cur = nextBase[sid][date];
          const curP = cur ? STATUS_PRIORITY[cur] || 0 : 0;
          const newP = STATUS_PRIORITY[st] || 0;
          if (newP >= curP) nextBase[sid][date] = st;
        } else {
          nextBase[sid][date] = st;
        }
      });

      setBaseAttendance(nextBase);
      setBaseRecordIds(nextIds);
      setLocalEdits({});
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load attendance'));
      setStatus('error');
    }
  }, [
    classId,
    viewPeriod,
    month,
    year,
    selectedYear?.start_date,
    selectedYear?.end_date,
    schoolId,
    subjectId,
    todayStr,
  ]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    if (initialClassId != null) setClassId(Number(initialClassId));
  }, [initialClassId]);

  useEffect(() => {
    if (classId && sectionOptions.length === 1 && !sectionId) {
      setSectionId(sectionOptions[0].id);
    }
  }, [classId, sectionOptions, sectionId]);

  useEffect(() => {
    if (!subjectId) return;
    if (!subjectOptions.some((s) => s.id === subjectId)) setSubjectId(undefined);
  }, [subjectOptions, subjectId]);

  useEffect(() => {
    void loadGrid();
  }, [loadGrid]);

  const toggleCell = useCallback(
    (studentId: number, date: string) => {
      if (isViewOnly || !canEditDate(date)) return;
      setLocalEdits((prev) => {
        const current =
          prev[studentId]?.[date] ?? baseAttendance[studentId]?.[date] ?? '';
        const next = cycleMap[current] ?? 'present';
        return {
          ...prev,
          [studentId]: { ...(prev[studentId] || {}), [date]: next },
        };
      });
    },
    [isViewOnly, canEditDate, baseAttendance, cycleMap],
  );

  const setCellStatus = useCallback(
    (studentId: number, date: string, attStatus: AttStatus) => {
      if (isViewOnly || !canEditDate(date)) return;
      setLocalEdits((prev) => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [date]: attStatus },
      }));
    },
    [isViewOnly, canEditDate],
  );

  const applyBulk = useCallback(
    (date: string, attStatus: AttStatus) => {
      if (isViewOnly || !canEditDate(date) || !attStatus) return;
      setLocalEdits((prev) => {
        const next = { ...prev };
        roster.forEach((s) => {
          next[s.studentId] = { ...(next[s.studentId] || {}), [date]: attStatus };
        });
        return next;
      });
    },
    [isViewOnly, canEditDate, roster],
  );

  const resetToday = useCallback(() => {
    setLocalEdits((prev) => {
      const next: typeof prev = {};
      Object.entries(prev).forEach(([sid, edits]) => {
        const rest = { ...edits };
        delete rest[todayStr];
        if (Object.keys(rest).length > 0) next[Number(sid)] = rest;
      });
      return next;
    });
  }, [todayStr]);

  const clearEdits = useCallback(() => setLocalEdits({}), []);

  const selectMarkDate = useCallback(
    (ymd: string) => {
      const next = ymd.slice(0, 10);
      if (!next) return;
      const clamped = next > todayStr ? todayStr : next;
      const y = Number(clamped.slice(0, 4));
      const m = Number(clamped.slice(5, 7));
      setViewPeriod('month');
      if (Number.isFinite(y)) setYear(y);
      if (Number.isFinite(m) && m >= 1 && m <= 12) setMonth(m);
      setSelectedDate(clamped);
    },
    [todayStr],
  );

  const hasEdits = useMemo(
    () => Object.values(localEdits).some((edits) => Object.keys(edits).length > 0),
    [localEdits],
  );

  const saveChanges = useCallback(async () => {
    if (!classId || isViewOnly) return false;
    setSaving(true);
    setError(null);
    try {
      const dateMap: Record<string, Array<{ student_id: number; status: string }>> = {};
      Object.entries(localEdits).forEach(([sid, edits]) => {
        Object.entries(edits).forEach(([date, st]) => {
          if (!st) return;
          const base = baseAttendance[Number(sid)]?.[date];
          if (base === st) return;
          if (!dateMap[date]) dateMap[date] = [];
          dateMap[date].push({ student_id: Number(sid), status: st });
        });
      });

      const subjKey = subjectId ? Number(subjectId) : 0;
      await Promise.all(
        Object.entries(dateMap).map(async ([date, records]) => {
          const updates: Promise<unknown>[] = [];
          const toCreate: Array<{ student_id: number; status: string }> = [];
          records.forEach((rec) => {
            const key = `${rec.student_id}|${date}|${subjKey}|0`;
            const recordId = baseRecordIds[key];
            const payloadStatus = rec.status === 'leave' ? 'excused' : rec.status;
            if (recordId) {
              updates.push(attendanceRecordsApi.update(recordId, { status: payloadStatus }));
            } else {
              toCreate.push({ ...rec, status: payloadStatus });
            }
          });
          if (updates.length) await Promise.all(updates);
          if (toCreate.length === 0) return;
          await attendanceRecordsApi.bulkUpsert({
            school_id: schoolId,
            class_id: classId,
            section_id: sectionId,
            subject_id: subjectId,
            date,
            records: toCreate,
          });
        }),
      );
      await loadGrid();
      return true;
    } catch (e) {
      setError(extractErrorMessage(e, 'Save failed'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    classId,
    isViewOnly,
    localEdits,
    baseAttendance,
    subjectId,
    baseRecordIds,
    schoolId,
    sectionId,
    loadGrid,
  ]);

  const metrics: AttMetrics = useMemo(() => {
    const todayInRange = workingDates.includes(todayStr);
    let presentToday = 0;
    let absentToday = 0;
    let lateToday = 0;
    let presentTodayM = 0;
    let presentTodayF = 0;
    let absentTodayM = 0;
    let absentTodayF = 0;
    let lateTodayM = 0;
    let lateTodayF = 0;
    let sumP = 0;
    let sumA = 0;
    let sumL = 0;
    let daysWithData = 0;

    workingDates.forEach((d) => {
      let dayP = 0;
      let dayA = 0;
      let dayL = 0;
      let any = false;
      roster.forEach((s) => {
        const st = getStatus(s.studentId, d);
        if (!st) return;
        any = true;
        const male = s.gender.startsWith('m');
        const female = s.gender.startsWith('f');
        if (st === 'present') {
          dayP += 1;
          if (d === todayStr) {
            presentToday += 1;
            if (male) presentTodayM += 1;
            if (female) presentTodayF += 1;
          }
        } else if (st === 'absent') {
          dayA += 1;
          if (d === todayStr) {
            absentToday += 1;
            if (male) absentTodayM += 1;
            if (female) absentTodayF += 1;
          }
        } else if (st === 'late') {
          dayL += 1;
          if (d === todayStr) {
            lateToday += 1;
            if (male) lateTodayM += 1;
            if (female) lateTodayF += 1;
          }
        }
      });
      if (any) {
        daysWithData += 1;
        sumP += dayP;
        sumA += dayA;
        sumL += dayL;
      }
    });

    const male = roster.filter((s) => s.gender.startsWith('m')).length;
    const female = roster.filter((s) => s.gender.startsWith('f')).length;

    return {
      total: roster.length,
      male,
      female,
      presentToday: todayInRange ? presentToday : 0,
      absentToday: todayInRange ? absentToday : 0,
      lateToday: todayInRange ? lateToday : 0,
      presentTodayM,
      presentTodayF,
      absentTodayM,
      absentTodayF,
      lateTodayM,
      lateTodayF,
      avgPresent: daysWithData ? Math.round(sumP / daysWithData) : 0,
      avgAbsent: daysWithData ? Math.round(sumA / daysWithData) : 0,
      avgLate: daysWithData ? Math.round(sumL / daysWithData) : 0,
      workingDays: workingDates.length,
    };
  }, [workingDates, todayStr, roster, getStatus]);

  const dayCounts = useMemo(() => {
    const map: Record<
      string,
      { present: number; absent: number; late: number; leave: number; marked: number }
    > = {};
    const tallyDate = (d: string) => {
      let present = 0;
      let absent = 0;
      let late = 0;
      let leave = 0;
      let marked = 0;
      roster.forEach((s) => {
        const st = getStatus(s.studentId, d);
        if (!st) return;
        marked += 1;
        if (st === 'present') present += 1;
        else if (st === 'absent') absent += 1;
        else if (st === 'late') late += 1;
        else if (st === 'leave') leave += 1;
      });
      return { present, absent, late, leave, marked };
    };
    workingDates.forEach((d) => {
      map[d] = tallyDate(d);
    });
    if (selectedDate && !map[selectedDate]) {
      map[selectedDate] = tallyDate(selectedDate);
    }
    return map;
  }, [workingDates, roster, getStatus, selectedDate]);

  const studentSummaries = useMemo(() => {
    return roster.map((s) => {
      let p = 0;
      let a = 0;
      let l = 0;
      workingDates.forEach((d) => {
        const st = getStatus(s.studentId, d);
        if (st === 'present') p += 1;
        else if (st === 'absent') a += 1;
        else if (st === 'late') l += 1;
        else if (st === 'leave') {
          /* leave is marked but not present/late */
        }
      });
      const denom = workingDates.length || 1;
      const pct = Math.round(((p + l) / denom) * 1000) / 10;
      const risk =
        workingDates.length === 0
          ? 'OK'
          : pct < 45
            ? 'Critical'
            : pct < 75
              ? 'Low Attendance'
              : 'OK';
      return {
        ...s,
        present: p,
        absent: a,
        late: l,
        pct,
        risk,
        todayStatus: getStatus(s.studentId, todayStr),
        selectedStatus: getStatus(s.studentId, selectedDate),
      };
    });
  }, [roster, workingDates, getStatus, todayStr, selectedDate]);

  const weekGroups = useMemo(() => buildWeekGroups(workingDates), [workingDates]);
  const monthGroups = useMemo(() => buildMonthGroups(workingDates), [workingDates]);
  const useMonthSummary = ['quarter', 'half-year', 'full-year'].includes(viewPeriod);
  const todayInRange = workingDates.includes(todayStr);

  return {
    status,
    error,
    saving,
    todayStr,
    viewPeriod,
    setViewPeriod,
    month,
    setMonth,
    year,
    setYear,
    classId,
    setClassId,
    sectionId,
    setSectionId,
    subjectId,
    setSubjectId,
    query,
    setQuery,
    selectedDate,
    setSelectedDate,
    selectMarkDate,
    classOptions,
    sectionOptions,
    subjectOptions,
    roster,
    workingDates,
    weekGroups,
    monthGroups,
    useMonthSummary,
    todayInRange,
    metrics,
    dayCounts,
    studentSummaries,
    isViewOnly,
    canEditAnyDate,
    canEditDate,
    getStatus,
    toggleCell,
    setCellStatus,
    applyBulk,
    resetToday,
    clearEdits,
    hasEdits,
    saveChanges,
    refetch: loadGrid,
    settings,
  };
}

/** Admin Attendance hub — edit any date, clear-on-cycle. */
export function useAdminAttendanceTracker(initialClassId?: string | number) {
  return useTeacherAttendanceTracker(initialClassId, {
    canEditAnyDate: true,
    allowClearOnCycle: true,
  });
}
