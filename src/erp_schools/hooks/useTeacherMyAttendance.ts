/**
 * useTeacherMyAttendance — web MyAttendanceSection for instructor/staff.
 * APIs: staffAttendanceApi.getAll | bulkUpsert | pendingApprovals | approveRecord
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { staffAttendanceApi as staffAttendanceApiExport } from '@core/api/erp.api';
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

/** Resolve at call-time so require-cycle / Fast Refresh never leaves a stale undefined binding. */
function staffAttendanceApi() {
  const api = staffAttendanceApiExport;
  if (!api || typeof api.getAll !== 'function') {
    throw new Error(
      'staffAttendanceApi is unavailable. Reload the app (or run expo start -c).',
    );
  }
  return api;
}

export type HalfStatus = 'present' | 'absent';

export type StaffAttRecord = {
  id: number;
  date: string;
  firstHalf: HalfStatus | string;
  secondHalf: HalfStatus | string;
  status: string;
  dayValue: number;
  approvalStatus: string;
  submissionType: string;
  remarks: string;
};

export type StaffAttMetrics = {
  workingDays: number;
  recorded: number;
  present: number;
  halfDay: number;
  absent: number;
  leave: number;
  dayValue: number;
  pct: number;
};

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

function buildMonFriDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) dates.push(toLocalDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
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

function mapRecord(r: Record<string, unknown>, i: number): StaffAttRecord {
  return {
    id: pickNumber(r.id, i + 1),
    date: pickString(r.date).slice(0, 10),
    firstHalf: pickString(r.first_half, 'absent'),
    secondHalf: pickString(r.second_half, 'absent'),
    status: pickString(r.status, '—'),
    dayValue: pickNumber(r.day_value),
    approvalStatus: pickString(r.approval_status, 'pending'),
    submissionType: pickString(r.submission_type, 'self'),
    remarks: pickString(r.remarks) || '—',
  };
}

export function useTeacherMyAttendance() {
  const session = useSchoolsSession();
  const { selectedYear } = useAcademicYear();
  const schoolId = session.schoolId ?? undefined;
  const userId = session.userId ?? undefined;
  const todayStr = toLocalDateStr();

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [selfMsg, setSelfMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('current-week');
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');

  const [records, setRecords] = useState<StaffAttRecord[]>([]);
  const [pendingFromAdmin, setPendingFromAdmin] = useState<StaffAttRecord[]>([]);
  const [selfFirst, setSelfFirst] = useState<HalfStatus>('present');
  const [selfSecond, setSelfSecond] = useState<HalfStatus>('present');

  const dateRange = useMemo(
    () =>
      getDateRange(
        viewPeriod,
        month,
        year,
        selectedYear?.start_date,
        selectedYear?.end_date,
      ),
    [viewPeriod, month, year, selectedYear?.start_date, selectedYear?.end_date],
  );

  const workingDates = useMemo(
    () => buildMonFriDates(dateRange.from, dateRange.to),
    [dateRange.from, dateRange.to],
  );

  const weekGroups = useMemo(() => buildWeekGroups(workingDates), [workingDates]);

  const recordMap = useMemo(() => {
    const map: Record<string, StaffAttRecord> = {};
    records.forEach((r) => {
      map[r.date] = r;
    });
    return map;
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (approvalFilter !== 'all' && r.approvalStatus !== approvalFilter) return false;
      return true;
    });
  }, [records, statusFilter, approvalFilter]);

  const metrics: StaffAttMetrics = useMemo(() => {
    const present = filteredRecords.filter((r) => r.status === 'present').length;
    const halfDay = filteredRecords.filter((r) => r.status === 'half_day').length;
    const absent = filteredRecords.filter((r) => r.status === 'absent').length;
    const leave = filteredRecords.filter((r) => r.status === 'leave').length;
    const recorded = filteredRecords.length;
    const dayValue = filteredRecords.reduce((sum, r) => sum + (r.dayValue || 0), 0);
    const pct = recorded > 0 ? Math.round((dayValue / recorded) * 1000) / 10 : 0;
    return {
      workingDays: workingDates.length,
      recorded,
      present,
      halfDay,
      absent,
      leave,
      dayValue: Math.round(dayValue * 10) / 10,
      pct,
    };
  }, [filteredRecords, workingDates.length]);

  const gridSummary = useMemo(() => {
    let gridP = 0;
    let gridH = 0;
    let gridA = 0;
    let gridVal = 0;
    workingDates.forEach((ds) => {
      const rec = recordMap[ds];
      if (!rec) return;
      const fh = rec.firstHalf === 'present' ? 1 : 0;
      const sh = rec.secondHalf === 'present' ? 1 : 0;
      gridVal += (fh + sh) * 0.5;
      if (fh && sh) gridP += 1;
      else if (fh || sh) gridH += 1;
      else gridA += 1;
    });
    const pct =
      workingDates.length > 0
        ? Math.round((gridVal / workingDates.length) * 1000) / 10
        : 0;
    const risk =
      pct < 50 ? 'Critical' : pct < 75 ? 'Low Attendance' : 'OK';
    return { gridP, gridH, gridA, pct, risk };
  }, [workingDates, recordMap]);

  const load = useCallback(async () => {
    if (USE_MOCK_DATA || !userId) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const raw = await staffAttendanceApi().getAll({
        staff_user_id: userId,
        date_from: dateRange.from,
        date_to: dateRange.to,
        school_id: schoolId,
        per_page: 10000,
      });
      const mapped = safeList<Record<string, unknown>>(raw).map(mapRecord);
      setRecords(mapped);

      const todayRec = mapped.find((r) => r.date === todayStr);
      if (todayRec) {
        setSelfFirst(
          todayRec.firstHalf === 'present' ? 'present' : 'absent',
        );
        setSelfSecond(
          todayRec.secondHalf === 'present' ? 'present' : 'absent',
        );
      }

      try {
        const pendingRaw = await staffAttendanceApi().pendingApprovals({
          school_id: schoolId,
        });
        setPendingFromAdmin(
          safeList<Record<string, unknown>>(pendingRaw).map(mapRecord),
        );
      } catch {
        setPendingFromAdmin([]);
      }

      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load attendance'));
      setStatus('error');
    }
  }, [userId, schoolId, dateRange.from, dateRange.to, todayStr]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSelfFirst = useCallback(() => {
    setSelfFirst((v) => (v === 'present' ? 'absent' : 'present'));
    setSelfMsg(null);
  }, []);

  const toggleSelfSecond = useCallback(() => {
    setSelfSecond((v) => (v === 'present' ? 'absent' : 'present'));
    setSelfMsg(null);
  }, []);

  const submitForDate = useCallback(
    async (
      date: string,
      first: HalfStatus,
      second: HalfStatus,
      remarks?: string,
    ) => {
      if (!userId) return false;
      if (date > todayStr) {
        setSelfMsg('Cannot mark attendance for a future date.');
        return false;
      }
      setSaving(true);
      setSelfMsg(null);
      setError(null);
      try {
        await staffAttendanceApi().bulkUpsert({
          school_id: schoolId,
          date,
          records: [
            {
              staff_user_id: userId,
              first_half: first,
              second_half: second,
              ...(remarks?.trim() ? { remarks: remarks.trim() } : {}),
            },
          ],
        });
        setSelfMsg(
          date === todayStr
            ? 'Attendance submitted for approval!'
            : `Attendance submitted for ${date}.`,
        );
        await load();
        return true;
      } catch (e) {
        const msg = extractErrorMessage(e, 'Failed to submit');
        setSelfMsg(msg);
        setError(msg);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [userId, schoolId, todayStr, load],
  );

  const submitToday = useCallback(async () => {
    return submitForDate(todayStr, selfFirst, selfSecond);
  }, [submitForDate, todayStr, selfFirst, selfSecond]);

  const approvePending = useCallback(
    async (recordId: number, action: 'approved' | 'rejected') => {
      setApprovingId(recordId);
      try {
        await staffAttendanceApi().approveRecord(recordId, action, schoolId);
        setPendingFromAdmin((prev) => prev.filter((r) => r.id !== recordId));
        await load();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Approval failed'));
        return false;
      } finally {
        setApprovingId(null);
      }
    },
    [schoolId, load],
  );

  return {
    status,
    error,
    selfMsg,
    saving,
    approvingId,
    todayStr,
    viewPeriod,
    setViewPeriod,
    month,
    setMonth,
    year,
    setYear,
    statusFilter,
    setStatusFilter,
    approvalFilter,
    setApprovalFilter,
    records,
    filteredRecords,
    pendingFromAdmin,
    selfFirst,
    selfSecond,
    toggleSelfFirst,
    toggleSelfSecond,
    submitToday,
    submitForDate,
    approvePending,
    workingDates,
    weekGroups,
    recordMap,
    metrics,
    gridSummary,
    refetch: load,
  };
}
