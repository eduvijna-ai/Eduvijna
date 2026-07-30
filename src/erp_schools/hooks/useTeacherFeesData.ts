/**
 * useTeacherFeesData — Fees tab (web FeesTab).
 * Teacher: class-scoped Assignment / Register / Demand / Collections.
 * Admin (scope: 'school'): school-wide + Fee Structure + Receipts.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  classOverviewApi,
  demandBillApi,
  feeCollectionsApi,
  feeNotificationsApi,
  feeReceiptsApi,
  feeReportsApi,
  feeStructuresApi,
  feeTermSchedulesApi,
  feeTypesApi,
  routesApi,
  studentFeeAssignmentsApi,
  studentsLookupApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  settledValue,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

export type FeesDataScope = 'teacher' | 'school';

export type UseTeacherFeesOptions = {
  /** teacher = assigned classes only; school = admin school-wide (+ structures/receipts). */
  scope?: FeesDataScope;
};
export const COLLECTION_STATUSES = [
  'pending',
  'partial',
  'paid',
  'overdue',
  'waived',
  'refunded',
] as const;

export const FEE_FREQUENCIES = [
  'monthly',
  'quarterly',
  'half_yearly',
  'yearly',
  'one_time',
] as const;

export type TeacherFeeKpis = {
  totalDue: number;
  totalCollected: number;
  totalPending: number;
  collectionRate: number;
  todayCollection: number;
  thisMonthCollection: number;
  outstandingOverdue: number;
  studentsWithDues: number;
};

export type FeeRegisterSummary = {
  totalDue: number;
  totalDiscount: number;
  totalPaid: number;
  totalBalance: number;
  total: number;
};

export type FeeRegisterRow = {
  id: string;
  collectionId: string;
  studentId: number;
  studentName: string;
  admissionNo: string;
  className: string;
  frequency: string;
  term: string;
  total: number;
  paid: number;
  discount: number;
  balance: number;
  mode: string;
  status: string;
  dueDate: string;
};

export type FeeAssignmentRow = {
  id: string;
  studentId: number;
  studentName: string;
  admissionNo: string;
  classId: number;
  className: string;
  frequency: string;
  termsGenerated: boolean;
  baseFee: number;
  transportFee: number;
  waiverAmount: number;
  discountAmount: number;
  totalFee: number;
  routeName: string;
  transportRouteId?: number;
  transportMonths: number;
  startDate: string;
  remarks: string;
  isActive: boolean;
  feeStructureId?: number;
};

export type FeeCollectionRow = {
  id: string;
  studentId: number;
  studentName: string;
  admissionNo: string;
  amountDue: number;
  amountPaid: number;
  fine: number;
  paymentMethod: string;
  status: string;
  paymentDate: string;
  dueDate: string;
  transactionRef: string;
  remarks: string;
  isActive: boolean;
  feeStructureId?: number;
  termScheduleId?: number;
};

export type DemandBillRow = {
  assignmentId: number;
  studentId: number;
  studentName: string;
  admissionNo: string;
  fatherName: string;
  mobile: string;
  className: string;
  termLabel: string;
  termAmount: number;
  previousDues: number;
  totalAmount: number;
};

export type FeeTermRow = {
  id: string;
  termNumber: number;
  termLabel: string;
  dueDate: string;
  amountDue: number;
  status: string;
};

export type FeeClassOption = { id: number; name: string };
export type FeeStudentOption = {
  id: number;
  name: string;
  admissionNo: string;
  classId?: number;
};
export type FeeRouteOption = { id: number; name: string; monthlyFee: number };

export type FeeStructureRow = {
  id: string;
  structureId: number;
  name: string;
  classId: number;
  className: string;
  feeTypeId?: number;
  feeTypeName: string;
  amount: number;
  frequency: string;
  dueDay: number;
  lateFeePerDay: number;
  description: string;
  isActive: boolean;
};

export type FeeTypeOption = { id: number; name: string };

export type FeeReceiptRow = {
  id: string;
  receiptId: number;
  receiptNumber: string;
  collectionId: number;
  studentName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  remarks: string;
  isActive: boolean;
};

export type StructureFormInput = {
  name: string;
  feeTypeId: number;
  amount: number;
  frequency: string;
  dueDay: number;
  lateFeePerDay: number;
  classIds: number[];
  description: string;
};

export type ReceiptFormInput = {
  collectionId: number;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  remarks: string;
};

export type AssignmentFormInput = {
  studentId: number;
  classId: number;
  baseFee: number;
  transportFee: number;
  waiverAmount: number;
  discountAmount: number;
  frequency: string;
  startDate: string;
  remarks: string;
  transportRouteId?: number;
  transportMonths: number;
};

export type CollectionFormInput = {
  studentId: number;
  feeStructureId?: number;
  termScheduleId?: number;
  amountDue: number;
  amountPaid: number;
  fine: number;
  paymentMethod: string;
  paymentDate: string;
  dueDate: string;
  transactionRef: string;
  remarks: string;
  status?: string;
};

