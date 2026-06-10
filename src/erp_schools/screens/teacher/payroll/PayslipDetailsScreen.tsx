/** Payslip Details — full breakdown for a single month's payslip. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  HeroCard,
  SurfaceCard,
  SectionHeader,
  StatusPill,
  PrimaryButton,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { salaryBreakdown, salaryHistory } from '../../../data';
import type { TeacherStackParamList } from '../../../types/navigation';

const formatINR = (value: number): string => `₹${value.toLocaleString('en-IN')}`;

export default function PayslipDetailsScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'PayslipDetails'>>();
  const payslip = salaryHistory.find((s) => s.id === route.params?.payslipId) ?? salaryHistory[0];

  const earnings = [
    { key: 'basic', label: 'Basic Salary', value: salaryBreakdown.basic },
    { key: 'hra', label: 'House Rent Allowance', value: 9000 },
    { key: 'da', label: 'Dearness Allowance', value: 4000 },
    { key: 'special', label: 'Special Allowance', value: 2000 },
  ];
  const deductions = [
    { key: 'pf', label: 'Provident Fund', value: 3600 },
    { key: 'tax', label: 'Professional Tax', value: 750 },
    { key: 'other', label: 'Other Deductions', value: 1000 },
  ];

  return (
    <TeacherScreen
      header={<ScreenHeader title="Payslip Details" trailingIcon="share-outline" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Download Payslip" icon="download-outline" variant="gradient" onPress={() => undefined} />}
    >
      <HeroCard>
        <Text style={styles.heroLabel}>Net Pay · {payslip.monthLabel}</Text>
        <Text style={styles.heroAmount}>{formatINR(payslip.netSalary)}</Text>
        <View style={styles.heroFooter}>
          <Text style={styles.heroPaidOn}>{payslip.paidOn}</Text>
          <StatusPill status="paid" />
        </View>
      </HeroCard>

      <SectionHeader title="Earnings" />
      <SurfaceCard>
        {earnings.map((row, index) => (
          <Row key={row.key} label={row.label} value={formatINR(row.value)} divider={index < earnings.length - 1} />
        ))}
        <Row label="Total Earnings" value={formatINR(salaryBreakdown.basic + salaryBreakdown.allowances)} bold accent={theme.colors.success} divider={false} />
      </SurfaceCard>

      <SectionHeader title="Deductions" />
      <SurfaceCard>
        {deductions.map((row, index) => (
          <Row key={row.key} label={row.label} value={formatINR(row.value)} divider={index < deductions.length - 1} />
        ))}
        <Row label="Total Deductions" value={formatINR(salaryBreakdown.deductions)} bold accent={theme.colors.danger} divider={false} />
      </SurfaceCard>

      <SurfaceCard style={{ backgroundColor: theme.colors.tintTeal }}>
        <Row label="Net Salary" value={formatINR(salaryBreakdown.net)} bold accent={theme.colors.primary} divider={false} />
      </SurfaceCard>
    </TeacherScreen>
  );
}

function Row({ label, value, bold, accent, divider = true }: { label: string; value: string; bold?: boolean; accent?: string; divider?: boolean }) {
  const theme = useTeacherTheme();
  return (
    <View style={[styles.row, divider && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.rowLabel, { color: theme.colors.textSecondary, fontWeight: bold ? '700' : '400' }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: accent ?? theme.colors.textPrimary, fontWeight: bold ? '800' : '600' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  heroAmount: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: 4 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  heroPaidOn: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14 },
});
