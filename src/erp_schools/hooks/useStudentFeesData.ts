/**
 * useStudentFeesData — web FeesTab student mode (My Fees + Receipts).
 * APIs: studentFeesApi.myPayments / myReceipts.
 * Receipt PDF uses list row data only (no feeCollectionsApi — student 403 → logout).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { studentFeesApi } from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  type LoadStatus,
} from '../utils/apiHelpers';
import { computeFeeSummaryFromPayments } from '../utils/studentDashboardMeta';
import { useSchoolsSession } from './useSchoolsSession';

export type FeeTermStatus = 'pending' | 'paid' | 'overdue' | 'waived';

export type StudentFeeTerm = {
  id: string;
  termNumber: number;
  termLabel: string;
  dueDate: string;
  amountDue: number;
  status: FeeTermStatus;
};

export type StudentFeeAssignmentCard = {
  id: string;
  className: string;
  frequency: string;
  startDate: string;
  totalFee: number;
  baseFee: number;
  transportFee: number;
  discountAmount: number;
  waiverAmount: number;
  remarks: string;
  terms: StudentFeeTerm[];
  outstanding: number;
};

export type StudentFeeReceipt = {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  collectionId: number;
  remarks: string;
  raw: Record<string, unknown>;
};

function normalizeTermStatus(raw: string): FeeTermStatus {
  const s = raw.toLowerCase();
  if (s === 'paid' || s === 'overdue' || s === 'waived' || s === 'pending') return s;
  return 'pending';
}

function mapPaymentItems(data: unknown): {
  items: StudentFeeAssignmentCard[];
  studentName: string;
  admissionNumber: string;
} {
  const root = (data ?? {}) as Record<string, unknown>;
  const rows = safeList<Record<string, unknown>>(root.items ?? data);

  const items: StudentFeeAssignmentCard[] = rows.map((row, index) => {
    const assignment = (row.assignment ?? row) as Record<string, unknown>;
    const termsRaw = safeList<Record<string, unknown>>(row.terms);
    const terms: StudentFeeTerm[] = termsRaw.map((t, ti) => ({
      id: pickString(t.id, `term-${index}-${ti}`),
      termNumber: pickNumber(t.term_number, ti + 1),
      termLabel: pickString(t.term_label, `Term ${pickNumber(t.term_number, ti + 1)}`),
      dueDate: pickString(t.due_date).slice(0, 10),
      amountDue: pickNumber(t.amount_due, t.amount),
      status: normalizeTermStatus(pickString(t.status)),
    }));
    const outstanding = terms
      .filter((t) => t.status === 'pending' || t.status === 'overdue')
      .reduce((sum, t) => sum + t.amountDue, 0);

    return {
      id: pickString(assignment.id, `assign-${index}`),
      className: pickString(
        assignment.class_name,
        assignment.class_id ? `Class #${assignment.class_id}` : 'Class',
      ),
      frequency: pickString(assignment.frequency, 'monthly').replace(/_/g, ' '),
      startDate: pickString(assignment.start_date).slice(0, 10),
      totalFee: pickNumber(assignment.total_fee),
      baseFee: pickNumber(assignment.base_fee),
      transportFee: pickNumber(assignment.transport_fee),
      discountAmount: pickNumber(assignment.discount_amount),
      waiverAmount: pickNumber(assignment.waiver_amount),
      remarks: pickString(assignment.remarks),
      terms,
      outstanding,
    };
  });

  return {
    items,
    studentName: pickString(root.student_name),
    admissionNumber: pickString(root.admission_number),
  };
}

function mapReceipts(data: unknown): { items: StudentFeeReceipt[]; total: number } {
  const root = (data ?? {}) as Record<string, unknown>;
  const rows = safeList<Record<string, unknown>>(root.items ?? data);
  const items: StudentFeeReceipt[] = rows.map((r, i) => ({
    id: pickString(r.id, `rcpt-${i}`),
    receiptNumber: pickString(r.receipt_number, `RCPT-${i + 1}`),
    amount: pickNumber(r.amount),
    paymentDate: pickString(r.payment_date).slice(0, 10),
    paymentMethod: pickString(r.payment_method, '—'),
    collectionId: pickNumber(r.collection_id),
    remarks: pickString(r.remarks),
    raw: r,
  }));
  return {
    items,
    total: pickNumber(root.total, items.length),
  };
}

/** Web FeesTab fallback chain for empty my-payments. */
async function fetchMyPaymentsWithFallbacks(
  schoolId?: number | string,
  academicYearId?: number | null,
): Promise<unknown> {
  let res = await studentFeesApi.myPayments({
    school_id: schoolId,
    academic_year_id: academicYearId ?? undefined,
  });
  if (safeList((res as Record<string, unknown>)?.items ?? res).length === 0 && academicYearId) {
    res = await studentFeesApi.myPayments({ school_id: schoolId });
  }
  if (safeList((res as Record<string, unknown>)?.items ?? res).length === 0) {
    res = await studentFeesApi.myPayments({ academic_year_id: academicYearId ?? undefined });
  }
  if (safeList((res as Record<string, unknown>)?.items ?? res).length === 0 && academicYearId) {
    res = await studentFeesApi.myPayments({});
  }
  return res;
}

