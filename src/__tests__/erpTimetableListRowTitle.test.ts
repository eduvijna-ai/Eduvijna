/**
 * Mirrors listRowTitle / resolvePeriodNumber in erp/screens/TimetableScreen.tsx
 * (Timetable Templates path — Pundefined root cause).
 */

const DAYS = [
  { label: 'Sunday', value: '0' },
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
];

function resolvePeriodNumber(item: Record<string, unknown>): number | null {
  for (const key of ['period_number', 'periodNumber', 'period_no', 'period'] as const) {
    const raw = item[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function listRowTitle(activeTab: string, item: Record<string, unknown>): string {
  if (activeTab === 'templates') {
    const name = String(item.template_name ?? item.name ?? '').trim();
    if (name) return name;
    const className = String(item.class_name ?? '').trim();
    return className ? `Template · ${className}` : `Template #${item.id ?? '—'}`;
  }
  const day =
    DAYS.find((d) => d.value === String(item.day_of_week ?? item.dayOfWeek))?.label ?? '';
  const period = resolvePeriodNumber(item);
  const periodLabel = period != null ? `P${period}` : 'P—';
  const subject = String(item.subject_name ?? item.subjectName ?? item.slot_type ?? '').trim();
  if (subject) return `${day} ${periodLabel} · ${subject}`.trim();
  return `${day} ${periodLabel}`.trim() || periodLabel;
}

describe('ERP Timetable Templates list titles', () => {
  it('uses template_name instead of falling through to Pundefined', () => {
    expect(
      listRowTitle('templates', {
        id: 12,
        template_name: 'Class 4 Weekly',
        period_number: undefined,
      }),
    ).toBe('Class 4 Weekly');
  });

  it('never renders Pundefined for templates missing name', () => {
    const title = listRowTitle('templates', { id: 7, class_name: 'Grade 4' });
    expect(title).not.toContain('undefined');
    expect(title).toBe('Template · Grade 4');
  });

  it('formats slots with period aliases and P— when period is null', () => {
    expect(
      listRowTitle('slots', {
        day_of_week: 1,
        periodNumber: 3,
        subject_name: 'Math',
      }),
    ).toBe('Monday P3 · Math');
    expect(
      listRowTitle('slots', {
        day_of_week: 2,
        period_number: null,
        slot_type: 'break',
      }),
    ).toBe('Tuesday P— · break');
  });
});
