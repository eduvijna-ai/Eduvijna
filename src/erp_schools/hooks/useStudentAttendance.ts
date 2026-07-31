/**
 * useStudentAttendance — web StudentAttendancePanel parity.
 * APIs: attendanceRecordsApi, attendanceSettingsApi, timetableSlotsApi,
 *       classManagementSubjectsApi, lmsEnrollmentsApi (subject label resolution)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  attendanceRecordsApi,
  attendanceSettingsApi,
  classManagementSubjectsApi,
  lmsEnrollmentsApi,
  timetableSlotsApi,
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
import {
  inclusiveCalendarDays,
  resolveAcademicYearAttendancePeriod,
  ymd,
} from '../utils/studentDashboardMeta';
import { aggregateDailyAttendance, filterRecordsInPeriod } from '../utils/studentSubjectsMeta';
import { useSchoolsSession } from './useSchoolsSession';

export type AttStatusKey = 'present' | 'late' | 'absent' | 'leave';

export type SubjectAttRow = {
  id: number;
  name: string;
  code: string;
  present: number;
  late: number;
  absent: number;
  leave: number;
  total: number;
  attended: number;
  pct: number;
  statusLabel: string;
  statusTone: 'excellent' | 'good' | 'average' | 'risk';
};

export type DailyAttRow = {
  id: string;
  date: string;
  dayLabel: string;
  subject: string;
  status: AttStatusKey;
  remarks: string;
};

export function attendanceStatusLabel(
  pct: number,
  required: number,
): { label: string; tone: SubjectAttRow['statusTone'] } {
  if (pct >= Math.max(required + 10, 90)) return { label: 'Excellent', tone: 'excellent' };
  if (pct >= required) return { label: 'Good', tone: 'good' };
  if (pct >= required - 10) return { label: 'Average', tone: 'average' };
  return { label: 'At Risk', tone: 'risk' };
}

function normalizeStatus(raw: unknown): AttStatusKey {
  const s = String(raw || '').toLowerCase();
  if (s === 'present') return 'present';
  if (s === 'late') return 'late';
  if (s === 'excused' || s === 'leave') return 'leave';
  return 'absent';
}

function startOfWeekMonday(d: Date): Date {
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function useStudentAttendance() {
  const session = useSchoolsSession();
  const { selectedYear } = useAcademicYear();
  const today = useMemo(() => new Date(), []);
  const todayStr = toLocalDateStr(today);

  const defaultPeriod = useMemo(
    () =>
      resolveAcademicYearAttendancePeriod(
        selectedYear?.start_date,
        selectedYear?.end_date,
        today,
      ),
    [selectedYear?.start_date, selectedYear?.end_date, today],
  );

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [minRequired, setMinRequired] = useState(75);
  const [subjectNames, setSubjectNames] = useState<Record<number, string>>({});
  const [subjectCodes, setSubjectCodes] = useState<Record<number, string>>({});
  const [dateFrom, setDateFrom] = useState(defaultPeriod.periodStart);
  const [dateTo, setDateTo] = useState(defaultPeriod.periodEnd);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  useEffect(() => {
    const p = resolveAcademicYearAttendancePeriod(
      selectedYear?.start_date,
      selectedYear?.end_date,
      today,
    );
    setDateFrom(p.periodStart);
    setDateTo(p.periodEnd);
  }, [selectedYear?.start_date, selectedYear?.end_date, today]);

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setStatus('ready');
      return;
    }
    if (!session.schoolId) {
      setRecords([]);
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    const schoolId = session.schoolId;
    try {
      const [recRaw, settingsRaw, slotsRaw, subjectsRaw, classroomsRaw] = await Promise.all([
        attendanceRecordsApi.getAll({
          school_id: schoolId,
          date_from: dateFrom,
          date_to: dateTo,
          per_page: 10000,
        }),
        attendanceSettingsApi.get({ school_id: schoolId }).catch(() => null),
        timetableSlotsApi.myStudentTimetable(schoolId).catch(() => ({ items: [] })),
        classManagementSubjectsApi
          .list({ school_id: schoolId, per_page: 500 })
          .catch(() => ({ items: [] })),
        lmsEnrollmentsApi.myClassrooms(schoolId).catch(() => ({ items: [] })),
      ]);

      const items = safeList<Record<string, unknown>>(
        (recRaw as { items?: unknown })?.items ?? recRaw,
      );
      setRecords(items);

      const names: Record<number, string> = {};
      const codes: Record<number, string> = {};
      const ingest = (sid: number, name?: string, code?: string) => {
        if (!sid || !name) return;
        const clean = name.trim();
        // Ignore placeholder names like "Subject 14" (same as web)
        if (!clean || /^subject\s*\d+$/i.test(clean)) return;
        names[sid] = clean;
        if (code) codes[sid] = code.trim();
      };

      // 1) Master subjects catalog (web subjectsApi.getAll) — preferred labels/codes
      safeList<Record<string, unknown>>(subjectsRaw).forEach((s) => {
        ingest(
          pickNumber(s.id, s.subject_id),
          pickString(s.label, s.name, s.subject_name) || undefined,
          pickString(s.code, s.slug, s.subject_code) || undefined,
        );
      });

      // 2) Enrolled classrooms (often carry subject_id + display name)
      safeList<Record<string, unknown>>(classroomsRaw).forEach((c) => {
        const subjectInfo = (c.subject ?? c.subject_info ?? {}) as Record<string, unknown>;
        ingest(
          pickNumber(c.subject_id, subjectInfo.subject_id, subjectInfo.id),
          pickString(subjectInfo.subject_name, subjectInfo.name, c.subject_name, c.name) ||
            undefined,
          pickString(subjectInfo.code, subjectInfo.slug, c.subject_code) || undefined,
        );
      });

      // 3) Timetable slots
      safeList<Record<string, unknown>>(slotsRaw).forEach((s) => {
        ingest(
          pickNumber(s.subject_id),
          pickString(s.subject_name) || undefined,
          pickString(s.subject_code, s.code) || undefined,
        );
      });

      // 4) Names embedded on attendance records
      items.forEach((r) => {
        ingest(
          pickNumber(r.subject_id),
          pickString(r.subject_name) || undefined,
          pickString(r.subject_code, r.code) || undefined,
        );
      });

      // 5) Resolve remaining unknown IDs (web subjectsApi.getById)
      const missing = [
        ...new Set(
          items
            .map((r) => pickNumber(r.subject_id))
            .filter((id) => id > 0 && !names[id]),
        ),
      ];
      await Promise.all(
        missing.slice(0, 20).map(async (id) => {
          try {
            const raw = (await classManagementSubjectsApi.getById(id)) as Record<string, unknown>;
            const s = ((raw?.data as Record<string, unknown>) ?? raw) as Record<string, unknown>;
            ingest(
              id,
              pickString(s.label, s.name, s.subject_name) || undefined,
              pickString(s.code, s.slug, s.subject_code) || undefined,
            );
          } catch {
            /* ignore */
          }
        }),
      );

      setSubjectNames(names);
      setSubjectCodes(codes);

      const settings = (settingsRaw ?? {}) as Record<string, unknown>;
      const minPct = pickNumber(
        settings.min_attendance_percentage,
        (settings as { min_attendance_pct?: number }).min_attendance_pct,
      );
      setMinRequired(minPct > 0 ? minPct : 75);
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load attendance'));
      setRecords([]);
      setStatus('error');
    }
  }, [session.schoolId, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (subjectFilter === 'all') return records;
    const sid = Number(subjectFilter);
    return records.filter((r) => pickNumber(r.subject_id) === sid);
  }, [records, subjectFilter]);

  const subjectOptions = useMemo(() => {
    const ids = new Set<number>();
    records.forEach((r) => {
      const sid = pickNumber(r.subject_id);
      if (sid) ids.add(sid);
    });
    Object.keys(subjectNames).forEach((k) => ids.add(Number(k)));
    return [...ids]
      .sort((a, b) => (subjectNames[a] || '').localeCompare(subjectNames[b] || ''))
      .map((id) => ({
        key: String(id),
        label: subjectNames[id] || `Subject ${id}`,
      }));
  }, [records, subjectNames]);

  const resolveSubjectName = useCallback(
    (sid?: number | null) => {
      if (!sid) return 'General / Class';
      return subjectNames[sid] || `Subject ${sid}`;
    },
    [subjectNames],
  );

  const metrics = useMemo(() => {
    const agg = aggregateDailyAttendance(filtered);
    const calendarTotal = inclusiveCalendarDays(dateFrom, dateTo);
    const attended = agg.present + agg.late;
    const missed = Math.max(0, calendarTotal - attended);
    const absentTillDate = Math.max(
      agg.absent,
      Math.max(0, calendarTotal - (agg.present + agg.late + agg.leave)),
    );
    const pct =
      calendarTotal > 0
        ? Math.round((attended / calendarTotal) * 1000) / 10
        : agg.markedDays > 0
          ? Math.round((attended / agg.markedDays) * 1000) / 10
          : 0;
    return {
      present: agg.present,
      late: agg.late,
      absent: absentTillDate,
      leave: agg.leave,
      markedDays: agg.markedDays,
      calendarTotal,
      attended,
      missed,
      pct,
    };
  }, [filtered, dateFrom, dateTo]);

  const monthTrend = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();
    filtered.forEach((r) => {
      const d = ymd(pickString(r.date));
      if (!d) return;
      const key = d.slice(0, 7);
      const bucket = map.get(key) || { present: 0, total: 0 };
      bucket.total += 1;
      const st = normalizeStatus(r.status);
      if (st === 'present' || st === 'late') bucket.present += 1;
      map.set(key, bucket);
    });
    const months = [
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
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([key, v]) => ({
        label: `${months[Number(key.slice(5, 7)) - 1] || key}`,
        value: v.total ? Math.round((v.present / v.total) * 100) : 0,
      }));
  }, [filtered]);

  const subjectRows: SubjectAttRow[] = useMemo(() => {
    const map = new Map<
      number,
      {
        id: number;
        name: string;
        code: string;
        present: number;
        late: number;
        absent: number;
        leave: number;
        total: number;
      }
    >();
    filtered.forEach((r) => {
      const sid = pickNumber(r.subject_id) || 0;
      const name = resolveSubjectName(sid || null);
      const row = map.get(sid) || {
        id: sid,
        name,
        code: sid ? subjectCodes[sid] || `SUB${String(sid).padStart(2, '0')}` : 'GEN',
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
        total: 0,
      };
      row.name = name;
      row.total += 1;
      const st = normalizeStatus(r.status);
      if (st === 'present') row.present += 1;
      else if (st === 'late') row.late += 1;
      else if (st === 'leave') row.leave += 1;
      else row.absent += 1;
      map.set(sid, row);
    });
    return [...map.values()]
      .map((r) => {
        const attended = r.present + r.late;
        const pct = r.total ? Math.round((attended / r.total) * 1000) / 10 : 0;
        const st = attendanceStatusLabel(pct, minRequired);
        return {
          ...r,
          attended,
          pct,
          statusLabel: st.label,
          statusTone: st.tone,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, resolveSubjectName, subjectCodes, minRequired]);

  const subjectOverall = useMemo(() => {
    const total = subjectRows.reduce((s, r) => s + r.total, 0);
    const attended = subjectRows.reduce((s, r) => s + r.attended, 0);
    const absent = subjectRows.reduce((s, r) => s + r.absent, 0);
    const late = subjectRows.reduce((s, r) => s + r.late, 0);
    const pct = total ? Math.round((attended / total) * 1000) / 10 : 0;
    return { total, attended, absent, late, pct };
  }, [subjectRows]);

  const dailyRows: DailyAttRow[] = useMemo(() => {
    return [...filtered]
      .sort((a, b) => pickString(b.date).localeCompare(pickString(a.date)))
      .map((r, i) => {
        const date = ymd(pickString(r.date));
        const d = date ? new Date(`${date}T12:00:00`) : null;
        return {
          id: pickString(r.id, `att-${i}`),
          date,
          dayLabel: d
            ? d.toLocaleDateString('en-IN', { weekday: 'short' })
            : '—',
          subject: resolveSubjectName(pickNumber(r.subject_id) || null),
          status: normalizeStatus(r.status),
          remarks: pickString(r.remarks) || '—',
        };
      });
  }, [filtered, resolveSubjectName]);

  const todayStatus = useMemo(() => {
    const todays = records.filter((r) => ymd(pickString(r.date)) === todayStr);
    if (todays.length === 0) return null as AttStatusKey | null;
    if (todays.some((r) => normalizeStatus(r.status) === 'absent')) return 'absent';
    if (todays.some((r) => normalizeStatus(r.status) === 'late')) return 'late';
    if (todays.every((r) => normalizeStatus(r.status) === 'present')) return 'present';
    if (todays.some((r) => normalizeStatus(r.status) === 'leave')) return 'leave';
    return 'present';
  }, [records, todayStr]);

  const weekSummary = useMemo(() => {
    const monday = startOfWeekMonday(today);
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(toLocalDateStr(d));
    }
    const weekRecords = records.filter((r) => {
      const d = ymd(pickString(r.date));
      return d && days.includes(d);
    });
    return aggregateDailyAttendance(weekRecords);
  }, [records, today]);

  const calStatusByDate = useMemo(() => {
    const map = new Map<string, AttStatusKey>();
    const priority: Record<AttStatusKey, number> = {
      absent: 3,
      late: 2,
      leave: 2,
      present: 1,
    };
    const monthStart = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
    const monthEnd = toLocalDateStr(new Date(calYear, calMonth + 1, 0));
    filterRecordsInPeriod(records, monthStart, monthEnd).forEach((r) => {
      const d = ymd(pickString(r.date));
      if (!d) return;
      const st = normalizeStatus(r.status);
      const prev = map.get(d);
      if (!prev || priority[st] > priority[prev]) map.set(d, st);
    });
    return map;
  }, [records, calMonth, calYear]);

  const monthCells = useMemo(() => {
    const firstDow = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstDow + 1;
      if (day < 1 || day > daysInMonth) {
        return { day: null as number | null, date: '', status: null as AttStatusKey | null, isToday: false };
      }
      const date = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        day,
        date,
        status: calStatusByDate.get(date) ?? null,
        isToday: date === todayStr,
      };
    });
  }, [calYear, calMonth, calStatusByDate, todayStr]);

  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const applyPeriod = useCallback((from: string, to: string) => {
    setDateFrom(from.slice(0, 10));
    setDateTo(to.slice(0, 10));
  }, []);

  const resetToAcademicYear = useCallback(() => {
    setDateFrom(defaultPeriod.periodStart);
    setDateTo(defaultPeriod.periodEnd);
    setSubjectFilter('all');
  }, [defaultPeriod]);

  const shiftMonth = useCallback((delta: number) => {
    setCalMonth((m) => {
      const d = new Date(calYear, m + delta, 1);
      setCalYear(d.getFullYear());
      return d.getMonth();
    });
  }, [calYear]);

  return useMemo(
    () => ({
      status,
      error,
      refetch: load,
      dateFrom,
      dateTo,
      setDateFrom,
      setDateTo,
      applyPeriod,
      resetToAcademicYear,
      subjectFilter,
      setSubjectFilter,
      subjectOptions,
      minRequired,
      metrics,
      monthTrend,
      subjectRows,
      subjectOverall,
      dailyRows,
      todayStatus,
      todayStr,
      weekSummary,
      monthLabel,
      monthCells,
      shiftMonth,
      hasRecords: records.length > 0,
      yearLabel: selectedYear?.name ?? '',
    }),
    [
      status,
      error,
      load,
      dateFrom,
      dateTo,
      applyPeriod,
      resetToAcademicYear,
      subjectFilter,
      subjectOptions,
      minRequired,
      metrics,
      monthTrend,
      subjectRows,
      subjectOverall,
      dailyRows,
      todayStatus,
      todayStr,
      weekSummary,
      monthLabel,
      monthCells,
      shiftMonth,
      records.length,
      selectedYear?.name,
    ],
  );
}
