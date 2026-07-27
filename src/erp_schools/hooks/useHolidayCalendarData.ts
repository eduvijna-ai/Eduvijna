/**
 * useHolidayCalendarData — web HolidayCalendarTab parity.
 * Fetches by calendar year; CRUD for non-students; client-side type filters.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { holidaysApi } from '@core/api/erp.api';
import {
  extractErrorMessage,
  formatDisplayDate,
  pickNumber,
  pickString,
  safeList,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import {
  matchesHolidayFilter,
  normalizeHexColor,
  type HolidayFilterKey,
  type HolidayType,
} from '../utils/holidayMeta';
import { useSchoolsSession } from './useSchoolsSession';

export type HolidayItem = {
  id: string;
  holidayId: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string | null;
  holidayType: HolidayType | string;
  color: string | null;
  isActive: boolean;
  dateLabel: string;
  rangeLabel: string;
};

export type HolidayFormPayload = {
  name: string;
  holiday_type: string;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
  color?: string | null;
};

function mapHoliday(h: Record<string, unknown>, i: number): HolidayItem {
  const holidayId = pickNumber(h.id, i + 1);
  const start = pickString(h.start_date, h.date, h.holiday_date).slice(0, 10);
  const endRaw = pickString(h.end_date);
  const end = endRaw ? endRaw.slice(0, 10) : null;
  const name = pickString(h.name, h.title, h.holiday_name, 'Holiday');
  const startLabel = formatDisplayDate(start || null);
  const endLabel = end ? formatDisplayDate(end) : '';
  return {
    id: String(holidayId || `h-${i}`),
    holidayId,
    name,
    description: pickString(h.description),
    startDate: start,
    endDate: end,
    holidayType: pickString(h.holiday_type, h.type, 'other') || 'other',
    color: pickString(h.color) || null,
    isActive: h.is_active !== false,
    dateLabel: startLabel,
    rangeLabel: end && end !== start ? `${startLabel} – ${endLabel}` : startLabel,
  };
}

export function useHolidayCalendarData(initialYear?: number) {
  const { schoolId, isStudent } = useSchoolsSession();
  const canManage = !isStudent;
  const [year, setYear] = useState(initialYear ?? new Date().getFullYear());
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [filter, setFilter] = useState<HolidayFilterKey>('all');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const params: Record<string, number> = { year, per_page: 200 };
      if (schoolId) params.school_id = schoolId;
      const data = await holidaysApi.list(params);
      const mapped = safeList<Record<string, unknown>>(data)
        .map(mapHoliday)
        .filter((h) => h.isActive)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      setHolidays(mapped);
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setHolidays([]);
      setStatus('error');
    }
  }, [schoolId, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => holidays.filter((h) => matchesHolidayFilter(h.holidayType, filter)),
    [holidays, filter],
  );

  const todayStr = toLocalDateStr();

  const summary = useMemo(() => {
    const upcoming = holidays.filter((h) => h.startDate >= todayStr);
    // Prefer chronological next (mobile improvement; web takes first unsorted)
    const next = [...upcoming].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    return {
      upcoming: upcoming.length,
      academic: holidays.filter((h) => h.holidayType === 'academic').length,
      festivals: holidays.filter(
        (h) => h.holidayType === 'religious' || h.holidayType === 'cultural',
      ).length,
      total: holidays.length,
      nextHoliday: next ?? null,
    };
  }, [holidays, todayStr]);

  const getHoliday = useCallback(
    async (holidayId: number): Promise<HolidayItem | null> => {
      const cached = holidays.find((h) => h.holidayId === holidayId);
      if (cached) return cached;
      try {
        const raw = (await holidaysApi.get(holidayId, schoolId ?? undefined)) as Record<
          string,
          unknown
        >;
        const row = raw?.data && typeof raw.data === 'object' ? (raw.data as Record<string, unknown>) : raw;
        return mapHoliday(row, 0);
      } catch {
        return null;
      }
    },
    [holidays, schoolId],
  );

  const createHoliday = useCallback(
    async (payload: HolidayFormPayload) => {
      if (!schoolId) {
        setError('School not found.');
        return false;
      }
      setSaving(true);
      setError(null);
      try {
        await holidaysApi.create({
          school_id: schoolId,
          name: payload.name.trim(),
          description: payload.description?.trim() || null,
          start_date: payload.start_date,
          end_date: payload.end_date?.trim() || null,
          holiday_type: payload.holiday_type || 'national',
          color: normalizeHexColor(payload.color || ''),
        });
        await load();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, load],
  );

  const updateHoliday = useCallback(
    async (holidayId: number, payload: HolidayFormPayload) => {
      setSaving(true);
      setError(null);
      try {
        await holidaysApi.update(
          holidayId,
          {
            name: payload.name.trim(),
            description: payload.description?.trim() || null,
            start_date: payload.start_date,
            end_date: payload.end_date?.trim() || null,
            holiday_type: payload.holiday_type || 'national',
            color: normalizeHexColor(payload.color || ''),
          },
          schoolId ?? undefined,
        );
        await load();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, load],
  );

  const deleteHoliday = useCallback(
    async (holidayId: number) => {
      setSaving(true);
      setError(null);
      try {
        await holidaysApi.softDelete(holidayId, schoolId ?? undefined);
        await load();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, load],
  );

  return useMemo(
    () => ({
      year,
      setYear,
      holidays,
      filtered,
      filter,
      setFilter,
      summary,
      todayStr,
      status,
      error,
      saving,
      canManage,
      refetch: load,
      loading: status === 'loading' || status === 'idle',
      getHoliday,
      createHoliday,
      updateHoliday,
      deleteHoliday,
    }),
    [
      year,
      holidays,
      filtered,
      filter,
      summary,
      todayStr,
      status,
      error,
      saving,
      canManage,
      load,
      getHoliday,
      createHoliday,
      updateHoliday,
      deleteHoliday,
    ],
  );
}
