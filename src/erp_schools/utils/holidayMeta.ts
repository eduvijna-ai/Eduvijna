/**
 * Holiday type meta / filters — web StudentHolidayList (HolidayListPanel) parity.
 */

export const HOLIDAY_TYPES = [
  'national',
  'academic',
  'religious',
  'cultural',
  'other',
] as const;

export type HolidayType = (typeof HOLIDAY_TYPES)[number];

export type HolidayFilterKey = 'all' | 'academic' | 'festival' | 'national' | 'other';

export const HOLIDAY_FILTERS: { key: HolidayFilterKey; label: string }[] = [
  { key: 'all', label: 'All Holidays' },
  { key: 'academic', label: 'Academic Breaks' },
  { key: 'festival', label: 'Festivals' },
  { key: 'national', label: 'National Holidays' },
  { key: 'other', label: 'Optional Holidays' },
];

export const HOLIDAY_TYPE_META: Record<
  string,
  { label: string; bg: string; fg: string; filter: HolidayFilterKey }
> = {
  national: { label: 'National Holiday', bg: '#dcfce7', fg: '#15803d', filter: 'national' },
  academic: { label: 'Academic Break', bg: '#ffedd5', fg: '#c2410c', filter: 'academic' },
  religious: { label: 'Festival', bg: '#ede9fe', fg: '#6d28d9', filter: 'festival' },
  cultural: { label: 'Festival', bg: '#ede9fe', fg: '#6d28d9', filter: 'festival' },
  other: { label: 'Optional', bg: '#e0f2fe', fg: '#0369a1', filter: 'other' },
};

/** Preset swatches for mobile hex color selection (web color picker fallback #e53e3e). */
export const HOLIDAY_COLOR_PRESETS = [
  '#e53e3e',
  '#dd6b20',
  '#d69e2e',
  '#38a169',
  '#319795',
  '#3182ce',
  '#805ad5',
  '#d53f8c',
  '#718096',
] as const;

export const DEFAULT_HOLIDAY_COLOR = '#e53e3e';

export function holidayTypeMeta(type?: string | null) {
  return HOLIDAY_TYPE_META[type || ''] || HOLIDAY_TYPE_META.other;
}

export function matchesHolidayFilter(
  holidayType: string | undefined,
  filter: HolidayFilterKey,
): boolean {
  if (filter === 'all') return true;
  return holidayTypeMeta(holidayType).filter === filter;
}

export function isValidHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

export function normalizeHexColor(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const withHash = v.startsWith('#') ? v : `#${v}`;
  return isValidHexColor(withHash) ? withHash.toLowerCase() : null;
}

export function daysUntil(iso: string, todayStr: string): number {
  const a = new Date(`${todayStr}T00:00:00`).getTime();
  const b = new Date(`${iso}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export function weekdayName(iso: string): string {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[new Date(`${iso}T00:00:00`).getDay()] || '';
}
