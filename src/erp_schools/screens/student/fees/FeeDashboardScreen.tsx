/**
 * Student My Fees — web FeesTab student mode (My Fees + Receipts).
 * Receipt PDF: print + share sheet (same pattern as timetable / attendance).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentModuleHeader,
  SurfaceCard,
  SectionHeader,
  SegmentedControl,
  ScreenLoader,
  EmptyState,
  PrimaryButton,
  StatusPill,
  type PillStatus,
  type Segment,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  useStudentFeesData,
  type FeeTermStatus,
  type StudentFeeAssignmentCard,
  type StudentFeeReceipt,
  type StudentFeeTerm,
} from '../../../hooks/useStudentFeesData';
import type { FeeReceiptPdfInput } from '../../../utils/studentFeeReceiptPdf';
import { downloadStudentFeeReceiptPdf } from '../../../utils/studentFeeReceiptPdf';
const TABS: Segment[] = [
  { key: 'my_payments', label: 'My Fees', icon: 'wallet-outline' },
  { key: 'receipts', label: 'Receipts', icon: 'receipt-outline' },
];

const TERM_PILL: Record<FeeTermStatus, PillStatus> = {
  paid: 'paid',
  pending: 'pending',
  overdue: 'rejected',
  waived: 'closed',
};

function fmtInr(n: number): string {
  return `₹${(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function onPayNowStub() {
  Alert.alert('Pay Now', 'Online payment functionality will be available soon.');
}

function SummaryCard({
  label,
  value,
  tint,
  color,
}: {
  label: string;
  value: string;
  tint: string;
  color: string;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: tint }]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function TermRow({
  term,
  theme,
  isLast,
}: {
  term: StudentFeeTerm;
  theme: ReturnType<typeof useTeacherTheme>;
  isLast: boolean;
}) {
  const canPay = term.status === 'pending' || term.status === 'overdue';
  return (
    <View
      style={[
        styles.termRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.termIndex, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Text style={[styles.termIndexText, { color: theme.colors.textSecondary }]}>
          {term.termNumber}
        </Text>
      </View>
      <View style={styles.termInfo}>
        <Text style={[styles.termLabel, { color: theme.colors.textPrimary }]}>
          {term.termLabel}
        </Text>
        <Text style={[styles.termMeta, { color: theme.colors.textSecondary }]}>
          Due {term.dueDate || '—'}
        </Text>
        <View style={styles.termPillWrap}>
          <StatusPill
            status={TERM_PILL[term.status]}
            label={term.status}
            showIcon={false}
          />
        </View>
      </View>
      <View style={styles.termRight}>
        <Text style={[styles.termAmount, { color: theme.colors.textPrimary }]}>
          {fmtInr(term.amountDue)}
        </Text>
        {canPay ? (
          <PrimaryButton label="Pay Now" size="compact" onPress={onPayNowStub} />
        ) : (
          <Text style={[styles.paidText, { color: theme.colors.success }]}>
            {term.status === 'waived' ? 'Waived' : 'Paid'}
          </Text>
        )}
      </View>
    </View>
  );
}

function AssignmentCard({
  item,
  theme,
}: {
  item: StudentFeeAssignmentCard;
  theme: ReturnType<typeof useTeacherTheme>;
}) {
  const breakdown = [
    { label: 'Base', value: item.baseFee },
    { label: 'Transport', value: item.transportFee },
    { label: 'Discount', value: item.discountAmount },
    { label: 'Waiver', value: item.waiverAmount },
  ];

  return (
    <SurfaceCard style={styles.assignCard}>
      <View style={styles.assignHead}>
        <View style={styles.assignHeadLeft}>
          <Text style={[styles.assignTitle, { color: theme.colors.textPrimary }]}>
            {item.className}
          </Text>
          <Text style={[styles.assignMeta, { color: theme.colors.textSecondary }]}>
            Frequency: {item.frequency}
            {item.startDate ? ` · Start: ${item.startDate}` : ''}
          </Text>
        </View>
        <View style={styles.assignHeadRight}>
          <Text style={[styles.totalFeeLabel, { color: theme.colors.textSecondary }]}>
            Total fee
          </Text>
          <Text style={[styles.totalFeeValue, { color: theme.colors.primary }]}>
            {fmtInr(item.totalFee)}
          </Text>
        </View>
      </View>

      <View style={styles.breakGrid}>
        {breakdown.map((b) => (
          <View
            key={b.label}
            style={[styles.breakCell, { backgroundColor: theme.colors.surfaceAlt }]}
          >
            <Text style={[styles.breakLabel, { color: theme.colors.textSecondary }]}>
              {b.label}
            </Text>
            <Text style={[styles.breakValue, { color: theme.colors.textPrimary }]}>
              {fmtInr(b.value)}
            </Text>
          </View>
        ))}
      </View>

      {item.terms.length > 0 ? (
        <>
          <View style={styles.demandHead}>
            <Text style={[styles.demandTitle, { color: theme.colors.textPrimary }]}>
              Demand Bill / Terms
            </Text>
            {item.outstanding > 0 ? (
              <Text style={[styles.outstanding, { color: theme.colors.danger }]}>
                Outstanding: {fmtInr(item.outstanding)}
              </Text>
            ) : null}
          </View>
          <View style={[styles.termList, { borderColor: theme.colors.border }]}>
            {item.terms.map((term, idx) => (
              <TermRow
                key={term.id}
                term={term}
                theme={theme}
                isLast={idx === item.terms.length - 1}
              />
            ))}
          </View>
        </>
      ) : (
        <View style={[styles.noTerms, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Text style={[styles.noTermsText, { color: theme.colors.textSecondary }]}>
            No term schedule generated yet. Showing full fee assignment details above
            {item.remarks ? ` · Remarks: ${item.remarks}` : ''}.
          </Text>
        </View>
      )}
    </SurfaceCard>
  );
}

function ReceiptCard({
  receipt,
  theme,
  loading,
  onDownloadPdf,
}: {
  receipt: StudentFeeReceipt;
  theme: ReturnType<typeof useTeacherTheme>;
  loading: boolean;
  onDownloadPdf: () => void;
}) {
  return (
    <SurfaceCard style={styles.receiptCard}>
      <View style={styles.receiptTop}>
        <View style={[styles.receiptIcon, { backgroundColor: theme.colors.tintGreen }]}>
          <Ionicons name="receipt-outline" size={18} color={theme.colors.success} />
        </View>
        <View style={styles.receiptInfo}>
          <Text style={[styles.receiptNumber, { color: theme.colors.textPrimary }]}>
            {receipt.receiptNumber}
          </Text>
          <Text style={[styles.receiptMeta, { color: theme.colors.textSecondary }]}>
            {receipt.paymentDate || '—'} · {receipt.paymentMethod || '—'}
          </Text>
        </View>
        <Text style={[styles.receiptAmount, { color: theme.colors.success }]}>
          {fmtInr(receipt.amount)}
        </Text>
      </View>

      <View style={styles.receiptDetails}>
        <Text style={[styles.receiptDetail, { color: theme.colors.textSecondary }]}>
          Collection ID: {receipt.collectionId || '—'}
        </Text>
        <Text style={[styles.receiptDetail, { color: theme.colors.textSecondary }]}>
          Remarks: {receipt.remarks || '—'}
        </Text>
      </View>

      <PrimaryButton
        label={loading ? 'Preparing…' : 'Download PDF'}
        icon="download-outline"
        size="compact"
        loading={loading}
        onPress={onDownloadPdf}
        style={styles.pdfBtn}
      />
    </SurfaceCard>
  );
}

export default function FeeDashboardScreen() {
  const theme = useTeacherTheme();
  const fees = useStudentFeesData();
  const [tab, setTab] = useState('my_payments');
  const [openingId, setOpeningId] = useState<string | null>(null);

  const refetchRef = useRef(fees.refetch);
  refetchRef.current = fees.refetch;
  const ensureReceiptsRef = useRef(fees.ensureReceipts);
  ensureReceiptsRef.current = fees.ensureReceipts;

  useEffect(() => {
    if (tab === 'receipts') ensureReceiptsRef.current();
  }, [tab]);

  const onRefresh = useCallback(() => {
    void refetchRef.current();
  }, []);

  const onTabChange = useCallback((key: string) => {
    setTab(key);
  }, []);

  const receiptInput = useCallback(
    (receipt: StudentFeeReceipt): FeeReceiptPdfInput => ({
      schoolId: fees.schoolId,
      receiptNumber: receipt.receiptNumber,
      amount: receipt.amount,
      paymentDate: receipt.paymentDate,
      paymentMethod: receipt.paymentMethod,
      collectionId: receipt.collectionId,
      remarks: receipt.remarks,
      studentName: fees.studentName,
      admissionNumber: fees.admissionNumber,
      classSection: fees.classSectionLabel,
      raw: receipt.raw,
    }),
    [
      fees.schoolId,
      fees.studentName,
      fees.admissionNumber,
      fees.classSectionLabel,
    ],
  );

  const onDownloadPdf = useCallback(
    async (receipt: StudentFeeReceipt) => {
      if (openingId) return;
      setOpeningId(receipt.id);
      try {
        await downloadStudentFeeReceiptPdf(receiptInput(receipt));
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not create receipt PDF.';
        Alert.alert('Download failed', message);
      } finally {
        setOpeningId(null);
      }
    },
    [openingId, receiptInput],
  );
  const identityLine = [
    fees.studentName || 'Student',
    fees.admissionNumber ? `ADM #${fees.admissionNumber}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const paymentsBooting =
    fees.paymentsStatus === 'idle' || fees.paymentsStatus === 'loading';
  const receiptsBooting =
    tab === 'receipts' &&
    (fees.receiptsStatus === 'idle' ||
      (fees.receiptsStatus === 'loading' && fees.receipts.length === 0));

  const showBootLoader =
    (tab === 'my_payments' && paymentsBooting && fees.assignments.length === 0) ||
    receiptsBooting;

  return (
    <TeacherScreen
      header={
        <StudentModuleHeader
          title="My Fees"
          trailingIcon="refresh-outline"
          onTrailingPress={onRefresh}
          trailingAccessibilityLabel="Refresh fees"
        />
      }
      contentStyle={styles.content}
      refreshing={
        tab === 'my_payments'
          ? fees.paymentsStatus === 'loading'
          : fees.receiptsStatus === 'loading'
      }
      onRefresh={onRefresh}
    >
      <View style={styles.hero}>
        <View style={styles.heroTitleRow}>
          <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>My Fees</Text>
          <View style={[styles.financePill, { backgroundColor: theme.colors.tintBlue }]}>
            <Text style={[styles.financePillText, { color: theme.colors.info }]}>Finance</Text>
          </View>
        </View>
        <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
          View your fee details, demand bills by term, and payment receipts.
        </Text>
        {fees.yearLabel ? (
          <Text style={[styles.yearLine, { color: theme.colors.textSecondary }]}>
            Academic year: {fees.yearLabel}
          </Text>
        ) : null}
      </View>

      <SegmentedControl segments={TABS} activeKey={tab} onChange={onTabChange} />

      {showBootLoader ? (
        <ScreenLoader
          message={tab === 'receipts' ? 'Loading receipts…' : 'Loading your fee details…'}
        />
      ) : null}

      {!showBootLoader && tab === 'my_payments' ? (
        <View style={styles.tabBody}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>My Fees</Text>
              {identityLine ? (
                <Text style={[styles.identity, { color: theme.colors.textSecondary }]}>
                  {identityLine}
                </Text>
              ) : null}
            </View>
          </View>

          {fees.paymentsError ? (
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>
              {fees.paymentsError}
            </Text>
          ) : null}

          {fees.assignments.length > 0 ? (
            <View style={styles.summaryRow}>
              <SummaryCard
                label="Total Fee"
                value={fmtInr(fees.summary.totalFee)}
                tint={theme.colors.tintBlue}
                color={theme.colors.primary}
              />
              <SummaryCard
                label="Paid"
                value={fmtInr(fees.summary.paid)}
                tint={theme.colors.tintGreen}
                color={theme.colors.success}
              />
              <SummaryCard
                label="Total Dues"
                value={fmtInr(fees.summary.dues)}
                tint={theme.colors.tintRed}
                color={theme.colors.danger}
              />
            </View>
          ) : null}

          {fees.assignments.length === 0 && !fees.paymentsError ? (
            <EmptyState
              icon="wallet-outline"
              title="No fee assignments"
              message="No fee assignments found for your account."
            />
          ) : (
            fees.assignments.map((item) => (
              <AssignmentCard key={item.id} item={item} theme={theme} />
            ))
          )}
        </View>
      ) : null}

      {!showBootLoader && tab === 'receipts' ? (
        <View style={styles.tabBody}>
          <SectionHeader title="My Receipts" />

          {fees.receiptsError ? (
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>
              {fees.receiptsError}
            </Text>
          ) : null}

          {fees.receipts.length === 0 && !fees.receiptsError ? (
            <EmptyState
              icon="receipt-outline"
              title="No receipts yet"
              message="No payment receipts found yet."
            />
          ) : (
            fees.receipts.map((r) => (
              <ReceiptCard
                key={r.id}
                receipt={r}
                theme={theme}
                loading={openingId === r.id}
                onDownloadPdf={() => void onDownloadPdf(r)}
              />
            ))
          )}

          {fees.receiptsTotalPages > 1 ? (
            <View style={styles.pager}>
              <TouchableOpacity
                disabled={fees.receiptsPage <= 1 || fees.receiptsStatus === 'loading'}
                onPress={() => void fees.loadReceiptsPage(fees.receiptsPage - 1)}
                style={[
                  styles.pagerBtn,
                  { borderColor: theme.colors.border, opacity: fees.receiptsPage <= 1 ? 0.4 : 1 },
                ]}
              >
                <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>‹ Prev</Text>
              </TouchableOpacity>
              <Text style={[styles.pagerLabel, { color: theme.colors.textSecondary }]}>
                Page {fees.receiptsPage} / {fees.receiptsTotalPages} ({fees.receiptsTotal} total)
              </Text>
              <TouchableOpacity
                disabled={
                  fees.receiptsPage >= fees.receiptsTotalPages ||
                  fees.receiptsStatus === 'loading'
                }
                onPress={() => void fees.loadReceiptsPage(fees.receiptsPage + 1)}
                style={[
                  styles.pagerBtn,
                  {
                    borderColor: theme.colors.border,
                    opacity: fees.receiptsPage >= fees.receiptsTotalPages ? 0.4 : 1,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>Next ›</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {fees.receiptsStatus === 'loading' && fees.receipts.length > 0 ? (
            <Text style={[styles.pagerLabel, { color: theme.colors.textSecondary, marginTop: 8 }]}>
              Loading…
            </Text>
          ) : null}
        </View>
      ) : null}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 28 },
  hero: { gap: 4 },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  financePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  financePillText: { fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 22, fontWeight: '800', flex: 1 },
  heroSub: { fontSize: 13, lineHeight: 18 },
  yearLine: { fontSize: 12, marginTop: 2 },
  tabBody: { gap: 12 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  identity: { fontSize: 12, marginTop: 2 },
  errorText: { fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
    minWidth: 0,
  },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  summaryValue: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  assignCard: { gap: 12 },
  assignHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  assignHeadLeft: { flex: 1, minWidth: 0 },
  assignHeadRight: { alignItems: 'flex-end' },
  assignTitle: { fontSize: 15, fontWeight: '700' },
  assignMeta: { fontSize: 12, marginTop: 2 },
  totalFeeLabel: { fontSize: 11 },
  totalFeeValue: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  breakGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  breakCell: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  breakLabel: { fontSize: 10 },
  breakValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  demandHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  demandTitle: { fontSize: 13, fontWeight: '700' },
  outstanding: { fontSize: 12, fontWeight: '700' },
  termList: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, overflow: 'hidden' },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  termIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termIndexText: { fontSize: 12, fontWeight: '700' },
  termInfo: { flex: 1, minWidth: 0, gap: 4 },
  termLabel: { fontSize: 13, fontWeight: '600' },
  termMeta: { fontSize: 11 },
  termPillWrap: { alignSelf: 'flex-start' },
  termRight: { alignItems: 'flex-end', gap: 6 },
  termAmount: { fontSize: 13, fontWeight: '700' },
  paidText: { fontSize: 12, fontWeight: '700' },
  noTerms: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  noTermsText: { fontSize: 13, lineHeight: 18 },
  receiptCard: { gap: 10 },
  receiptTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  receiptIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptInfo: { flex: 1, minWidth: 0 },
  receiptNumber: { fontSize: 14, fontWeight: '700' },
  receiptMeta: { fontSize: 11, marginTop: 2 },
  receiptAmount: { fontSize: 15, fontWeight: '800' },
  receiptDetails: { gap: 2 },
  receiptDetail: { fontSize: 12 },
  pdfBtn: { alignSelf: 'flex-start' },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  pagerBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pagerLabel: { flex: 1, textAlign: 'center', fontSize: 12 },
});
