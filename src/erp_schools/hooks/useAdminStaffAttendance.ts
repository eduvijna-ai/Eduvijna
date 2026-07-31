/**
 * useAdminStaffAttendance — web StaffAttendanceSection (admin).
 * APIs: staffProfilesApi.list, attendanceSettingsApi, staffAttendanceApi
 * Half-day 1H/2H marking, pending approvals, bulk upsert.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  attendanceSettingsApi,
  staffAttendanceApi,
  staffProfilesApi,
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
import type { ViewPeriod } from './useTeacherAttendanceTracker';

export type HalfStatus = 'present' | 'absent';
export type HalfDayCell = { first_half: HalfStatus; second_half: HalfStatus };

export type StaffRosterMember = {
  profileId: number;
  userId: number;
  name: string;
  employeeCode: string;
  department: string;
  designation: string;
};

export type PendingApproval = {
  id: number;
  staffUserId: number;
  staffName: string;
  date: string;
  firstHalf: HalfStatus;
  secondHalf: HalfStatus;
};

export type StaffAttMetrics = {
  totalStaff: number;
  presentToday: number;
  halfDayToday: number;
  absentToday: number;
  workingDays: number;
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

function defaultCell(): HalfDayCell {
  return { first_half: 'absent', second_half: 'absent' };
}

function dayValue(cell: HalfDayCell): number {
  const fh = cell.first_half === 'present' ? 1 : 0;
  const sh = cell.second_half === 'present' ? 1 : 0;
  return (fh + sh) * 0.5;
}

function mapStaff(r: Record<string, unknown>): StaffRosterMember | null {
  const userId = pickNumber(r.user_id);
  if (!userId) return null;
  if (r.is_active === false) return null;
  const first = pickString(r.first_name);
  const last = pickString(r.last_name);
  const name =
    [first, last].filter(Boolean).join(' ') ||
    pickString(r.full_name, r.name, 'Staff');
  return {
    profileId: pickNumber(r.id),
    userId,
    name,
    employeeCode: pickString(r.employee_code, r.employee_id, '—'),
    department: pickString(r.department, '—'),
    designation: pickString(r.designation, '—'),
  };
}

export function useAdminStaffAttendance() {
  const session = useSchoolsSession();
  const { selectedYear } = useAcademicYear();
  const schoolId = session.schoolId ?? undefined;
  const todayStr = toLocalDateStr();

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);

  const [roster, setRoster] = useState<StaffRosterMember[]>([]);
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('month');
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [department, setDepartment] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [bulkFirst, setBulkFirst] = useState<HalfStatus>('present');
  const [bulkSecond, setBulkSecond] = useState<HalfStatus>('present');

  const [workingDates, setWorkingDates] = useState<string[]>([]);
  const [baseAttendance, setBaseAttendance] = useState<
    Record<number, Record<string, HalfDayCell>>
  >({});
  const [localEdits, setLocalEdits] = useState<
    Record<number, Record<string, HalfDayCell>>
  >({});
  const [pending, setPending] = useState<PendingApproval[]>([]);

  const filteredRoster = useMemo(() => {
    let rows = roster;
    if (department !== 'all') {
      rows = rows.filter((s) => s.department === department);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.employeeCode.toLowerCase().includes(q),
      );
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [roster, department, query]);

  const departmentOptions = useMemo(() => {
    const deps = [
      ...new Set(roster.map((s) => s.department).filter((d) => d && d !== '—')),
    ].sort();
    return deps;
  }, [roster]);

  const nameByUserId = useMemo(() => {
    const map = new Map<number, string>();
    roster.forEach((s) => map.set(s.userId, s.name));
    return map;
  }, [roster]);

  const getCell = useCallback(
    (userId: number, date: string): HalfDayCell => {
      return (
        localEdits[userId]?.[date] ||
        baseAttendance[userId]?.[date] ||
        defaultCell()
      );
    },
    [localEdits, baseAttendance],
  );

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
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

      const [staffRaw, settingsRaw, recordsRaw, pendingRaw] = await Promise.all([
        staffProfilesApi.list({ school_id: schoolId, per_page: 200 }),
        attendanceSettingsApi.get({ school_id: schoolId }).catch(() => null),
        staffAttendanceApi.getAll({
          date_from: range.from,
          date_to: range.to,
          school_id: schoolId,
          per_page: 50000,
        }),
        staffAttendanceApi.pendingApprovals({ school_id: schoolId }).catch(() => []),
      ]);

      const staff = safeList<Record<string, unknown>>(staffRaw)
        .map(mapStaff)
        .filter((s): s is StaffRosterMember => !!s);
      setRoster(staff);

      const settingsObj = (settingsRaw && typeof settingsRaw === 'object'
        ? ((settingsRaw as { data?: unknown }).data ?? settingsRaw)
        : null) as Record<string, unknown> | null;
      const workingCsv = pickString(settingsObj?.working_days, 'mon,tue,wed,thu,fri,sat');
      const workingNames = new Set(
        workingCsv.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean),
      );
      if (!workingNames.has('sat')) workingNames.add('sat');
      const dates = buildWorkingDates(range.from, range.to, workingNames);
      setWorkingDates(dates);
      setSelectedDate((prev) =>
        dates.includes(prev)
          ? prev
          : dates.includes(todayStr)
            ? todayStr
            : dates[dates.length - 1] || todayStr,
      );

      const nextBase: Record<number, Record<string, HalfDayCell>> = {};
      safeList<Record<string, unknown>>(recordsRaw).forEach((r) => {
        const uid = pickNumber(r.staff_user_id, r.user_id);
        const date = pickString(r.date).slice(0, 10);
        if (!uid || !date) return;
        const fh = pickString(r.first_half, 'absent').toLowerCase() as HalfStatus;
        const sh = pickString(r.second_half, 'absent').toLowerCase() as HalfStatus;
        if (!nextBase[uid]) nextBase[uid] = {};
        nextBase[uid][date] = {
          first_half: fh === 'present' ? 'present' : 'absent',
          second_half: sh === 'present' ? 'present' : 'absent',
        };
      });
      setBaseAttendance(nextBase);
      setLocalEdits({});

      const pendingList = safeList<Record<string, unknown>>(pendingRaw).map((r) => {
        const uid = pickNumber(r.staff_user_id, r.user_id);
        return {
          id: pickNumber(r.id),
          staffUserId: uid,
          staffName: pickString(r.staff_name, r.name) || `Staff #${uid}`,
          date: pickString(r.date).slice(0, 10),
          firstHalf: (pickString(r.first_half, 'absent').toLowerCase() === 'present'
            ? 'present'
            : 'absent') as HalfStatus,
          secondHalf: (pickString(r.second_half, 'absent').toLowerCase() === 'present'
            ? 'present'
            : 'absent') as HalfStatus,
        };
      });
      setPending(pendingList);
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load staff attendance'));
      setStatus('error');
    }
  }, [viewPeriod, month, year, selectedYear?.start_date, selectedYear?.end_date, schoolId, todayStr]);

  useEffect(() => {
    void load();
  }, [load]);

  // Resolve pending names after roster loads
  useEffect(() => {
    if (!roster.length || !pending.length) return;
    setPending((prev) =>
      prev.map((p) => ({
        ...p,
        staffName: nameByUserId.get(p.staffUserId) || p.staffName,
      })),
    );
  }, [roster, nameByUserId]);

  const toggleHalf = useCallback(
    (userId: number, date: string, half: 'first_half' | 'second_half') => {
      setLocalEdits((prev) => {
        const current = prev[userId]?.[date] || baseAttendance[userId]?.[date] || defaultCell();
        const nextHalf: HalfStatus =
          current[half] === 'present' ? 'absent' : 'present';
        return {
          ...prev,
          [userId]: {
            ...(prev[userId] || {}),
            [date]: { ...current, [half]: nextHalf },
          },
        };
      });
    },
    [baseAttendance],
  );

  const setHalf = useCallback(
    (userId: number, date: string, half: 'first_half' | 'second_half', value: HalfStatus) => {
      setLocalEdits((prev) => {
        const current = prev[userId]?.[date] || baseAttendance[userId]?.[date] || defaultCell();
        return {
          ...prev,
          [userId]: {
            ...(prev[userId] || {}),
            [date]: { ...current, [half]: value },
          },
        };
      });
    },
    [baseAttendance],
  );

  const applyBulk = useCallback(
    (date: string) => {
      setLocalEdits((prev) => {
        const next = { ...prev };
        filteredRoster.forEach((s) => {
          next[s.userId] = {
            ...(next[s.userId] || {}),
            [date]: { first_half: bulkFirst, second_half: bulkSecond },
          };
        });
        return next;
      });
    },
    [filteredRoster, bulkFirst, bulkSecond],
  );

  const hasEdits = useMemo(
    () => Object.values(localEdits).some((edits) => Object.keys(edits).length > 0),
    [localEdits],
  );

  const clearEdits = useCallback(() => setLocalEdits({}), []);

  const saveChanges = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const dateMap: Record<
        string,
        Array<{ staff_user_id: number; first_half: HalfStatus; second_half: HalfStatus }>
      > = {};
      Object.entries(localEdits).forEach(([uid, edits]) => {
        Object.entries(edits).forEach(([date, cell]) => {
          const base = baseAttendance[Number(uid)]?.[date];
          if (
            base &&
            base.first_half === cell.first_half &&
            base.second_half === cell.second_half
          ) {
            return;
          }
          if (!dateMap[date]) dateMap[date] = [];
          dateMap[date].push({
            staff_user_id: Number(uid),
            first_half: cell.first_half,
            second_half: cell.second_half,
          });
        });
      });

      await Promise.all(
        Object.entries(dateMap).map(([date, records]) =>
          staffAttendanceApi.bulkUpsert({
            school_id: schoolId,
            date,
            records,
          }),
        ),
      );
      await load();
      return true;
    } catch (e) {
      setError(extractErrorMessage(e, 'Save failed'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [localEdits, baseAttendance, schoolId, load]);

  const approveOne = useCallback(
    async (id: number, action: 'approved' | 'rejected') => {
      try {
        await staffAttendanceApi.approveRecord(id, action, schoolId);
        await load();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Approval failed'));
        return false;
      }
    },
    [schoolId, load],
  );

  const approveAll = useCallback(async () => {
    if (!pending.length) return false;
    setApprovingAll(true);
    try {
      await Promise.all(
        pending.map((p) => staffAttendanceApi.approveRecord(p.id, 'approved', schoolId)),
      );
      await load();
      return true;
    } catch (e) {
      setError(extractErrorMessage(e, 'Approve all failed'));
      return false;
    } finally {
      setApprovingAll(false);
    }
  }, [pending, schoolId, load]);

  const metrics: StaffAttMetrics = useMemo(() => {
    const todayInRange = workingDates.includes(todayStr);
    let presentToday = 0;
    let halfDayToday = 0;
    let absentToday = 0;
    if (todayInRange) {
      filteredRoster.forEach((s) => {
        const cell = getCell(s.userId, todayStr);
        const v = dayValue(cell);
        if (v === 1) presentToday += 1;
        else if (v === 0.5) halfDayToday += 1;
        else absentToday += 1;
      });
    }
    return {
      totalStaff: filteredRoster.length,
      presentToday,
      halfDayToday,
      absentToday,
      workingDays: workingDates.length,
    };
  }, [workingDates, todayStr, filteredRoster, getCell]);

  const dayCounts = useMemo(() => {
    const map: Record<
      string,
      { present: number; half: number; absent: number }
    > = {};
    workingDates.forEach((d) => {
      let present = 0;
      let half = 0;
      let absent = 0;
      filteredRoster.forEach((s) => {
        const v = dayValue(getCell(s.userId, d));
        if (v === 1) present += 1;
        else if (v === 0.5) half += 1;
        else absent += 1;
      });
      map[d] = { present, half, absent };
    });
    return map;
  }, [workingDates, filteredRoster, getCell]);

  const staffSummaries = useMemo(() => {
    return filteredRoster.map((s) => {
      let p = 0;
      let h = 0;
      let a = 0;
      let value = 0;
      workingDates.forEach((d) => {
        const cell = getCell(s.userId, d);
        const v = dayValue(cell);
        value += v;
        if (v === 1) p += 1;
        else if (v === 0.5) h += 1;
        else a += 1;
      });
      const denom = workingDates.length || 1;
      const pct = Math.round((value / denom) * 1000) / 10;
      const risk =
        workingDates.length === 0
          ? 'OK'
          : pct < 45
            ? 'Critical'
            : pct < 75
              ? 'Low Attendance'
              : 'OK';
      const selected = getCell(s.userId, selectedDate);
      return {
        ...s,
        present: p,
        halfDay: h,
        absent: a,
        dayValue: value,
        pct,
        risk,
        selected,
      };
    });
  }, [filteredRoster, workingDates, getCell, selectedDate]);

  return {
    status,
    error,
    saving,
    approvingAll,
    todayStr,
    viewPeriod,
    setViewPeriod,
    month,
    setMonth,
    year,
    setYear,
    department,
    setDepartment,
    query,
    setQuery,
    selectedDate,
    setSelectedDate,
    bulkFirst,
    setBulkFirst,
    bulkSecond,
    setBulkSecond,
    departmentOptions,
    workingDates,
    pending,
    metrics,
    dayCounts,
    staffSummaries,
    getCell,
    toggleHalf,
    setHalf,
    applyBulk,
    hasEdits,
    clearEdits,
    saveChanges,
    approveOne,
    approveAll,
    refetch: load,
  };
}
