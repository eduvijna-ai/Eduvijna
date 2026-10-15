import React from 'react';
import { render } from '@testing-library/react-native';
import AnalyticsDateFilter from '../components/analytics/AnalyticsDateFilter';

const colors = {
  primary: '#3366cc',
  card: '#fff',
  border: '#ddd',
  text: '#111',
  textSecondary: '#666',
  background: '#f5f5f5',
};

describe('AnalyticsDateFilter state marker', () => {
  it('exposes analytics-date-state accessibility label', () => {
    const { getByLabelText } = render(
      <AnalyticsDateFilter
        startDate="2026-08-01"
        endDate="2026-10-13"
        onStartChange={() => undefined}
        onEndChange={() => undefined}
        onApply={() => undefined}
        onClear={() => undefined}
        onRefresh={() => undefined}
        colors={colors}
      />,
    );

    expect(getByLabelText('Analytics date state from-2026-08-01 to-2026-10-13')).toBeTruthy();
  });
});
