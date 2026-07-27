/**
 * useTeacherTimetable — Instructor Timetable seam (web TimetableTab PersonalWeeklyTimetable).
 * APIs: timetableSlotsApi.myTeacherTimetable, timetableTemplatesApi.list
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { timetableSlotsApi, timetableTemplatesApi } from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import {
  extractErrorMessage,
  formatDisplayTime,
  pickNumber,
  pickString,
  safeList,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type TeacherTimetableSlot = {
  id: string;
  templateId: number;
  dayOfWeek: number;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
  sectionName: string;
  room: string;
  slotType: string;
  teacherName: string;
};

type TemplateMeta = {
  id: number;
  effectiveFrom?: string;
  effectiveTo?: string;
};

export type PeriodRow = { period: number; start?: string; end?: string };

export type WeekDayChip = {
  key: number;
  label: string;
  full: string;
  date: Date;
  dateLabel: string;
  isToday: boolean;
};

const SLOT_ACCENT: Record<string, 'teal' | 'blue' | 'green' | 'orange' | 'purple' | 'pink'> = {
  lecture: 'teal',
  lab: 'blue',
  tutorial: 'green',
  assembly: 'teal',
  library: 'blue',
  sports: 'green',
  break: 'orange',
  free: 'orange',
};

function normalizeYMD(v?: string | null): string | undefined {
  if (!v) return undefined;
  return v.slice(0, 10);
}

function isWithinDateRange(dateYMD: string, from?: string | null, to?: string | null): boolean {
  const f = normalizeYMD(from);
  const t = normalizeYMD(to);
  if (f && dateYMD < f) return false;
  if (t && dateYMD > t) return false;
  return true;
}

function isDateInTemplateRange(dateYMD: string, template?: TemplateMeta): boolean {
  if (!template) return true;
  return isWithinDateRange(dateYMD, template.effectiveFrom, template.effectiveTo);
}

function mapSlot(raw: Record<string, unknown>, index: number): TeacherTimetableSlot {
  return {
    id: pickString(raw.id, `slot-${index}`),
    templateId: pickNumber(raw.template_id),
    dayOfWeek: pickNumber(raw.day_of_week),
    periodNumber: pickNumber(raw.period_number, index + 1),
    startTime: pickString(raw.start_time),
    endTime: pickString(raw.end_time),
    subjectName: pickString(raw.subject_name, raw.slot_type, 'Period'),
    className: pickString(raw.class_name),
    sectionName: pickString(raw.section_name),
    room: pickString(raw.room),
    slotType: pickString(raw.slot_type, 'lecture'),
    teacherName: pickString(raw.teacher_name),
  };
}

function startOfWeekMonday(base: Date, weekOffset: number): Date {
  const now = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const day = (now.getDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function slotAccent(slotType: string) {
  return SLOT_ACCENT[slotType] ?? 'teal';
}

export function fmtSlotTime(t?: string): string {
  return formatDisplayTime(t) || '—';
}

export function useTeacherTimetable() {
  const session = useSchoolsSession();
  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<TeacherTimetableSlot[]>([]);
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => (new Date().getDay() + 6) % 7);

  const templateById = useMemo(() => {
    const map = new Map<number, TemplateMeta>();
    templates.forEach((t) => map.set(t.id, t));
    return map;
  }, [templates]);

  const slotVisibleOnDate = useCallback(
    (slot: TeacherTimetableSlot, dateYMD: string) => {
      const tmpl = templateById.get(slot.templateId);
      return isDateInTemplateRange(dateYMD, tmpl);
    },
    [templateById],
  );

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    const schoolId = session.schoolId ?? undefined;
    try {
      const [slotsRaw, templatesRaw] = await Promise.all([
        timetableSlotsApi.myTeacherTimetable(schoolId),
        timetableTemplatesApi
          .list({ school_id: schoolId, per_page: 200 })
          .catch(() => ({ items: [] })),
      ]);

      setSlots(safeList<Record<string, unknown>>(slotsRaw).map(mapSlot));
      setTemplates(
        safeList<Record<string, unknown>>(templatesRaw).map((t) => ({
          id: pickNumber(t.id),
          effectiveFrom: pickString(t.effective_from) || undefined,
          effectiveTo: pickString(t.effective_to) || undefined,
        })),
      );
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load timetable'));
      setSlots([]);
      setStatus('error');
    }
  }, [session.schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Clamp selected day to Mon–Sat; default to today when returning to current week
  useEffect(() => {
    if (weekOffset === 0) {
      const todayIdx = (new Date().getDay() + 6) % 7;
      setSelectedDay(todayIdx <= 5 ? todayIdx : 0);
    } else if (selectedDay > 5) {
      setSelectedDay(0);
    }
  }, [weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  const monday = useMemo(() => startOfWeekMonday(new Date(), weekOffset), [weekOffset]);

  const weekDates = useMemo(
    () =>
      DAY_NAMES.map((_, index) => {
        const value = new Date(monday);
        value.setDate(monday.getDate() + index);
        return value;
      }),
    [monday],
  );

  const weekLabel = useMemo(() => {
    const end = weekDates[5];
    const startStr = monday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const endStr = end.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${startStr} – ${endStr}`;
  }, [monday, weekDates]);

  const isCurrentWeek = weekOffset === 0;
  const todayIndex = (new Date().getDay() + 6) % 7;
  const todayYMD = toLocalDateStr(new Date());

  const weekDays: WeekDayChip[] = useMemo(
    () =>
      weekDates.map((date, index) => ({
        key: index,
        label: DAY_NAMES[index],
        full: DAY_FULL[index],
        date,
        dateLabel: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        isToday: isCurrentWeek && index === todayIndex,
      })),
    [weekDates, isCurrentWeek, todayIndex],
  );

  const periodRows: PeriodRow[] = useMemo(() => {
    const rows = new Map<number, PeriodRow>();
    slots.forEach((slot) => {
      if (!rows.has(slot.periodNumber)) {
        rows.set(slot.periodNumber, {
          period: slot.periodNumber,
          start: slot.startTime,
          end: slot.endTime,
        });
      }
    });
    return Array.from(rows.values()).sort((a, b) => a.period - b.period);
  }, [slots]);

  const slotMap = useMemo(() => {
    const map = new Map<string, TeacherTimetableSlot>();
    slots.forEach((slot) => map.set(`${slot.dayOfWeek}-${slot.periodNumber}`, slot));
    return map;
  }, [slots]);

  const todaySlots = useMemo(
    () =>
      slots
        .filter(
          (slot) => slot.dayOfWeek === todayIndex && slotVisibleOnDate(slot, todayYMD),
        )
        .sort((a, b) => a.periodNumber - b.periodNumber),
    [slots, todayIndex, slotVisibleOnDate, todayYMD],
  );

  const weekVisibleSlots = useMemo(
    () =>
      slots.filter(
        (slot) =>
          slot.dayOfWeek <= 5 &&
          slotVisibleOnDate(slot, toLocalDateStr(weekDates[slot.dayOfWeek])),
      ),
    [slots, weekDates, slotVisibleOnDate],
  );

  const teachingDays = useMemo(
    () => new Set(weekVisibleSlots.map((s) => s.dayOfWeek)).size,
    [weekVisibleSlots],
  );

  /** Period cells for the selected weekday (FREE when no slot / outside template range). */
  const selectedDayEntries = useMemo(() => {
    const day = selectedDay <= 5 ? selectedDay : 0;
    const dateYMD = toLocalDateStr(weekDates[day]);
    if (periodRows.length === 0) {
      return slots
        .filter((s) => s.dayOfWeek === day && slotVisibleOnDate(s, dateYMD))
        .sort((a, b) => a.periodNumber - b.periodNumber)
        .map((slot) => ({ kind: 'slot' as const, slot, period: slot.periodNumber }));
    }
    return periodRows.map((row) => {
      const slot = slotMap.get(`${day}-${row.period}`);
      if (!slot || !slotVisibleOnDate(slot, dateYMD)) {
        return {
          kind: 'free' as const,
          period: row.period,
          start: row.start,
          end: row.end,
        };
      }
      return { kind: 'slot' as const, slot, period: row.period, start: row.start, end: row.end };
    });
  }, [selectedDay, weekDates, periodRows, slotMap, slots, slotVisibleOnDate]);

  /** Monthly calendar cells: day-of-month → slots visible that calendar day. */
  const monthCells = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const slotsByDow: Record<number, TeacherTimetableSlot[]> = {};
    for (let d = 0; d < 7; d++) slotsByDow[d] = [];
    slots.forEach((s) => {
      if (s.dayOfWeek >= 0 && s.dayOfWeek <= 6) slotsByDow[s.dayOfWeek].push(s);
    });
    Object.values(slotsByDow).forEach((items) =>
      items.sort((a, b) => a.periodNumber - b.periodNumber),
    );

    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstDayOffset + 1;
      if (day < 1 || day > daysInMonth) return { day: null as number | null, slots: [] as TeacherTimetableSlot[], isToday: false };
      const date = new Date(year, month, day);
      const dateYMD = toLocalDateStr(date);
      const weekday = index % 7;
      const daySlots = (slotsByDow[weekday] || []).filter((slot) =>
        slotVisibleOnDate(slot, dateYMD),
      );
      return { day, slots: daySlots, isToday: dateYMD === todayYMD };
    });
  }, [monthDate, slots, slotVisibleOnDate, todayYMD]);

  const monthLabel = monthDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const selectedChip = weekDays.find((d) => d.key === selectedDay) ?? weekDays[0];

  return useMemo(
    () => ({
      status,
      error,
      refetch: load,
      viewMode,
      setViewMode,
      weekOffset,
      setWeekOffset,
      weekLabel,
      isCurrentWeek,
      weekDays,
      selectedDay,
      setSelectedDay,
      selectedChip,
      selectedDayEntries,
      todaySlots,
      todayIndex,
      weekVisibleCount: weekVisibleSlots.length,
      teachingDays,
      todayPeriodCount: todaySlots.length,
      monthDate,
      setMonthDate,
      monthLabel,
      monthCells,
      periodRows,
      hasSlots: slots.length > 0,
    }),
    [
      status,
      error,
      load,
      viewMode,
      weekOffset,
      weekLabel,
      isCurrentWeek,
      weekDays,
      selectedDay,
      selectedChip,
      selectedDayEntries,
      todaySlots,
      todayIndex,
      weekVisibleSlots.length,
      teachingDays,
      monthDate,
      monthLabel,
      monthCells,
      periodRows,
      slots.length,
    ],
  );
}
