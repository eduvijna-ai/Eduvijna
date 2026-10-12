import { getDefaultDateRange } from '../core/utils/analyticsUiUtils';

describe('getDefaultDateRange', () => {
  it('starts on Aug 1 of the current academic year', () => {
    const { from, to } = getDefaultDateRange();
    const today = new Date();
    const academicYearStart =
      today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
    const fromDate = new Date(academicYearStart, 7, 1);
    const expectedFrom = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`;
    expect(from).toBe(expectedFrom);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(to).getTime()).toBeGreaterThan(today.getTime() - 86400000);
  });

  it('includes the Aug 2026 founder fixture when run in Oct 2026', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-12T12:00:00Z'));
    const { from, to } = getDefaultDateRange();
    expect(from).toBe('2026-08-01');
    expect(new Date(to) >= new Date('2026-10-12')).toBe(true);
    const fixtureCreated = new Date('2026-08-27');
    expect(fixtureCreated >= new Date(from)).toBe(true);
    jest.useRealTimers();
  });
});
