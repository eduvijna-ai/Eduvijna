import {
  getDefaultDateRange,
  getFounderFixtureAnalyticsDateRange,
} from '../core/utils/analyticsUiUtils';

describe('getDefaultDateRange', () => {
  it('matches web AnalyticsPage last-month window (UTC ISO date parts)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-12T12:00:00Z'));
    const { from, to } = getDefaultDateRange();
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    expect(from).toBe(lastMonth.toISOString().split('T')[0]);
    expect(to).toBe(tomorrow.toISOString().split('T')[0]);
    jest.useRealTimers();
  });
});

describe('getFounderFixtureAnalyticsDateRange', () => {
  it('covers Aug 2026 fixture assignment window', () => {
    const { from, to } = getFounderFixtureAnalyticsDateRange();
    expect(from).toBe('2026-08-01');
    expect(to).toBe('2026-10-13');
  });
});
