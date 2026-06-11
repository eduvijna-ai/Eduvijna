/**
 * Fee Dashboard — totals, installment schedule, payment history and breakup.
 * Reference: assets/student_screens/student fee details screen.png
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentIdentityHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  StatusPill,
  AcademicYearPill,
  type StatItem,
  type PillStatus,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';
import { useStudentUIStore } from '../../../store/studentUI.store';
import type { FeeInstallmentStatus } from '../../../types/student';

const rupee = (value: number) => `₹ ${value.toLocaleString('en-IN')}`;

const FEE_PILL: Record<FeeInstallmentStatus, PillStatus> = {
  paid: 'paid',
  pending: 'pending',
  overdue: 'rejected',
};

export default function FeeDashboardScreen() {
  const theme = useTeacherTheme();
  const { profile, fees, academicYears } = useStudentData();
  const academicYear = useStudentUIStore((s) => s.academicYear);
  const setAcademicYear = useStudentUIStore((s) => s.setAcademicYear);

  const stats: StatItem[] = [
    { key: 'total', icon: 'receipt-outline', value: rupee(fees.summary.total), label: 'Total Fees', accent: 'blue' },
    { key: 'paid', icon: 'card-outline', value: rupee(fees.summary.paid), label: 'Paid Amount', accent: 'green' },
    { key: 'due', icon: 'hourglass-outline', value: rupee(fees.summary.due), label: 'Due Amount', accent: 'orange' },
    { key: 'balance', icon: 'pie-chart-outline', value: `${fees.summary.balancePercent}%`, label: 'Balance Due', accent: 'red' },
  ];

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Fee Details"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
          admissionNo={profile.admissionNo}
          trailingIcon="download-outline"
          rightSlot={<AcademicYearPill value={academicYear} options={academicYears} onChange={setAcademicYear} />}
        />
      }
      contentStyle={styles.content}
    >
      <StatGrid items={stats} columns={4} />

      <SurfaceCard style={[styles.reminder, { backgroundColor: theme.colors.tintBlue }]}>
        <Ionicons name="notifications-outline" size={20} color={theme.colors.info} />
        <View style={styles.reminderInfo}>
          <Text style={[styles.reminderTitle, { color: theme.colors.textPrimary }]}>Payment Reminder</Text>
          <Text style={[styles.reminderSub, { color: theme.colors.textSecondary }]}>You have 2 upcoming payments due.</Text>
        </View>
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => Alert.alert('Pay Now', 'Payment gateway integration pending (demo).')}
          accessibilityRole="button"
          accessibilityLabel="Pay Now"
        >
          <Text style={styles.payBtnText}>Pay Now</Text>
        </TouchableOpacity>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Fee Installment Schedule" />
        <SurfaceCard padded={false} style={styles.listCard}>
          {fees.installments.map((inst, index) => (
            <View
              key={inst.id}
              style={[
                styles.instRow,
                index < fees.installments.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={[styles.instIndex, { backgroundColor: inst.status === 'paid' ? theme.colors.tintGreen : theme.colors.tintBlue }]}>
                <Text style={[styles.instIndexText, { color: inst.status === 'paid' ? theme.colors.success : theme.colors.info }]}>{inst.index}</Text>
              </View>
              <View style={styles.instInfo}>
                <Text style={[styles.instLabel, { color: theme.colors.textPrimary }]}>{inst.label}</Text>
                <Text style={[styles.instMeta, { color: theme.colors.textSecondary }]}>Due {inst.dueDate}{inst.paidDate ? ` • Paid ${inst.paidDate}` : ''}</Text>
              </View>
              <View style={styles.instRight}>
                <Text style={[styles.instAmount, { color: theme.colors.textPrimary }]}>{rupee(inst.amount)}</Text>
                <StatusPill status={FEE_PILL[inst.status]} showIcon={false} />
              </View>
            </View>
          ))}
          <View style={[styles.instTotals, { backgroundColor: theme.colors.surfaceAlt }]}>
            <View style={styles.totalCell}><Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Total</Text><Text style={[styles.totalValue, { color: theme.colors.textPrimary }]}>{rupee(fees.summary.total)}</Text></View>
            <View style={styles.totalCell}><Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Paid</Text><Text style={[styles.totalValue, { color: theme.colors.success }]}>{rupee(fees.summary.paid)}</Text></View>
            <View style={styles.totalCell}><Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Due</Text><Text style={[styles.totalValue, { color: theme.colors.danger }]}>{rupee(fees.summary.due)}</Text></View>
          </View>
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Payment History" actionLabel="View All" onAction={() => undefined} />
        <SurfaceCard padded={false} style={styles.listCard}>
          {fees.payments.map((payment, index) => (
            <View
              key={payment.id}
              style={[
                styles.payRow,
                index < fees.payments.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={[styles.payIcon, { backgroundColor: theme.colors.tintGreen }]}>
                <Ionicons name="card-outline" size={16} color={theme.colors.success} />
              </View>
              <View style={styles.payInfo}>
                <Text style={[styles.payLabel, { color: theme.colors.textPrimary }]}>{payment.label}</Text>
                <Text style={[styles.payMeta, { color: theme.colors.textSecondary }]}>{payment.method}</Text>
              </View>
              <View style={styles.payRight}>
                <Text style={[styles.payAmount, { color: theme.colors.success }]}>{rupee(payment.amount)}</Text>
                <Text style={[styles.payDate, { color: theme.colors.textSecondary }]}>{payment.date}</Text>
              </View>
            </View>
          ))}
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Fee Breakup" />
        <SurfaceCard padded={false} style={styles.listCard}>
          {fees.breakup.map((row) => (
            <View key={row.id} style={styles.breakRow}>
              <Ionicons name={row.icon as keyof typeof Ionicons.glyphMap} size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.breakLabel, { color: theme.colors.textPrimary }]}>{row.label}</Text>
              <Text style={[styles.breakAmount, { color: theme.colors.textSecondary }]}>{rupee(row.amount)}</Text>
            </View>
          ))}
          <View style={[styles.breakTotal, { backgroundColor: theme.colors.tintBlue }]}>
            <Text style={[styles.breakTotalLabel, { color: theme.colors.info }]}>Total Fees</Text>
            <Text style={[styles.breakTotalValue, { color: theme.colors.info }]}>{rupee(fees.summary.total)}</Text>
          </View>
        </SurfaceCard>
      </View>

      <SurfaceCard style={[styles.help, { backgroundColor: theme.colors.tintGreen }]}>
        <Ionicons name="headset-outline" size={20} color={theme.colors.success} />
        <View style={styles.reminderInfo}>
          <Text style={[styles.reminderTitle, { color: theme.colors.textPrimary }]}>Need Help?</Text>
          <Text style={[styles.reminderSub, { color: theme.colors.textSecondary }]}>For any queries related to fees, please contact the school office.</Text>
        </View>
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => Alert.alert('Contact School', 'Calling the school office (demo).')}
          accessibilityRole="button"
          accessibilityLabel="Contact School"
        >
          <Text style={styles.payBtnText}>Contact</Text>
        </TouchableOpacity>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reminderInfo: { flex: 1 },
  reminderTitle: { fontSize: 13, fontWeight: '700' },
  reminderSub: { fontSize: 12, marginTop: 1 },
  payBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  payBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  section: { gap: 0 },
  listCard: { paddingHorizontal: 14, overflow: 'hidden' },
  instRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  instIndex: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  instIndexText: { fontSize: 12, fontWeight: '700' },
  instInfo: { flex: 1 },
  instLabel: { fontSize: 13, fontWeight: '600' },
  instMeta: { fontSize: 11, marginTop: 1 },
  instRight: { alignItems: 'flex-end', gap: 4 },
  instAmount: { fontSize: 13, fontWeight: '700' },
  instTotals: { flexDirection: 'row', marginHorizontal: -14, paddingHorizontal: 14, paddingVertical: 12 },
  totalCell: { flex: 1, gap: 2 },
  totalLabel: { fontSize: 11 },
  totalValue: { fontSize: 13, fontWeight: '700' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  payIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  payInfo: { flex: 1 },
  payLabel: { fontSize: 13, fontWeight: '600' },
  payMeta: { fontSize: 11, marginTop: 1 },
  payRight: { alignItems: 'flex-end' },
  payAmount: { fontSize: 13, fontWeight: '700' },
  payDate: { fontSize: 11 },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  breakLabel: { flex: 1, fontSize: 13 },
  breakAmount: { fontSize: 13, fontWeight: '600' },
  breakTotal: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -14, paddingHorizontal: 14, paddingVertical: 12 },
  breakTotalLabel: { fontSize: 13, fontWeight: '700' },
  breakTotalValue: { fontSize: 14, fontWeight: '800' },
  help: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