function emptyKpis(): TeacherFeeKpis {
  return {
    totalDue: 0,
    totalCollected: 0,
    totalPending: 0,
    collectionRate: 0,
    todayCollection: 0,
    thisMonthCollection: 0,
    outstandingOverdue: 0,
    studentsWithDues: 0,
  };
}

function emptyRegisterSummary(): FeeRegisterSummary {
  return { totalDue: 0, totalDiscount: 0, totalPaid: 0, totalBalance: 0, total: 0 };
}

function mapAssignment(a: Record<string, unknown>, i: number): FeeAssignmentRow {
  return {
    id: pickString(a.id, `asg-${i}`),
    studentId: pickNumber(a.student_id),
    studentName: pickString(a.student_name, a.name, 'Student'),
    admissionNo: pickString(a.admission_number, a.adm_no, '—'),
    classId: pickNumber(a.class_id),
    className: pickString(a.class_name, a.class_code, '—'),
    frequency: pickString(a.frequency, a.billing_frequency, 'monthly'),
    termsGenerated: Boolean(a.terms_generated),
    baseFee: pickNumber(a.base_fee),
    transportFee: pickNumber(a.transport_fee),
    waiverAmount: pickNumber(a.waiver_amount),
    discountAmount: pickNumber(a.discount_amount),
    totalFee: pickNumber(a.total_fee),
    routeName: pickString(a.route_name, '—'),
    transportRouteId: pickNumber(a.transport_route_id) || undefined,
    transportMonths: pickNumber(a.transport_months, 1) || 1,
    startDate: pickString(a.start_date),
    remarks: pickString(a.remarks),
    isActive: a.is_active !== false,
    feeStructureId: pickNumber(a.fee_structure_id) || undefined,
  };
}

function deriveCollectionStatus(amountPaying: number, amountDue: number): string {
  if (amountPaying <= 0) return 'pending';
  if (amountPaying >= amountDue) return 'paid';
  return 'partial';
}

