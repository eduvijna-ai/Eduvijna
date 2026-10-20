import {
  formatAnalyticsDateStateAccessibility,
  isAnalyticsAllTime,
} from '../core/utils/analyticsDateState';

describe('formatAnalyticsDateStateAccessibility', () => {
  it('formats fixture-safe analytics date marker', () => {
    expect(formatAnalyticsDateStateAccessibility('2026-08-01', '2026-10-13')).toBe(
      'Analytics date state from-2026-08-01 to-2026-10-13',
    );
  });

  it('formats all-time marker when dates are empty', () => {
    expect(formatAnalyticsDateStateAccessibility('', '')).toBe('Analytics date state all-time');
    expect(isAnalyticsAllTime('', '')).toBe(true);
    expect(isAnalyticsAllTime('2026-08-01', '2026-10-13')).toBe(false);
  });
});
