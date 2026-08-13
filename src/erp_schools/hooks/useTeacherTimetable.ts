/**
 * useTeacherTimetable — Instructor Timetable seam (web TimetableTab PersonalWeeklyTimetable).
 * APIs: myTeacherTimetable + slots list fallback (same as home dashboard), templates for other weeks.
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
import {
  coerceMon0DayOfWeek,
  isDateInTemplateRange,
  readBackendDayOfWeek,
} from '../utils/timetableMeta';
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

function mapSlot(raw: Record<string, unknown>, index: number): TeacherTimetableSlot {
  const templateId = pickNumber(raw.template_id, raw.templateId);
  return {
    id: pickString(raw.id, `slot-${index}`),
    templateId: templateId > 0 ? templateId : 0,
    dayOfWeek: readBackendDayOfWeek(raw, 0),
    periodNumber: pickNumber(raw.period_number, raw.periodNumber, raw.period_no, raw.period, index + 1),
    startTime: pickString(raw.start_time, raw.startTime, raw.from_time),
    endTime: pickString(raw.end_time, raw.endTime, raw.to_time),
    subjectName: pickString(raw.subject_name, raw.subjectName, raw.subject, raw.slot_type, 'Period'),
    className: pickString(raw.class_name, raw.className),
    sectionName: pickString(raw.section_name, raw.sectionName),
    room: pickString(raw.room, raw.room_name, raw.roomName),
    slotType: pickString(raw.slot_type, raw.slotType, 'lecture'),
    teacherName: pickString(raw.teacher_name, raw.teacherName),
  };
}

function hasTeachingInfo(raw: Record<string, unknown>): boolean {
  return Boolean(
    pickString(raw.subject_name, raw.subjectName, raw.subject, raw.class_name, raw.className),
  );
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

  const currentWeekBounds = useMemo(() => {
    const monday = startOfWeekMonday(new Date(), 0);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    return {
      start: toLocalDateStr(monday),
      end: toLocalDateStr(saturday),
    };
  }, []);

  const slotVisibleOnDate = useCallback(
    (slot: TeacherTimetableSlot, dateYMD: string) => {
      // Home "Today's Timetable" does not apply template range. Keep the
      // current week in sync so View All shows the same Class 4 / Science slot.
      if (dateYMD >= currentWeekBounds.start && dateYMD <= currentWeekBounds.end) {
        return true;
      }
      if (!slot.templateId) return true;
      const tmpl = templateById.get(slot.templateId);
      if (!tmpl || (!tmpl.effectiveFrom && !tmpl.effectiveTo)) return true;
      return isDateInTemplateRange(dateYMD, tmpl);
    },
    [templateById, currentWeekBounds],
  );

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    const schoolId = session.schoolId ?? undefined;
    const teacherUserId = session.userId ?? undefined;
    try {
      const [slotsRaw, templatesRaw, fallbackRaw] = await Promise.all([
        timetableSlotsApi.myTeacherTimetable(schoolId),
        timetableTemplatesApi
          .list({ school_id: schoolId, per_page: 200, is_active: true })
          .catch(() => ({ items: [] })),
        teacherUserId != null
          ? timetableSlotsApi
              .list({
                school_id: schoolId,
                teacher_id: teacherUserId,
                is_active: true,
                per_page: 200,
              })
              .catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
      ]);

      const mine = safeList<Record<string, unknown>>(slotsRaw);
      const fallback = safeList<Record<string, unknown>>(fallbackRaw);
      const usedFallback = !(
        mine.some(hasTeachingInfo) || (mine.length > 0 && fallback.length === 0)
      ) && fallback.length > 0;
      const rows = usedFallback ? fallback : mine;

      const mapped = rows.map(mapSlot);
      const shift = coerceMon0DayOfWeek(mapped.map((s) => s.dayOfWeek));
      const finalSlots = mapped.map((s) => ({ ...s, dayOfWeek: shift(s.dayOfWeek) }));
      setSlots(finalSlots);

      if (__DEV__) {
        const jsDow = new Date().getDay();
        const todayIdx = (jsDow + 6) % 7;
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const summarize = (list: Record<string, unknown>[]) =>
          list.map((s) => ({
            id: s.id,
            day_of_week: s.day_of_week ?? s.dayOfWeek,
            period: s.period_number ?? s.periodNumber,
            subject: s.subject_name ?? s.subjectName ?? s.subject,
            class: s.class_name ?? s.className,
            section: s.section_name ?? s.sectionName,
            room: s.room ?? s.room_name,
            start: s.start_time ?? s.startTime,
            end: s.end_time ?? s.endTime,
            is_active: s.is_active,
          }));
        const todayMapped = finalSlots.filter((s) => s.dayOfWeek === todayIdx);
        console.log('[InstructorTimetable] params', {
          schoolId,
          teacherUserId,
          deviceToday: toLocalDateStr(),
          jsGetDay_Sun0: jsDow,
          apiDayOfWeek_Mon0: todayIdx,
          todayName: dayNames[todayIdx],
        });
        console.log(
          '[InstructorTimetable] GET /api/v1/erp/timetable/teacher-timetable',
          { school_id: schoolId, count: mine.length, slots: summarize(mine) },
        );
        console.log(
          '[InstructorTimetable] GET /api/v1/erp/timetable/slots (fallback)',
          {
            school_id: schoolId,
            teacher_id: teacherUserId,
            is_active: true,
            count: fallback.length,
            slots: summarize(fallback),
          },
        );
        console.log('[InstructorTimetable] source used', usedFallback ? 'slots-list' : 'teacher-timetable');
        console.log('[InstructorTimetable] mapped slots (Mon=0)', finalSlots.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          dayName: dayNames[s.dayOfWeek] ?? `?${s.dayOfWeek}`,
          period: s.periodNumber,
          subject: s.subjectName,
          className: s.className,
          sectionName: s.sectionName,
          room: s.room,
          start: s.startTime,
          end: s.endTime,
        })));
        console.log('[InstructorTimetable] TODAY match', {
          expectingDay: `${dayNames[todayIdx]} index=${todayIdx}`,
          count: todayMapped.length,
          slots: todayMapped.map((s) => ({
            period: s.periodNumber,
            subject: s.subjectName,
            className: s.className,
            sectionName: s.sectionName,
            room: s.room,
            start: s.startTime,
          })),
        });
      }
      setTemplates(
        safeList<Record<string, unknown>>(templatesRaw)
          .map((t) => {
            const id = pickNumber(t.id, t.template_id);
            if (id <= 0) return null;
            return {
              id,
              effectiveFrom:
                pickString(t.effective_from, t.effectiveFrom, t.start_date).slice(0, 10) ||
                undefined,
              effectiveTo:
                pickString(t.effective_to, t.effectiveTo, t.end_date).slice(0, 10) || undefined,
            } as TemplateMeta;
          })
          .filter((t): t is TemplateMeta => t != null),
      );
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load timetable'));
      setSlots([]);
      setStatus('error');
    }
  }, [session.schoolId, session.userId]);

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
      slots.filter((slot) => {
        if (slot.dayOfWeek < 0 || slot.dayOfWeek > 5) return false;
        const date = weekDates[slot.dayOfWeek];
        if (!date) return false;
        return slotVisibleOnDate(slot, toLocalDateStr(date));
      }),
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
      slots,
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
      slots,
    ],
  );
}
