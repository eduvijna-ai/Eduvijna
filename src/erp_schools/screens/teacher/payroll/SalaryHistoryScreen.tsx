/** Salary History — web My Payslips list (self-scoped) with period filters. */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  ListItem,
  StatusPill,
  FilterChips,
  SelectField,
  EmptyState,
  ScreenLoader,
  type ChipOption,
  type PillStatus,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherHrData } from '../../../hooks/useTeacherHrData';
import type { PayslipSummary } from '../../../types/domain';

type ViewPeriod = 'all' | 'monthly' | 'yearly';

const PERIOD_CHIPS: ChipOption[] = [
  { key: 'all', label: 'All' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(2000, i, 1).toLocaleString('en', { month: 'short' }),
  value: String(i + 1),
}));

const formatINR = (value: number): string => `₹${value.toLocaleString('en-IN')}`;

function payPill(status: PayslipSummary['status']): PillStatus {
  if (status === 'paid') return 'paid';
  if (status === 'draft') return 'draft';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'processing' || status === 'pending') return 'processing';
  return 'generated';
}

/** Web PayslipsView client-side period filter parity. */
function filterByPeriod(
  items: PayslipSummary[],
  viewPeriod: ViewPeriod,
  month: number,
  year: number,
): PayslipSummary[] {
  return items.filter((item) => {
    if (viewPeriod !== 'all' && item.year !== year) return false;
    if (viewPeriod === 'monthly' && item.month !== month) return false;
    return true;
  });
}

export default function SalaryHistoryScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { salaryHistory, status, refetch } = useTeacherHrData();

  const now = useMemo(() => new Date(), []);
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('all');
  const [monthFilter, setMonthFilter] = useState(now.getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(now.getFullYear());

  const yearOptions = useMemo(() => {
    const fromData = salaryHistory
      .map((s) => s.year)
      .filter((y): y is number => typeof y === 'number' && y > 0);
    const y = now.getFullYear();
    const set = new Set<number>([...fromData, y - 1, y, y + 1]);
    return Array.from(set)
      .sort((a, b) => b - a)
      .map((v) => ({ label: String(v), value: String(v) }));
  }, [salaryHistory, now]);

  const filtered = useMemo(
    () => filterByPeriod(salaryHistory, viewPeriod, monthFilter, yearFilter),
    [salaryHistory, viewPeriod, monthFilter, yearFilter],
  );

  if (status === 'idle' || status === 'loading') {
    return (
      <TeacherScreen header={<ScreenHeader title="Salary History" />}>
        <ScreenLoader message="Loading payslips…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title="Salary History" />}
      contentStyle={styles.content}
      refreshing={status === 'loading'}
      onRefresh={() => void refetch()}
    >
      <SurfaceCard style={styles.filterCard}>
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
          View Period
        </Text>
        <FilterChips
          size="sm"
          options={PERIOD_CHIPS}
          activeKey={viewPeriod}
          onChange={(k) => setViewPeriod(k as ViewPeriod)}
        />

        {viewPeriod === 'monthly' ? (
          <View style={styles.row2}>
            <View style={styles.flex1}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                Month
              </Text>
              <SelectField
                options={MONTH_OPTIONS}
                value={String(monthFilter)}
                onChange={(v) => setMonthFilter(Number(v))}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                Year
              </Text>
              <SelectField
                options={yearOptions}
                value={String(yearFilter)}
                onChange={(v) => setYearFilter(Number(v))}
              />
            </View>
          </View>
        ) : null}

        {viewPeriod === 'yearly' ? (
          <View>
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Year
            </Text>
            <SelectField
              options={yearOptions}
              value={String(yearFilter)}
              onChange={(v) => setYearFilter(Number(v))}
            />
          </View>
        ) : null}
      </SurfaceCard>

      <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
        {filtered.length} payslip{filtered.length === 1 ? '' : 's'}
      </Text>

      {filtered.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="No payslips"
          message={
            viewPeriod === 'all'
              ? 'Payslips will appear here when generated by HR.'
              : 'No payslips match the selected period.'
          }
        />
      ) : (
        <SurfaceCard padded={false} style={styles.card}>
          {filtered.map((slip, index) => (
            <ListItem
              key={slip.id}
              icon="calendar-clear-outline"
              iconAccent="green"
              title={slip.monthLabel}
              subtitle={slip.paidOn || slip.status}
              divider={index < filtered.length - 1}
              showChevron
              onPress={() =>
                navigation.navigate('PayslipDetails', { payslipId: slip.id })
              }
              trailing={
                <View style={styles.right}>
                  <Text style={[styles.amount, { color: theme.colors.textPrimary }]}>
                    {formatINR(slip.netSalary)}
                  </Text>
                  <StatusPill
                    status={payPill(slip.status)}
                    label={slip.status}
                    showIcon={false}
                  />
                </View>
              }
            />
          ))}
        </SurfaceCard>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  filterCard: { gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  row2: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  count: { fontSize: 12, fontWeight: '600' },
  card: { paddingHorizontal: 14 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '700' },
});
