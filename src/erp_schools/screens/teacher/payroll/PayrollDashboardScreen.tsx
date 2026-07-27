/**
 * Payroll & Leave — salary summary + leave balances/history with a top toggle.
 * Web HRTab My Leave / My Payslips parity; keeps mobile card UI.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  HeroCard,
  SurfaceCard,
  SectionHeader,
  SegmentedControl,
  StatusPill,
  PrimaryButton,
  InfoBanner,
  ListItem,
  FilterChips,
  SelectField,
  ScreenLoader,
  EmptyState,
  type Segment,
  type PillStatus,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors } from '../../../theme/accents';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherHrData } from '../../../hooks/useTeacherHrData';
import type { LeaveRecord, PayslipSummary } from '../../../types/domain';

const SEGMENTS: Segment[] = [
  { key: 'payroll', label: 'Payroll', icon: 'wallet-outline' },
  { key: 'leave', label: 'Leave', icon: 'calendar-outline' },
];

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

function breakdownFromSlip(slip: PayslipSummary | undefined) {
  if (!slip) {
    return { basic: 0, allowances: 0, deductions: 0, net: 0 };
  }
  const earn = slip.earnings;
  return {
    basic: earn?.basic ?? slip.basicSalary ?? 0,
    allowances:
      (earn?.hra ?? 0) + (earn?.da ?? 0) + (earn?.ta ?? 0) + (earn?.otherAllowances ?? 0),
    deductions: slip.deductions?.total ?? 0,
    net: slip.netSalary,
  };
}

function leavePill(status: LeaveRecord['status']): PillStatus {
  if (status === 'cancelled') return 'cancelled';
  return status;
}

function payPill(status: PayslipSummary['status']): PillStatus {
  if (status === 'paid') return 'paid';
  if (status === 'draft') return 'draft';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'processing' || status === 'pending') return 'processing';
  return 'generated';
}

export default function PayrollDashboardScreen() {
  const navigation = useTeacherNavigation();
  const [tab, setTab] = useState('payroll');
  const hr = useTeacherHrData();

  if (hr.status === 'idle' || hr.status === 'loading') {
    return (
      <TeacherScreen header={<ScreenHeader title="Payroll & Leave" />}>
        <ScreenLoader message="Loading payroll…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title="Payroll & Leave" />}
      contentStyle={styles.content}
      refreshing={hr.status === 'loading'}
      onRefresh={() => void hr.refetch()}
    >
      <SegmentedControl segments={SEGMENTS} activeKey={tab} onChange={setTab} />

      {tab === 'payroll' ? (
        <PayrollTab
          salaryHistory={hr.salaryHistory}
          navigateToPayslip={(id) => navigation.navigate('PayslipDetails', { payslipId: id })}
          navigateToHistory={() => navigation.navigate('SalaryHistory')}
        />
      ) : (
        <LeaveTab
          leaveBalances={hr.leaveBalances}
          leaveHistory={hr.leaveHistory}
          onApply={() => navigation.navigate('ApplyLeave', {})}
          onHistory={() => navigation.navigate('LeaveHistory')}
        />
      )}
    </TeacherScreen>
  );
}

function PayrollTab({
  salaryHistory,
  navigateToPayslip,
  navigateToHistory,
}: {
  salaryHistory: ReturnType<typeof useTeacherHrData>['salaryHistory'];
  navigateToPayslip: (id: string) => void;
  navigateToHistory: () => void;
}) {
  const theme = useTeacherTheme();
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

  const selected = filtered[0];
  const salaryBreakdown = breakdownFromSlip(selected);
  const breakdown = [
    { key: 'basic', label: 'Basic Salary', value: formatINR(salaryBreakdown.basic), highlight: false },
    { key: 'allow', label: 'Allowances', value: formatINR(salaryBreakdown.allowances), highlight: false },
    { key: 'deduct', label: 'Deductions', value: formatINR(salaryBreakdown.deductions), highlight: false },
    { key: 'net', label: 'Net Salary', value: formatINR(salaryBreakdown.net), highlight: true },
  ];

  const onShareLatest = async () => {
    if (!selected) return;
    try {
      await Share.share({
        message: `Payslip ${selected.monthLabel}\nNet: ${formatINR(selected.netSalary)}`,
      });
    } catch {
      Alert.alert('Share failed');
    }
  };

  return (
    <View style={styles.tabContent}>
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

      {selected ? (
        <HeroCard>
          <Text style={styles.heroLabel}>Total Salary ({selected.monthLabel})</Text>
          <Text style={styles.heroAmount}>{formatINR(selected.netSalary)}</Text>
          <View style={styles.heroBottom}>
            <View style={styles.heroPaidRow}>
              <StatusPill
                status={payPill(selected.status)}
                label={selected.status}
                showIcon={false}
              />
              <Text style={styles.heroPaidOn}>
                {selected.paidOn ? `Paid on ${selected.paidOn}` : '—'}
              </Text>
            </View>
            <TouchableOpacity style={styles.downloadBtn} onPress={() => void onShareLatest()}>
              <Ionicons name="share-outline" size={15} color="#FFFFFF" />
              <Text style={styles.downloadText}>Share Payslip</Text>
            </TouchableOpacity>
          </View>
        </HeroCard>
      ) : (
        <EmptyState
          icon="wallet-outline"
          title="No payslips"
          message={
            viewPeriod === 'all'
              ? 'Your payslips will appear here when generated.'
              : 'No payslips match the selected period.'
          }
        />
      )}

      <View style={styles.rangeRow}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Salary Overview
          </Text>
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={theme.colors.textSecondary}
          />
        </View>
        <View
          style={[
            styles.rangePill,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
        >
          <Ionicons name="calendar-outline" size={13} color={theme.colors.primary} />
          <Text style={[styles.rangeText, { color: theme.colors.textPrimary }]}>
            {selected?.monthLabel || '—'}
          </Text>
        </View>
      </View>

      <SurfaceCard>
        <View style={styles.breakdownRow}>
          {breakdown.map((item) => (
            <View key={item.key} style={styles.breakdownItem}>
              <Text
                style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  styles.breakdownValue,
                  { color: item.highlight ? theme.colors.success : theme.colors.textPrimary },
                ]}
              >
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SectionHeader
        title="Salary History"
        actionLabel="View All"
        onAction={navigateToHistory}
      />
      <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
        {filtered.length} payslip{filtered.length === 1 ? '' : 's'}
      </Text>
      {filtered.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="No payslips yet"
          message="Your payslips will appear here when generated."
        />
      ) : (
        <SurfaceCard padded={false} style={styles.historyCard}>
          {filtered.slice(0, 3).map((slip, index) => (
            <ListItem
              key={slip.id}
              icon="calendar-clear-outline"
              iconAccent="green"
              title={slip.monthLabel}
              subtitle={slip.paidOn || '—'}
              divider={index < Math.min(2, filtered.length - 1)}
              onPress={() => navigateToPayslip(slip.id)}
              showChevron
              trailing={
                <View style={styles.historyRight}>
                  <Text style={[styles.historyAmount, { color: theme.colors.textPrimary }]}>
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

      <SurfaceCard style={{ backgroundColor: theme.colors.tintBlue }}>
        <View style={styles.helpRow}>
          <View style={[styles.helpIcon, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="document-text-outline" size={18} color={theme.colors.info} />
          </View>
          <View style={styles.helpText}>
            <Text style={[styles.helpTitle, { color: theme.colors.textPrimary }]}>Need help?</Text>
            <Text style={[styles.helpSub, { color: theme.colors.textSecondary }]}>
              Contact accounts department for any payroll related queries.
            </Text>
          </View>
        </View>
      </SurfaceCard>
    </View>
  );
}

function LeaveTab({
  leaveBalances,
  leaveHistory,
  onApply,
  onHistory,
}: {
  leaveBalances: ReturnType<typeof useTeacherHrData>['leaveBalances'];
  leaveHistory: ReturnType<typeof useTeacherHrData>['leaveHistory'];
  onApply: () => void;
  onHistory: () => void;
}) {
  const theme = useTeacherTheme();

  return (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Leave Balance</Text>
      <SurfaceCard>
        <View style={styles.balanceRow}>
          {leaveBalances.map((balance) => {
            const accent = accentColors(theme.colors, balance.accent);
            return (
              <View key={balance.id} style={styles.balanceItem}>
                <View style={[styles.balanceIcon, { backgroundColor: accent.bg }]}>
                  <Text style={[styles.balanceType, { color: accent.fg }]}>{balance.type}</Text>
                </View>
                <Text style={[styles.balanceDays, { color: theme.colors.textPrimary }]}>
                  {balance.daysLeft}
                </Text>
                <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
                  days left
                </Text>
              </View>
            );
          })}
          {leaveBalances.length === 0 ? (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              No leave types configured.
            </Text>
          ) : null}
        </View>
      </SurfaceCard>

      <View style={styles.applyBlock}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Apply Leave</Text>
        <PrimaryButton
          label="Apply Leave"
          icon="add-circle-outline"
          onPress={onApply}
          style={styles.applyBtn}
        />
      </View>

      <SectionHeader title="Leave History" actionLabel="View All" onAction={onHistory} />
      {leaveHistory.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No leave requests"
          message="Tap Apply Leave to submit a request."
          ctaLabel="Apply Leave"
          onCtaPress={onApply}
        />
      ) : (
        <SurfaceCard padded={false} style={styles.historyCard}>
          {leaveHistory.slice(0, 5).map((record, index) => {
            const balance = leaveBalances.find((b) => b.type === record.type);
            return (
              <ListItem
                key={record.id}
                leadingLabel={record.type}
                iconAccent={balance?.accent ?? 'teal'}
                title={record.typeLabel}
                subtitle={record.dateRange}
                divider={index < Math.min(4, leaveHistory.length - 1)}
                showChevron
                onPress={onHistory}
                trailing={
                  <View style={styles.leaveRight}>
                    <StatusPill status={leavePill(record.status)} />
                    <Text
                      style={[styles.leaveDecision, { color: theme.colors.textSecondary }]}
                    >
                      {record.decisionLabel || record.status}
                    </Text>
                  </View>
                }
              />
            );
          })}
        </SurfaceCard>
      )}

      <InfoBanner text="Leave requests are subject to approval from the administrator." />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  tabContent: { gap: 14 },
  filterCard: { gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  row2: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  count: { fontSize: 12, fontWeight: '600' },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  heroAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginTop: 4 },
  heroBottom: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroPaidRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroPaidOn: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  downloadText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  rangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rangeText: { fontSize: 12, fontWeight: '600' },
  breakdownRow: { flexDirection: 'row' },
  breakdownItem: { flex: 1, gap: 4, alignItems: 'center' },
  breakdownLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  breakdownValue: { fontSize: 13, fontWeight: '800' },
  historyCard: { paddingHorizontal: 14 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyAmount: { fontSize: 14, fontWeight: '700' },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  helpIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: { flex: 1, gap: 2 },
  helpTitle: { fontSize: 14, fontWeight: '700' },
  helpSub: { fontSize: 12, lineHeight: 16 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  balanceItem: { flex: 1, minWidth: 70, alignItems: 'center', gap: 4 },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceType: { fontSize: 12, fontWeight: '800' },
  balanceDays: { fontSize: 18, fontWeight: '800' },
  balanceLabel: { fontSize: 10 },
  applyBlock: { gap: 10 },
  applyBtn: { alignSelf: 'stretch', width: '100%' },
  leaveRight: { alignItems: 'flex-end', gap: 4, maxWidth: 120 },
  leaveDecision: { fontSize: 10, textAlign: 'right' },
});
