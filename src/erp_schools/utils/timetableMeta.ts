/**
 * Shared Timetable Management constants/helpers (web TimetableTab parity).
 * Backend day_of_week: 0=Mon … 6=Sun.
 */

export const TT_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const TT_DAY_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const TT_SLOT_TYPES = [
  'lecture',
  'lab',
  'tutorial',
  'break',
  'assembly',
  'library',
  'sports',
  'free',
] as const;

export type TtSlotType = (typeof TT_SLOT_TYPES)[number];

export const TT_TABS = [
  { key: 'templates' as const, title: 'Templates', subtitle: 'Create and manage timetable templates.' },
  { key: 'grid' as const, title: 'Weekly Schedule', subtitle: 'View and edit the weekly class schedule.' },
  { key: 'calendar' as const, title: 'Calendar', subtitle: 'Monthly calendar view of scheduled slots.' },
];

export type TtTabKey = (typeof TT_TABS)[number]['key'];

export function fmtTtTime(t?: string): string {
  if (!t) return '—';
  const [hRaw, mRaw] = t.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw) || 0;
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function normalizeYMD(v?: string | null): string | undefined {
  if (!v) return undefined;
  return v.slice(0, 10);
}

export function isWithinDateRange(dateYMD: string, from?: string | null, to?: string | null): boolean {
  const f = normalizeYMD(from);
  const t = normalizeYMD(to);
  if (f && dateYMD < f) return false;
  if (t && dateYMD > t) return false;
  return true;
}

export function isDateInTemplateRange(
  dateYMD: string,
  template?: { effectiveFrom?: string; effectiveTo?: string },
): boolean {
  if (!template) return true;
  return isWithinDateRange(dateYMD, template.effectiveFrom, template.effectiveTo);
}

/** JS Sunday-first column index → backend Mon=0…Sun=6 */
export function jsSunColToBackendDow(sunCol: number): number {
  return sunCol === 0 ? 6 : sunCol - 1;
}

/**
 * Read API day_of_week (0–6 or ISO 1–7). Accepts camelCase aliases.
 * Call coerceMon0DayOfWeek on the full set to normalize to Mon=0…Sun=6.
 */
export function readBackendDayOfWeek(raw: Record<string, unknown>, fallback = 0): number {
  for (const key of ['day_of_week', 'dayOfWeek', 'weekday', 'dow'] as const) {
    const val = raw[key];
    if (val === null || val === undefined || val === '') continue;
    const n = Number(val);
    if (!Number.isFinite(n)) continue;
    return n;
  }
  return fallback;
}

/** If a slot set uses 1=Mon…7=Sun (has 7, never 0), shift to Mon=0…Sun=6. */
export function coerceMon0DayOfWeek(dayValues: number[]): (dow: number) => number {
  const has0 = dayValues.some((d) => d === 0);
  const has7 = dayValues.some((d) => d === 7);
  if (has7 && !has0) {
    return (d) => (d === 7 ? 6 : Math.max(0, d - 1));
  }
  return (d) => (d === 7 ? 6 : d);
}

export function slotTypeAccent(type: string): 'teal' | 'blue' | 'green' | 'orange' | 'purple' | 'pink' {
  switch (type) {
    case 'lab':
      return 'blue';
    case 'tutorial':
      return 'green';
    case 'sports':
      return 'green';
    case 'break':
    case 'free':
      return 'orange';
    case 'assembly':
      return 'purple';
    case 'library':
      return 'pink';
    default:
      return 'teal';
  }
}
