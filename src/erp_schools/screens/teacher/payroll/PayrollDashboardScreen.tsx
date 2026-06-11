/**
 * Payroll & Leave — salary summary + leave balances/history with a top toggle.
 * Reference: assets/teachers_screens/teachers_payroll_leaves.png
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  HeroCard,
  SurfaceCard,
  SectionHeader,
  SegmentedControl,
  Badge,
  StatusPill,
  PrimaryButton,
  InfoBanner,
  ListItem,
  type Segment,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors } from '../../../theme/accents';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import {
  currentPayroll,
  salaryBreakdown,
  salaryHistory,
  leaveBalances,
  leaveHistory,
} from '../../../data';

const SEGMENTS: Segment[] = [
  { key: 'payroll', label: 'Payroll', icon: 'wallet-outline' },
  { key: 'leave', label: 'Leave', icon: 'calendar-outline' },
];

const formatINR = (value: number): string => `₹${value.toLocaleString('en-IN')}`;

export default function PayrollDashboardScreen() {
  const navigation = useTeacherNavigation();
  const [tab, setTab] = useState('payroll');

  return (
    <TeacherScreen
      header={<ScreenHeader title="Payroll & Leave" />}
      contentStyle={styles.content}
    >
      <SegmentedControl segments={SEGMENTS} activeKey={tab} onChange={setTab} />

      {tab === 'payroll' ? (
        <PayrollTab navigateToPayslip={(id) => navigation.navigate('PayslipDetails', { payslipId: id })} navigateToHistory={() => navigation.navigate('SalaryHistory')} />
      ) : (
        <LeaveTab onApply={() => navigation.navigate('ApplyLeave')} onHistory={() => navigation.navigate('LeaveHistory')} />
      )}
    </TeacherScreen>
  );
}

function PayrollTab({ navigateToPayslip, navigateToHistory }: { navigateToPayslip: (id: string) => void; navigateToHistory: () => void }) {
  const theme = useTeacherTheme();
  const breakdown = [
    { key: 'basic', label: 'Basic Salary', value: formatINR(salaryBreakdown.basic), highlight: false },
    { key: 'allow', label: 'Allowances', value: formatINR(salaryBreakdown.allowances), highlight: false },
    { key: 'deduct', label: 'Deductions', value: formatINR(salaryBreakdown.deductions), highlight: false },
    { key: 'net', label: 'Net Salary', value: formatINR(salaryBreakdown.net), highlight: true },
  ];

  return (
    <View style={styles.tabContent}>
      <HeroCard>
        <Text style={styles.heroLabel}>Total Salary ({currentPayroll.monthLabel})</Text>
        <Text style={styles.heroAmount}>{formatINR(currentPayroll.netSalary)}</Text>
        <View style={styles.heroBottom}>
          <View style={styles.heroPaidRow}>
            <View style={styles.paidDot} />
            <Text style={styles.heroPaid}>Paid</Text>
            <Text style={styles.heroPaidOn}>Paid on {currentPayroll.paidOn}</Text>
          </View>
          <TouchableOpacity style={styles.downloadBtn}>
            <Ionicons name="download-outline" size={15} color="#FFFFFF" />
            <Text style={styles.downloadText}>Download Payslip</Text>
          </TouchableOpacity>
        </View>
      </HeroCard>

      <View style={styles.rangeRow}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Salary Overview</Text>
          <Ionicons name="information-circle-outline" size={15} color={theme.colors.textSecondary} />
        </View>
        <TouchableOpacity style={[styles.rangePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Ionicons name="calendar-outline" size={13} color={theme.colors.primary} />
          <Text style={[styles.rangeText, { color: theme.colors.textPrimary }]}>May 2025</Text>
          <Ionicons name="chevron-down" size={13} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <SurfaceCard>
        <View style={styles.breakdownRow}>
          {breakdown.map((item) => (
            <View key={item.key} style={styles.breakdownItem}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.label}</Text>
              <Text style={[styles.breakdownValue, { color: item.highlight ? theme.colors.success : theme.colors.textPrimary }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SectionHeader title="Salary History" actionLabel="View All" onAction={navigateToHistory} />
      <SurfaceCard padded={false} style={styles.historyCard}>
        {salaryHistory.slice(0, 3).map((slip, index) => (
          <ListItem
            key={slip.id}
            icon="calendar-clear-outline"
            iconAccent="green"
            title={slip.monthLabel}
            subtitle={slip.paidOn}
            divider={index < 2}
            onPress={() => navigateToPayslip(slip.id)}
            showChevron
            trailing={
              <View style={styles.historyRight}>
                <Text style={[styles.historyAmount, { color: theme.colors.textPrimary }]}>{formatINR(slip.netSalary)}</Text>
                <StatusPill status="paid" showIcon={false} />
              </View>
            }
          />
        ))}
      </SurfaceCard>

      <SurfaceCard style={{ backgroundColor: theme.colors.tintBlue }}>
        <View style={styles.helpRow}>
          <View style={[styles.helpIcon, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="document-text-outline" size={18} color={theme.colors.info} />
          </View>
          <View style={styles.helpText}>
            <Text style={[styles.helpTitle, { color: theme.colors.textPrimary }]}>Need help?</Text>
            <Text style={[styles.helpSub, { color: theme.colors.textSecondary }]}>Contact accounts department for any payroll related queries.</Text>
          </View>
          <PrimaryButton label="Contact Accounts" variant="outline" onPress={() => undefined} style={styles.helpBtn} />
        </View>
      </SurfaceCard>
    </View>
  );
}

function LeaveTab({ onApply, onHistory }: { onApply: () => void; onHistory: () => void }) {
  const theme = useTeacherTheme();

  return (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Leave Balance</Text>
      <SurfaceCard>
        <View style={styles.balanceRow}>
          {leaveBalances.map((balance) => {
            const accent = accentColors(theme.colors, balance.accent);
            return (
              <View key={balance.type} style={styles.balanceItem}>
                <View style={[styles.balanceIcon, { backgroundColor: accent.bg }]}>
                  <Text style={[styles.balanceType, { color: accent.fg }]}>{balance.type}</Text>
                </View>
                <Text style={[styles.balanceDays, { color: theme.colors.textPrimary }]}>{balance.daysLeft}</Text>
                <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>days left</Text>
              </View>
            );
          })}
        </View>
      </SurfaceCard>

      <View style={styles.applyRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Apply Leave</Text>
        <PrimaryButton label="Apply Leave" icon="add-circle-outline" onPress={onApply} style={styles.applyBtn} />
      </View>

      <SectionHeader title="Leave History" actionLabel="View All" onAction={onHistory} />
      <SurfaceCard padded={false} style={styles.historyCard}>
        {leaveHistory.map((record, index) => {
          const balance = leaveBalances.find((b) => b.type === record.type);
          return (
            <ListItem
              key={record.id}
              leadingLabel={record.type}
              iconAccent={balance?.accent ?? 'teal'}
              title={record.typeLabel}
              subtitle={record.dateRange}
              divider={index < leaveHistory.length - 1}
              showChevron
              onPress={onHistory}
              trailing={
                <View style={styles.leaveRight}>
                  <Badge label="Approved" accent="green" />
                  <Text style={[styles.leaveDecision, { color: theme.colors.textSecondary }]}>{record.decisionLabel}</Text>
                </View>
              }
            />
          );
        })}
      </SurfaceCard>

      <InfoBanner text="Leave requests are subject to approval from the administrator." />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  tabContent: { gap: 14 },

  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  heroAmount: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: 4 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  heroPaidRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paidDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  heroPaid: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  heroPaidOn: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  downloadText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  rangePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 32, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  rangeText: { fontSize: 12, fontWeight: '600' },

  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownItem: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  breakdownLabel: { fontSize: 11 },
  breakdownValue: { fontSize: 14, fontWeight: '700' },

  historyCard: { paddingHorizontal: 14 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyAmount: { fontSize: 14, fontWeight: '700' },

  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  helpIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  helpText: { flex: 1 },
  helpTitle: { fontSize: 13, fontWeight: '700' },
  helpSub: { fontSize: 11, marginTop: 2 },
  helpBtn: { height: 40, paddingHorizontal: 10 },

  balanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceItem: { flex: 1, alignItems: 'center', gap: 4 },
  balanceIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  balanceType: { fontSize: 12, fontWeight: '800' },
  balanceDays: { fontSize: 18, fontWeight: '800' },
  balanceLabel: { fontSize: 10 },

  applyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  applyBtn: { height: 42, paddingHorizontal: 16 },

  leaveRight: { alignItems: 'flex-end', gap: 4, maxWidth: 130 },
  leaveDecision: { fontSize: 10, textAlign: 'right' },
});