export function useTeacherFeesData(options?: UseTeacherFeesOptions) {
  const scope: FeesDataScope = options?.scope === 'school' ? 'school' : 'teacher';
  const isSchoolScope = scope === 'school';
  const session = useSchoolsSession();
  const { selectedYearId, selectedYear } = useAcademicYear();

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [kpis, setKpis] = useState<TeacherFeeKpis>(emptyKpis);
  const [trend, setTrend] = useState<Array<{ date: string; amount: number }>>([]);
  const [defaulters, setDefaulters] = useState<
    Array<{ id: string; name: string; amount: number; className: string }>
  >([]);

  const [teacherClassIds, setTeacherClassIds] = useState<number[]>([]);
  const [classOptions, setClassOptions] = useState<FeeClassOption[]>([]);
  const [routes, setRoutes] = useState<FeeRouteOption[]>([]);

  const [register, setRegister] = useState<FeeRegisterRow[]>([]);
  const [registerSummary, setRegisterSummary] = useState<FeeRegisterSummary>(emptyRegisterSummary);
  const [registerFilters, setRegisterFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
  });
  const [registerLoading, setRegisterLoading] = useState(false);

  const [assignments, setAssignments] = useState<FeeAssignmentRow[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignClassId, setAssignClassId] = useState<number | undefined>();

  const [collections, setCollections] = useState<FeeCollectionRow[]>([]);
  const [collectionStatus, setCollectionStatus] = useState('');
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  const [demandRows, setDemandRows] = useState<DemandBillRow[]>([]);
  const [demandMonthLabel, setDemandMonthLabel] = useState('');
  const [demandLoading, setDemandLoading] = useState(false);
  const [demandMonth, setDemandMonth] = useState(() => new Date().getMonth() + 1);
  const [demandYear, setDemandYear] = useState(() => new Date().getFullYear());
  const [demandClassId, setDemandClassId] = useState<number | undefined>();

  const [structures, setStructures] = useState<FeeStructureRow[]>([]);
  const [structuresLoading, setStructuresLoading] = useState(false);
  const [structureQuery, setStructureQuery] = useState('');
  const [structureClassId, setStructureClassId] = useState<number | undefined>();
  const [structureFeeTypeId, setStructureFeeTypeId] = useState<number | undefined>();
  const [feeTypes, setFeeTypes] = useState<FeeTypeOption[]>([]);

  const [receipts, setReceipts] = useState<FeeReceiptRow[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);

  const schoolId = session.schoolId ?? undefined;
  const academicYearId = selectedYearId ?? undefined;
  const academicYearLabel = selectedYear?.name || '';
  const teacherUserId = session.userId ?? undefined;
  /** Teacher: lock to first assigned class. Admin school scope: no lock. */
  const restrictedClassId = isSchoolScope ? undefined : teacherClassIds[0];

  const resolveTeacherClasses = useCallback(async () => {
    if (!academicYearId) {
      setTeacherClassIds([]);
      setClassOptions([]);
      return [] as number[];
    }
    try {
      const overview = await classOverviewApi.getAll({
        academic_year_id: academicYearId,
        school_id: schoolId,
      });
      const rows = safeList<Record<string, unknown>>(overview);
      const ids = [
        ...new Set(
          rows
            .filter((r) => {
              if (r.class_id == null) return false;
              if (isSchoolScope || !teacherUserId) return true;
              const tid = Number(r.teacher_id);
              const ctid = Number(r.class_teacher_id);
              return tid === teacherUserId || ctid === teacherUserId;
            })
            .map((r) => Number(r.class_id))
            .filter((n) => Number.isFinite(n) && n > 0),
        ),
      ];
      const options: FeeClassOption[] = [];
      const seen = new Set<number>();
      rows.forEach((r) => {
        const cid = Number(r.class_id);
        if (!ids.includes(cid) || seen.has(cid)) return;
        seen.add(cid);
        const name = [
          pickString(r.class_name, r.class_code, `Class ${cid}`),
          pickString(r.section_name),
        ]
          .filter(Boolean)
          .join(' · ');
        options.push({ id: cid, name });
      });
      setTeacherClassIds(ids);
      setClassOptions(options);
      return ids;
    } catch {
      setTeacherClassIds([]);
      setClassOptions([]);
      return [] as number[];
    }
  }, [academicYearId, schoolId, teacherUserId, isSchoolScope]);

  const loadShell = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const ids = await resolveTeacherClasses();
      const classIdsParam = ids.length > 0 ? ids.join(',') : undefined;

      const results = await Promise.allSettled([
        feeReportsApi.summary({ school_id: schoolId }),
        feeReportsApi.defaulters({ limit: 10, school_id: schoolId }),
        feeReportsApi.trend({ days: 30, school_id: schoolId }),
        feeReportsApi.outstandingDues({
          school_id: schoolId,
          class_ids: classIdsParam,
          academic_year_id: academicYearId,
        }),
        studentFeeAssignmentsApi.list({
          school_id: schoolId,
          academic_year_id: academicYearId,
          per_page: 200,
        }),
        routesApi.list({ school_id: schoolId, per_page: 200 }),
      ]);

      const kpiRaw = settledValue(results[0], null) as Record<string, unknown> | null;
      const defRaw = settledValue(results[1], null);
      const trendRaw = settledValue(results[2], null);
      const duesRaw = settledValue(results[3], null) as Record<string, unknown> | null;
      const assignRaw = settledValue(results[4], null);
      const routesRaw = settledValue(results[5], null);

      let assignItems = safeList<Record<string, unknown>>(assignRaw);
      // Teacher scope only: narrow KPI totals to assigned classes. Admin sees school-wide.
      if (!isSchoolScope && ids.length > 0) {
        const idSet = new Set(ids);
        const scoped = assignItems.filter(
          (a) => a.class_id != null && idSet.has(Number(a.class_id)),
        );
        if (scoped.length > 0) assignItems = scoped;
      }

      let next: TeacherFeeKpis = {
        totalDue: pickNumber(kpiRaw?.total_due),
        totalCollected: pickNumber(kpiRaw?.total_collected),
        totalPending: pickNumber(kpiRaw?.total_pending),
        collectionRate: pickNumber(kpiRaw?.collection_rate),
        todayCollection: pickNumber(kpiRaw?.today_collection),
        thisMonthCollection: pickNumber(kpiRaw?.this_month_collection),
        outstandingOverdue: pickNumber(duesRaw?.total_overdue, duesRaw?.outstanding),
        studentsWithDues: pickNumber(
          duesRaw?.student_count,
          kpiRaw?.total_students_with_dues,
        ),
      };

      if (next.outstandingOverdue > 0 && next.totalPending === 0) {
        next = {
          ...next,
          totalPending: next.outstandingOverdue,
          studentsWithDues: next.studentsWithDues || pickNumber(duesRaw?.student_count),
        };
      }

      if (next.totalDue === 0 && assignItems.length > 0) {
        const assignDue = assignItems.reduce((sum, a) => sum + pickNumber(a.total_fee), 0);
        if (assignDue > 0) {
          next = {
            ...next,
            totalDue: assignDue,
            totalPending: Math.max(assignDue - next.totalCollected, 0),
            studentsWithDues: new Set(
              assignItems.map((a) => String(a.student_id ?? a.user_id)),
            ).size,
            collectionRate:
              next.totalCollected > 0
                ? Math.round((next.totalCollected / assignDue) * 1000) / 10
                : 0,
          };
        }
      }

      setKpis(next);
      setTrend(
        safeList<Record<string, unknown>>(
          (trendRaw as { items?: unknown })?.items ?? trendRaw,
        ).map((t) => ({
          date: pickString(t.date, t.day),
          amount: pickNumber(t.amount, t.total),
        })),
      );
      setDefaulters(
        safeList<Record<string, unknown>>(
          (defRaw as { items?: unknown })?.items ?? defRaw,
        ).map((d, i) => ({
          id: pickString(d.student_id, d.id, `def-${i}`),
          name: pickString(d.student_name, d.name, 'Student'),
          amount: pickNumber(d.outstanding, d.balance, d.amount),
          className: pickString(d.class_name, '—'),
        })),
      );
      setRoutes(
        safeList<Record<string, unknown>>(routesRaw).map((r) => ({
          id: pickNumber(r.id),
          name: pickString(r.route_name, r.name, `Route ${r.id}`),
          monthlyFee: pickNumber(r.monthly_fee, r.fee),
        })),
      );

      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
      setKpis(emptyKpis());
    }
  }, [resolveTeacherClasses, schoolId, academicYearId, isSchoolScope]);

  const loadRegister = useCallback(async () => {
    if (USE_MOCK_DATA) return;
    setRegisterLoading(true);
    try {
      let studentIds: number[] = [];
      if (restrictedClassId) {
        const assignRaw = await studentFeeAssignmentsApi.list({
          class_id: restrictedClassId,
          school_id: schoolId,
          per_page: 200,
        });
        studentIds = safeList<Record<string, unknown>>(assignRaw)
          .filter((a) => a.is_active !== false)
          .map((a) => pickNumber(a.student_id))
          .filter((n) => n > 0);
      }

      const res = await feeReportsApi.register({
        student_ids:
          restrictedClassId && studentIds.length > 0 ? studentIds.join(',') : undefined,
        date_from: registerFilters.dateFrom || undefined,
        date_to: registerFilters.dateTo || undefined,
        status: registerFilters.status || undefined,
        school_id: schoolId,
        page: 1,
        per_page: 50,
      });

      const raw = res as Record<string, unknown>;
      const items = safeList<Record<string, unknown>>(raw.items ?? res);
      setRegisterSummary({
        totalDue: pickNumber(raw.total_due),
        totalDiscount: pickNumber(raw.total_discount),
        totalPaid: pickNumber(raw.total_paid),
        totalBalance: pickNumber(raw.total_balance),
        total: pickNumber(raw.total, items.length),
      });
      setRegister(
        items.map((r, i) => ({
          id: pickString(r.collection_id, r.id, `reg-${i}`),
          collectionId: pickString(r.collection_id, r.id, `reg-${i}`),
          studentId: pickNumber(r.student_id),
          studentName: pickString(r.student_name, `Student #${r.student_id}`),
          admissionNo: pickString(r.admission_number, '—'),
          className: pickString(r.class_name, '—'),
          frequency: pickString(r.frequency, '—').replace(/_/g, ' '),
          term: pickString(r.term_label, r.term, '—'),
          total: pickNumber(r.amount_due, r.total_fee, r.total),
          paid: pickNumber(r.amount_paid, r.paid),
          discount: pickNumber(r.discount),
          balance: pickNumber(r.balance),
          mode: pickString(r.payment_method, '—').toUpperCase(),
          status: pickString(r.status, 'pending'),
          dueDate: pickString(r.due_date, '—'),
        })),
      );
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load fees register'));
      setRegister([]);
      setRegisterSummary(emptyRegisterSummary());
    } finally {
      setRegisterLoading(false);
    }
  }, [restrictedClassId, schoolId, registerFilters]);

  const loadAssignments = useCallback(async () => {
    if (USE_MOCK_DATA) return;
    setAssignLoading(true);
    try {
      // Match web FeesTab: optional class filter only. Do not auto-lock to a single
      // teacher class in school (admin) scope — that hid other classes' assignments.
      const classId =
        assignClassId ??
        restrictedClassId ??
        (!isSchoolScope && teacherClassIds.length === 1 ? teacherClassIds[0] : undefined);
      const raw = await studentFeeAssignmentsApi.list({
        school_id: schoolId,
        academic_year_id: academicYearId,
        class_id: classId,
        per_page: 200,
      });
      let items = safeList<Record<string, unknown>>(raw).map(mapAssignment);
      if (!isSchoolScope && !classId && teacherClassIds.length > 0) {
        const idSet = new Set(teacherClassIds);
        items = items.filter((a) => idSet.has(a.classId));
      }
      setAssignments(items);
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load fee assignments'));
      setAssignments([]);
    } finally {
      setAssignLoading(false);
    }
  }, [assignClassId, restrictedClassId, teacherClassIds, schoolId, academicYearId, isSchoolScope]);

  const loadCollections = useCallback(async () => {
    if (USE_MOCK_DATA) return;
    setCollectionsLoading(true);
    try {
      const raw = await feeCollectionsApi.list({
        status: collectionStatus || undefined,
        class_id: restrictedClassId,
        page: 1,
        per_page: 100,
        school_id: schoolId,
      });
      setCollections(
        safeList<Record<string, unknown>>(raw).map((c, i) => ({
          id: pickString(c.id, `col-${i}`),
          studentId: pickNumber(c.student_id),
          studentName: pickString(c.student_name, `Student #${c.student_id}`),
          admissionNo: pickString(c.admission_number, '—'),
          amountDue: pickNumber(c.amount_due),
          amountPaid: pickNumber(c.amount_paid),
          fine: pickNumber(c.fine),
          paymentMethod: pickString(c.payment_method, '—'),
          status: pickString(c.status, 'pending'),
          paymentDate: pickString(c.payment_date, '—'),
          dueDate: pickString(c.due_date),
          transactionRef: pickString(c.transaction_ref),
          remarks: pickString(c.remarks),
          isActive: c.is_active !== false,
          feeStructureId: pickNumber(c.fee_structure_id) || undefined,
          termScheduleId: pickNumber(c.term_schedule_id) || undefined,
        })),
      );
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load collections'));
      setCollections([]);
    } finally {
      setCollectionsLoading(false);
    }
  }, [collectionStatus, restrictedClassId, schoolId]);

  const loadDemandBill = useCallback(async () => {
    if (USE_MOCK_DATA) return;
    // Web DemandBillView: class_id optional ("All Classes"). Teacher scope still needs a class.
    const classId =
      demandClassId ??
      restrictedClassId ??
      (!isSchoolScope && teacherClassIds.length === 1 ? teacherClassIds[0] : undefined);
    if (!isSchoolScope && !classId) {
      setDemandRows([]);
      setDemandMonthLabel('');
      return;
    }
    setDemandLoading(true);
    try {
      const raw = (await demandBillApi.get({
        month: demandMonth,
        year: demandYear,
        class_id: classId,
        school_id: schoolId,
      })) as Record<string, unknown>;
      setDemandMonthLabel(pickString(raw.month_label, `${demandMonth}/${demandYear}`));
      setDemandRows(
        safeList<Record<string, unknown>>(raw.items ?? raw).map((r) => ({
          assignmentId: pickNumber(r.assignment_id),
          studentId: pickNumber(r.student_id),
          studentName: pickString(r.student_name, 'Student'),
          admissionNo: pickString(r.admission_number, '—'),
          fatherName: pickString(r.father_name),
          mobile: pickString(r.mobile),
          className: pickString(r.class_name, '—'),
          termLabel: pickString(r.term_label, '—'),
          termAmount: pickNumber(r.term_amount),
          previousDues: pickNumber(r.previous_dues),
          totalAmount: pickNumber(r.total_amount),
        })),
      );
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to generate demand bill'));
      setDemandRows([]);
    } finally {
      setDemandLoading(false);
    }
  }, [
    demandClassId,
    restrictedClassId,
    teacherClassIds,
    demandMonth,
    demandYear,
    schoolId,
    isSchoolScope,
  ]);

  useEffect(() => {
    void loadShell();
  }, [loadShell]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadRegister();
  }, [status, loadRegister]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadAssignments();
  }, [status, loadAssignments]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadCollections();
  }, [status, loadCollections]);

  useEffect(() => {
    if (restrictedClassId && demandClassId == null) {
      setDemandClassId(restrictedClassId);
    } else if (!isSchoolScope && teacherClassIds.length === 1 && demandClassId == null) {
      setDemandClassId(teacherClassIds[0]);
    }
  }, [restrictedClassId, teacherClassIds, demandClassId, isSchoolScope]);

  useEffect(() => {
    if (restrictedClassId && assignClassId == null) {
      setAssignClassId(restrictedClassId);
    } else if (!isSchoolScope && teacherClassIds.length === 1 && assignClassId == null) {
      setAssignClassId(teacherClassIds[0]);
    }
  }, [restrictedClassId, teacherClassIds, assignClassId, isSchoolScope]);

  const loadAssignmentsForClass = useCallback(
    async (classId: number): Promise<FeeAssignmentRow[]> => {
      if (!classId) return [];
      try {
        const raw = await studentFeeAssignmentsApi.list({
          class_id: classId,
          school_id: schoolId,
          per_page: 200,
        });
        return safeList<Record<string, unknown>>(raw)
          .map(mapAssignment)
          .filter((a) => a.isActive);
      } catch {
        return [];
      }
    },
    [schoolId],
  );

  const searchStudents = useCallback(
    async (q: string, classId?: number): Promise<FeeStudentOption[]> => {
      if (!q.trim()) return [];
      try {
        const raw = await studentsLookupApi.list(schoolId, q.trim(), classId);
        return safeList<Record<string, unknown>>(raw).map((s) => ({
          id: pickNumber(s.student_id, s.id, s.user_id),
          name: pickString(s.student_name, s.name, 'Student'),
          admissionNo: pickString(s.admission_number, '—'),
          classId: pickNumber(s.class_id) || undefined,
        }));
      } catch {
        return [];
      }
    },
    [schoolId],
  );

  const loadStructuresForClass = useCallback(
    async (classId: number) => {
      try {
        const raw = await feeStructuresApi.list({
          school_id: schoolId,
          class_ids: classId,
          academic_year_id: academicYearId,
          per_page: 100,
        });
        return safeList<Record<string, unknown>>(raw).map((s) => ({
          id: pickNumber(s.id),
          name: pickString(s.name, s.fee_type_name, 'Fee'),
          amount: pickNumber(s.amount),
        }));
      } catch {
        return [] as Array<{ id: number; name: string; amount: number }>;
      }
    },
    [schoolId, academicYearId],
  );

  const loadTerms = useCallback(
    async (assignmentId: number): Promise<FeeTermRow[]> => {
      const raw = await feeTermSchedulesApi.list({
        assignment_id: assignmentId,
        school_id: schoolId,
      });
      return safeList<Record<string, unknown>>(raw).map((t) => ({
        id: pickString(t.id),
        termNumber: pickNumber(t.term_number),
        termLabel: pickString(t.term_label, `Term ${t.term_number}`),
        dueDate: pickString(t.due_date),
        amountDue: pickNumber(t.amount_due),
        status: pickString(t.status, 'pending'),
      }));
    },
    [schoolId],
  );

  const saveAssignment = useCallback(
    async (editingId: string | null, form: AssignmentFormInput) => {
      setActionBusy(true);
      try {
        const totalFee = Math.max(
          0,
          form.baseFee + form.transportFee - form.waiverAmount - form.discountAmount,
        );
        const payload = {
          school_id: schoolId,
          student_id: form.studentId,
          class_id: form.classId,
          academic_year_id: academicYearId,
          transport_route_id: form.transportRouteId || undefined,
          transport_months: form.transportMonths || 1,
          base_fee: form.baseFee,
          transport_fee: form.transportFee,
          waiver_amount: form.waiverAmount,
          discount_amount: form.discountAmount,
          total_fee: totalFee,
          frequency: form.frequency,
          start_date: form.startDate || undefined,
          remarks: form.remarks || undefined,
        };
        let assignmentId = editingId ? Number(editingId) : 0;
        if (editingId) {
          await studentFeeAssignmentsApi.update(editingId, payload);
        } else {
          const created = (await studentFeeAssignmentsApi.create(payload)) as Record<
            string,
            unknown
          >;
          assignmentId = pickNumber(created?.id);
        }
        if (
          assignmentId &&
          form.startDate &&
          form.frequency &&
          form.frequency !== 'one_time'
        ) {
          await feeTermSchedulesApi.generate(
            {
              assignment_id: assignmentId,
              school_id: schoolId as number,
              frequency: form.frequency,
              start_date: form.startDate,
              total_fee: totalFee,
            },
            schoolId,
          );
        }
        await loadAssignments();
        await loadShell();
      } finally {
        setActionBusy(false);
      }
    },
    [schoolId, academicYearId, loadAssignments, loadShell],
  );

  const removeAssignment = useCallback(
    async (id: string) => {
      setActionBusy(true);
      try {
        await studentFeeAssignmentsApi.remove(id, schoolId);
        await loadAssignments();
      } finally {
        setActionBusy(false);
      }
    },
    [schoolId, loadAssignments],
  );

  const regenerateTerms = useCallback(
    async (row: FeeAssignmentRow) => {
      if (!row.startDate) throw new Error('Set a start date on the assignment first');
      setActionBusy(true);
      try {
        await feeTermSchedulesApi.generate(
          {
            assignment_id: Number(row.id),
            school_id: schoolId as number,
            frequency: row.frequency,
            start_date: row.startDate,
            total_fee: row.totalFee,
          },
          schoolId,
        );
      } finally {
        setActionBusy(false);
      }
    },
    [schoolId],
  );

  const updateTerm = useCallback(
    async (
      termId: string,
      patch: { due_date?: string; amount_due?: number; status?: string },
    ) => {
      await feeTermSchedulesApi.update(termId, patch);
    },
    [],
  );

  const saveCollection = useCallback(
    async (editingId: string | null, form: CollectionFormInput) => {
      setActionBusy(true);
      try {
        const status =
          form.status ||
          deriveCollectionStatus(form.amountPaid, form.amountDue);
        if (editingId) {
          await feeCollectionsApi.update(editingId, {
            amount_paid: form.amountPaid,
            fine: form.fine,
            payment_method: form.paymentMethod,
            status,
            payment_date: form.paymentDate || undefined,
            transaction_ref: form.transactionRef || undefined,
            remarks: form.remarks || undefined,
          });
        } else {
          await feeCollectionsApi.create({
            school_id: schoolId,
            student_id: form.studentId,
            fee_structure_id: form.feeStructureId,
            term_schedule_id: form.termScheduleId,
            amount_due: form.amountDue,
            amount_paid: form.amountPaid,
            fine: form.fine > 0 ? form.fine : undefined,
            payment_method: form.paymentMethod,
            payment_date: form.paymentDate || undefined,
            due_date: form.dueDate || undefined,
            transaction_ref: form.transactionRef || undefined,
            remarks: form.remarks || undefined,
            status,
            collected_by: teacherUserId,
          });
        }
        await loadCollections();
        await loadRegister();
        await loadShell();
      } finally {
        setActionBusy(false);
      }
    },
    [schoolId, teacherUserId, loadCollections, loadRegister, loadShell],
  );

  const removeCollection = useCallback(
    async (id: string) => {
      setActionBusy(true);
      try {
        await feeCollectionsApi.remove(id, schoolId);
        await loadCollections();
      } finally {
        setActionBusy(false);
      }
    },
    [schoolId, loadCollections],
  );

  const notifyDemand = useCallback(
    async (channel: 'sms' | 'whatsapp', studentIds: number[]) => {
      if (!schoolId || studentIds.length === 0) return;
      setActionBusy(true);
      try {
        await feeNotificationsApi.send(
          {
            school_id: schoolId as number,
            student_ids: studentIds,
            channel,
            month: demandMonth,
            year: demandYear,
          },
          schoolId,
        );
      } finally {
        setActionBusy(false);
      }
    },
    [schoolId, demandMonth, demandYear],
  );

  const pendingTermForAssignment = useCallback(
    async (assignment: FeeAssignmentRow) => {
      const terms = await loadTerms(Number(assignment.id));
      return (
        terms.find((t) => t.status === 'pending' || t.status === 'overdue') ??
        terms[0] ??
        null
      );
    },
    [loadTerms],
  );

  const loadFeeTypes = useCallback(async () => {
    if (USE_MOCK_DATA || !isSchoolScope) return;
    try {
      const raw = await feeTypesApi.list({ school_id: schoolId, per_page: 100 });
      setFeeTypes(
        safeList<Record<string, unknown>>(raw).map((r) => ({
          id: pickNumber(r.id),
          name: pickString(r.name, r.fee_type_name, `Type ${r.id}`),
        })),
      );
    } catch {
      setFeeTypes([]);
    }
  }, [isSchoolScope, schoolId]);

  const loadStructures = useCallback(async () => {
    if (USE_MOCK_DATA || !isSchoolScope) return;
    setStructuresLoading(true);
    try {
      const raw = await feeStructuresApi.list({
        school_id: schoolId,
        academic_year_id: academicYearId,
        class_id: structureClassId,
        fee_type_id: structureFeeTypeId,
        q: structureQuery.trim() || undefined,
        per_page: 100,
      });
      setStructures(
        safeList<Record<string, unknown>>(raw).map((r, i) => ({
          id: pickString(r.id, `st-${i}`),
          structureId: pickNumber(r.id),
          name: pickString(r.name, r.structure_name, 'Structure'),
          classId: pickNumber(r.class_id),
          className: pickString(r.class_name, '—'),
          feeTypeId: pickNumber(r.fee_type_id) || undefined,
          feeTypeName: pickString(r.fee_type_name, r.type_name, '—'),
          amount: pickNumber(r.amount),
          frequency: pickString(r.frequency, 'yearly'),
          dueDay: pickNumber(r.due_day, 10),
          lateFeePerDay: pickNumber(r.late_fee_per_day),
          description: pickString(r.description),
          isActive: r.is_active !== false,
        })),
      );
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load fee structures'));
      setStructures([]);
    } finally {
      setStructuresLoading(false);
    }
  }, [
    isSchoolScope,
    schoolId,
    academicYearId,
    structureClassId,
    structureFeeTypeId,
    structureQuery,
  ]);

  const loadReceipts = useCallback(async () => {
    if (USE_MOCK_DATA || !isSchoolScope) return;
    setReceiptsLoading(true);
    try {
      const raw = await feeReceiptsApi.list({
        school_id: schoolId,
        per_page: 100,
      });
      setReceipts(
        safeList<Record<string, unknown>>(raw).map((r, i) => ({
          id: pickString(r.id, `rcpt-${i}`),
          receiptId: pickNumber(r.id),
          receiptNumber: pickString(r.receipt_number, r.number, `R-${r.id}`),
          collectionId: pickNumber(r.collection_id),
          studentName: pickString(r.student_name, '—'),
          amount: pickNumber(r.amount, r.amount_paid),
          paymentMethod: pickString(r.payment_method, 'cash'),
          paymentDate: pickString(r.payment_date, r.date).slice(0, 10),
          remarks: pickString(r.remarks),
          isActive: r.is_active !== false,
        })),
      );
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load receipts'));
      setReceipts([]);
    } finally {
      setReceiptsLoading(false);
    }
  }, [isSchoolScope, schoolId]);

  const saveStructure = useCallback(
    async (input: StructureFormInput, editingId?: number) => {
      setActionBusy(true);
      setError(null);
      try {
        const base = {
          school_id: schoolId,
          academic_year_id: academicYearId,
          name: input.name,
          fee_type_id: input.feeTypeId,
          amount: input.amount,
          frequency: input.frequency,
          due_day: input.dueDay,
          late_fee_per_day: input.lateFeePerDay,
          description: input.description || undefined,
        };
        if (editingId) {
          await feeStructuresApi.update(editingId, {
            ...base,
            class_id: input.classIds[0],
          });
        } else {
          const classIds = input.classIds.length ? input.classIds : [undefined];
          await Promise.all(
            classIds.map((cid) =>
              feeStructuresApi.create({
                ...base,
                class_id: cid,
              }),
            ),
          );
        }
        await loadStructures();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save structure failed'));
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [schoolId, academicYearId, loadStructures],
  );

  const removeStructure = useCallback(
    async (id: number) => {
      setActionBusy(true);
      try {
        await feeStructuresApi.softDelete(id, schoolId);
        await loadStructures();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [schoolId, loadStructures],
  );

  const createFeeType = useCallback(
    async (name: string) => {
      if (!name.trim()) return false;
      setActionBusy(true);
      try {
        await feeTypesApi.create({ school_id: schoolId, name: name.trim() });
        await loadFeeTypes();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Create fee type failed'));
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [schoolId, loadFeeTypes],
  );

  const removeFeeType = useCallback(
    async (id: number) => {
      setActionBusy(true);
      try {
        await feeTypesApi.softDelete(id);
        await loadFeeTypes();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Delete fee type failed'));
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [loadFeeTypes],
  );

  const saveReceipt = useCallback(
    async (input: ReceiptFormInput, editingId?: number) => {
      setActionBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          collection_id: input.collectionId,
          receipt_number: input.receiptNumber,
          amount: input.amount,
          payment_method: input.paymentMethod,
          payment_date: input.paymentDate,
          remarks: input.remarks || undefined,
        };
        if (editingId) {
          await feeReceiptsApi.update(editingId, payload);
        } else {
          await feeReceiptsApi.create(payload);
        }
        await loadReceipts();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save receipt failed'));
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [schoolId, loadReceipts],
  );

  const removeReceipt = useCallback(
    async (id: number) => {
      setActionBusy(true);
      try {
        await feeReceiptsApi.softDelete(id, schoolId);
        await loadReceipts();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate receipt failed'));
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [schoolId, loadReceipts],
  );

  const lookupCollection = useCallback(
    async (collectionId: number) => {
      try {
        const raw = await feeCollectionsApi.getById(collectionId, schoolId);
        const row = ((raw as { data?: unknown })?.data ?? raw) as Record<string, unknown>;
        return {
          amount: pickNumber(row.amount_paid, row.amount),
          amountDue: pickNumber(row.amount_due),
          paymentMethod: pickString(row.payment_method, 'cash'),
          paymentDate: pickString(row.payment_date).slice(0, 10),
          studentName: pickString(row.student_name, `Student #${row.student_id}`),
          admissionNo: pickString(row.admission_number),
          status: pickString(row.status, 'pending'),
          studentId: pickNumber(row.student_id),
        };
      } catch {
        return null;
      }
    },
    [schoolId],
  );

  return useMemo(
    () => ({
      scope,
      isSchoolScope,
      academicYearLabel,
      status,
      error,
      actionBusy,
      kpis,
      trend,
      defaulters,
      teacherClassIds,
      restrictedClassId,
      classOptions,
      routes,
      register,
      registerSummary,
      registerFilters,
      setRegisterFilters,
      registerLoading,
      loadRegister,
      assignments,
      assignLoading,
      assignClassId,
      setAssignClassId,
      loadAssignments,
      collections,
      collectionStatus,
      setCollectionStatus,
      collectionsLoading,
      loadCollections,
      demandRows,
      demandMonthLabel,
      demandLoading,
      demandMonth,
      setDemandMonth,
      demandYear,
      setDemandYear,
      demandClassId,
      setDemandClassId,
      loadDemandBill,
      searchStudents,
      loadAssignmentsForClass,
      loadStructuresForClass,
      loadTerms,
      saveAssignment,
      removeAssignment,
      regenerateTerms,
      updateTerm,
      saveCollection,
      removeCollection,
      notifyDemand,
      pendingTermForAssignment,
      structures,
      structuresLoading,
      structureQuery,
      setStructureQuery,
      structureClassId,
      setStructureClassId,
      structureFeeTypeId,
      setStructureFeeTypeId,
      feeTypes,
      loadFeeTypes,
      loadStructures,
      saveStructure,
      removeStructure,
      createFeeType,
      removeFeeType,
      receipts,
      receiptsLoading,
      loadReceipts,
      saveReceipt,
      removeReceipt,
      lookupCollection,
      refetch: loadShell,
    }),
    [
      scope,
      isSchoolScope,
      academicYearLabel,
      status,
      error,
      actionBusy,
      kpis,
      trend,
      defaulters,
      teacherClassIds,
      restrictedClassId,
      classOptions,
      routes,
      register,
      registerSummary,
      registerFilters,
      registerLoading,
      loadRegister,
      assignments,
      assignLoading,
      assignClassId,
      loadAssignments,
      collections,
      collectionStatus,
      collectionsLoading,
      loadCollections,
      demandRows,
      demandMonthLabel,
      demandLoading,
      demandMonth,
      demandYear,
      demandClassId,
      loadDemandBill,
      searchStudents,
      loadAssignmentsForClass,
      loadStructuresForClass,
      loadTerms,
      saveAssignment,
      removeAssignment,
      regenerateTerms,
      updateTerm,
      saveCollection,
      removeCollection,
      notifyDemand,
      pendingTermForAssignment,
      structures,
      structuresLoading,
      structureQuery,
      structureClassId,
      structureFeeTypeId,
      feeTypes,
      loadFeeTypes,
      loadStructures,
      saveStructure,
      removeStructure,
      createFeeType,
      removeFeeType,
      receipts,
      receiptsLoading,
      loadReceipts,
      saveReceipt,
      removeReceipt,
      lookupCollection,
      loadShell,
    ],
  );
}