const RECEIPTS_PER_PAGE = 25;

export function useStudentFeesData() {
  const session = useSchoolsSession();
  const { selectedYearId, selectedYear } = useAcademicYear();
  const schoolId = session.schoolId ?? undefined;

  const [paymentsStatus, setPaymentsStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<StudentFeeAssignmentCard[]>([]);
  const [studentName, setStudentName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');

  const [receiptsStatus, setReceiptsStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [receiptsError, setReceiptsError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<StudentFeeReceipt[]>([]);
  const [receiptsTotal, setReceiptsTotal] = useState(0);
  const [receiptsPage, setReceiptsPage] = useState(1);
  const [receiptsLoadedOnce, setReceiptsLoadedOnce] = useState(false);

  const loadPayments = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setPaymentsStatus('ready');
      setPaymentsError(null);
      return;
    }

    setPaymentsStatus('loading');
    setPaymentsError(null);

    try {
      const res = await fetchMyPaymentsWithFallbacks(schoolId, selectedYearId);
      const mapped = mapPaymentItems(res);
      setAssignments(mapped.items);
      setStudentName(mapped.studentName);
      setAdmissionNumber(mapped.admissionNumber);
      setPaymentsStatus('ready');
    } catch (e) {
      setAssignments([]);
      setPaymentsError(extractErrorMessage(e, 'Failed to load your fee details'));
      setPaymentsStatus('error');
    }
  }, [schoolId, selectedYearId]);

  const loadReceipts = useCallback(
    async (page = 1) => {
      if (USE_MOCK_DATA) {
        setReceiptsStatus('ready');
        setReceiptsError(null);
        setReceiptsLoadedOnce(true);
        return;
      }

      setReceiptsStatus('loading');
      setReceiptsError(null);

      try {
        const res = await studentFeesApi.myReceipts({
          school_id: schoolId,
          page,
          per_page: RECEIPTS_PER_PAGE,
        });
        const mapped = mapReceipts(res);
        setReceipts(mapped.items);
        setReceiptsTotal(mapped.total);
        setReceiptsPage(page);
        setReceiptsStatus('ready');
        setReceiptsLoadedOnce(true);
      } catch (e) {
        setReceipts([]);
        setReceiptsTotal(0);
        setReceiptsError(extractErrorMessage(e, 'Failed to load receipts'));
        setReceiptsStatus('error');
        setReceiptsLoadedOnce(true);
      }
    },
    [schoolId],
  );

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const ensureReceipts = useCallback(() => {
    if (!receiptsLoadedOnce || receiptsStatus === 'idle') {
      void loadReceipts(1);
    }
  }, [receiptsLoadedOnce, receiptsStatus, loadReceipts]);

  const summary = useMemo(() => {
    const dash = computeFeeSummaryFromPayments({
      student_name: studentName,
      admission_number: admissionNumber,
      items: assignments.map((a) => ({
        assignment: {
          total_fee: a.totalFee,
          class_name: a.className,
        },
        terms: a.terms.map((t) => ({
          status: t.status,
          amount_due: t.amountDue,
          due_date: t.dueDate,
          term_label: t.termLabel,
        })),
      })),
    });
    return {
      totalFee: dash.total,
      paid: dash.paid,
      dues: dash.due,
    };
  }, [assignments, studentName, admissionNumber]);

  const classSectionLabel = useMemo(() => {
    const first = assignments[0]?.className?.trim();
    return first || undefined;
  }, [assignments]);

  const receiptsTotalPages = Math.max(1, Math.ceil(receiptsTotal / RECEIPTS_PER_PAGE) || 1);

  const refetch = useCallback(async () => {
    await loadPayments();
    if (receiptsLoadedOnce) await loadReceipts(receiptsPage);
  }, [loadPayments, loadReceipts, receiptsLoadedOnce, receiptsPage]);

  return {
    schoolId,
    yearLabel: selectedYear?.name || '',
    paymentsStatus,
    paymentsError,
    assignments,
    studentName,
    admissionNumber,
    classSectionLabel,
    summary,
    receiptsStatus,
    receiptsError,
    receipts,
    receiptsTotal,
    receiptsPage,
    receiptsTotalPages,
    receiptsPerPage: RECEIPTS_PER_PAGE,
    ensureReceipts,
    loadReceiptsPage: loadReceipts,
    refetch,
    loadPayments,
  };
}
