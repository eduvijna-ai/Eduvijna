/**
 * Payslip Details — web My Payslips detail modal parity (mobile screen).
 * Earnings / deductions / net from live payslip API.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share, Alert } from 'react-native';
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
  ScreenLoader,
  EmptyState,
  type PillStatus,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherHrData } from '../../../hooks/useTeacherHrData';
import type { TeacherStackParamList } from '../../../types/navigation';
import type { PayslipSummary } from '../../../types/domain';

const formatINR = (value: number): string => `₹${value.toLocaleString('en-IN')}`;

function pillStatus(status: PayslipSummary['status']): PillStatus {
  if (status === 'paid') return 'paid';
  if (status === 'draft') return 'draft';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'processing' || status === 'pending') return 'processing';
  if (status === 'generated' || status === 'approved') return 'generated';
  return 'paid';
}

export default function PayslipDetailsScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'PayslipDetails'>>();
  const { getPayslip, salaryHistory, status: hrStatus } = useTeacherHrData();
  const rawId = route.params?.payslipId;
  const payslipId = Number(rawId);

  const [loading, setLoading] = useState(true);
  const [payslip, setPayslip] = useState<PayslipSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Prefer list cache first for snappy UI
      const cached =
        salaryHistory.find((s) => s.id === String(rawId) || s.payslipId === payslipId) ||
        null;
      if (cached && !cancelled) setPayslip(cached);

      if (Number.isFinite(payslipId) && payslipId > 0) {
        const fresh = await getPayslip(payslipId);
        if (!cancelled && fresh) setPayslip(fresh);
      } else if (cached && !cancelled) {
        setPayslip(cached);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [payslipId, rawId, getPayslip, salaryHistory]);

  const onShare = async () => {
    if (!payslip) return;
    try {
      await Share.share({
        message: `Payslip ${payslip.monthLabel}\nNet Salary: ${formatINR(payslip.netSalary)}\nStatus: ${payslip.status}`,
      });
    } catch {
      Alert.alert('Share failed', 'Could not share payslip summary.');
    }
  };

  if (loading || hrStatus === 'loading') {
    return (
      <TeacherScreen header={<ScreenHeader title="Payslip Details" />}>
        <ScreenLoader message="Loading payslip…" />
      </TeacherScreen>
    );
  }

  if (!payslip) {
    return (
      <TeacherScreen header={<ScreenHeader title="Payslip Details" />}>
        <EmptyState
          icon="wallet-outline"
          title="Payslip not found"
          message="This payslip may have been removed."
        />
      </TeacherScreen>
    );
  }

  const earnings = [
    { key: 'basic', label: 'Basic Salary', value: payslip.earnings?.basic ?? payslip.basicSalary ?? 0 },
    { key: 'hra', label: 'HRA', value: payslip.earnings?.hra ?? 0 },
    { key: 'da', label: 'DA', value: payslip.earnings?.da ?? 0 },
    { key: 'ta', label: 'TA', value: payslip.earnings?.ta ?? 0 },
    { key: 'other', label: 'Other Allowances', value: payslip.earnings?.otherAllowances ?? 0 },
  ];
  const deductions = [
    { key: 'pf', label: 'PF Deduction', value: payslip.deductions?.pf ?? 0 },
    { key: 'tax', label: 'Tax Deduction', value: payslip.deductions?.tax ?? 0 },
    { key: 'other', label: 'Other Deductions', value: payslip.deductions?.other ?? 0 },
  ];
  const earnTotal =
    payslip.earnings?.total ?? earnings.reduce((s, r) => s + r.value, 0);
  const dedTotal =
    payslip.deductions?.total ?? deductions.reduce((s, r) => s + r.value, 0);

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Payslip Details"
          trailingIcon="share-outline"
          onTrailingPress={() => void onShare()}
        />
      }
      contentStyle={styles.content}
      footer={
        <PrimaryButton
          label="Share Payslip"
          icon="share-outline"
          variant="gradient"
          onPress={() => void onShare()}
        />
      }
    >
      <HeroCard>
        <Text style={styles.heroLabel}>
          Payslip For The Period Of {payslip.monthLabel}
        </Text>
        <Text style={styles.heroAmount}>{formatINR(payslip.netSalary)}</Text>
        <View style={styles.heroFooter}>
          <Text style={styles.heroPaidOn}>
            {payslip.paidOn ? `Payment: ${payslip.paidOn}` : 'Payment Date: —'}
          </Text>
          <StatusPill
            status={pillStatus(payslip.status)}
            label={payslip.status}
            showIcon={false}
          />
        </View>
      </HeroCard>

      <SurfaceCard>
        <MetaRow label="Payslip #" value={`#${payslip.payslipId}`} />
        {payslip.employeeCode ? (
          <MetaRow label="Staff ID" value={payslip.employeeCode} />
        ) : null}
        {payslip.staffName ? <MetaRow label="Name" value={payslip.staffName} /> : null}
        {payslip.department ? (
          <MetaRow label="Department" value={payslip.department} />
        ) : null}
        {payslip.designation ? (
          <MetaRow label="Designation" value={payslip.designation} />
        ) : null}
        <MetaRow
          label="Payment Mode"
          value={payslip.paymentMethod || '—'}
          divider={false}
        />
      </SurfaceCard>

      <SectionHeader title="Earnings" />
      <SurfaceCard>
        {earnings.map((row, index) => (
          <Row
            key={row.key}
            label={row.label}
            value={formatINR(row.value)}
            divider={index < earnings.length - 1}
          />
        ))}
        <Row
          label="Total Earning"
          value={formatINR(earnTotal)}
          bold
          accent={theme.colors.success}
          divider={false}
        />
      </SurfaceCard>

      <SectionHeader title="Deductions" />
      <SurfaceCard>
        {deductions.map((row, index) => (
          <Row
            key={row.key}
            label={row.label}
            value={formatINR(row.value)}
            divider={index < deductions.length - 1}
          />
        ))}
        <Row
          label="Total Deduction"
          value={formatINR(dedTotal)}
          bold
          accent={theme.colors.danger}
          divider={false}
        />
      </SurfaceCard>

      <SurfaceCard style={{ backgroundColor: theme.colors.tintTeal }}>
        <Row
          label="Basic Salary"
          value={formatINR(payslip.basicSalary ?? payslip.earnings?.basic ?? 0)}
        />
        <Row label="Gross Salary" value={formatINR(payslip.grossSalary ?? earnTotal)} />
        <Row
          label="Net Salary"
          value={formatINR(payslip.netSalary)}
          bold
          accent={theme.colors.primary}
          divider={false}
        />
      </SurfaceCard>

      <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
        This payslip is computer generated hence no signature is required.
      </Text>
    </TeacherScreen>
  );
}

function MetaRow({
  label,
  value,
  divider = true,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  const theme = useTeacherTheme();
  return (
    <View
      style={[
        styles.row,
        divider && {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
  divider = true,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
  divider?: boolean;
}) {
  const theme = useTeacherTheme();
  return (
    <View
      style={[
        styles.row,
        divider && {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text
        style={[
          styles.rowLabel,
          { color: theme.colors.textSecondary, fontWeight: bold ? '700' : '400' },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          { color: accent ?? theme.colors.textPrimary, fontWeight: bold ? '800' : '600' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  heroAmount: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: 4 },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  heroPaidOn: { color: 'rgba(255,255,255,0.85)', fontSize: 12, flex: 1, paddingRight: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14 },
  note: { fontSize: 11, textAlign: 'center', marginTop: 4, marginBottom: 8 },
});
