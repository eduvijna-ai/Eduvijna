import { formatAnalyticsDateStateAccessibility } from '../core/utils/analyticsDateState';

describe('formatAnalyticsDateStateAccessibility', () => {
  it('formats fixture-safe analytics date marker', () => {
    expect(formatAnalyticsDateStateAccessibility('2026-08-01', '2026-10-13')).toBe(
      'Analytics date state from-2026-08-01 to-2026-10-13',
    );
  });
});
