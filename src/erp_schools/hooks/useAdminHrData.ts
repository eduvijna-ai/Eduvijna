/**
 * Admin HR & Payroll — web HRTab school-wide parity.
 * Leave Types · Leave Applications (approve) · Payslips · staff lookups.
 * Staff list / Staff Attendance live elsewhere (Class Overview / Attendance hub).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  leaveApplicationsApi,
  leaveTypesApi,
  payslipsApi,
  staffProfilesApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export const PAYSLIP_STATUSES = [
  'draft',
  'generated',
  'approved',
  'paid',
  'cancelled',
] as const;

export type AdminHrTab = 'leave-types' | 'leave-apps' | 'payslips';

export type StaffOption = {
  id: number;
  userId?: number;
  name: string;
  employeeCode: string;
  department: string;
  designation: string;
  phone: string;
  employmentType: string;
};

export type LeaveTypeRow = {
  id: number;
  name: string;
  code: string;
  maxDays: number;
  isPaid: boolean;
  carryForward: boolean;
  description: string;
  isActive: boolean;
};

export type LeaveAppRow = {
  id: number;
  staffId: number;
  staffName: string;
  leaveTypeId: number;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  halfDay: '' | 'first_half' | 'second_half';
  reason: string;
  applyDate: string;
  status: string;
  isActive: boolean;
};

export type PayslipRow = {
  id: number;
  staffId: number;
  staffName: string;
  employeeCode: string;
  department: string;
  designation: string;
  phone: string;
  employmentType: string;
  month: number;
  year: number;
  basic: number;
  hra: number;
  da: number;
  ta: number;
  otherAllowances: number;
  pf: number;
  tax: number;
  otherDeductions: number;
  gross: number;
  net: number;
  status: string;
  isActive: boolean;
};

export type LeaveTypeForm = {
  name: string;
  code: string;
  maxDays: number;
  isPaid: boolean;
  carryForward: boolean;
  description: string;
};

export type LeaveAppForm = {
  staffId: number;
  leaveTypeId: number;
  applyDate: string;
  fromDate: string;
  toDate: string;
  halfDay: '' | 'first_half' | 'second_half';
  reason: string;
  status?: string;
};

export type PayslipForm = {
  staffId: number;
  month: number;
  year: number;
  basic: number;
  hra: number;
  da: number;
  ta: number;
  otherAllowances: number;
  pf: number;
  tax: number;
  otherDeductions: number;
  status: string;
};

function parseHalfDay(reason: string): LeaveAppRow['halfDay'] {
  if (/\[Half Day:\s*First Half\]/i.test(reason)) return 'first_half';
  if (/\[Half Day:\s*Second Half\]/i.test(reason)) return 'second_half';
  return '';
}

function stripHalfDay(reason: string): string {
  return reason.replace(/\[Half Day:\s*(First|Second) Half\]\s*/i, '').trim();
}

function encodeHalfDay(reason: string, halfDay: LeaveAppRow['halfDay']): string {
  const base = reason.trim();
  if (halfDay === 'first_half') return `[Half Day: First Half]${base ? ` ${base}` : ''}`;
  if (halfDay === 'second_half') return `[Half Day: Second Half]${base ? ` ${base}` : ''}`;
  return base;
}

function mapStaff(r: Record<string, unknown>): StaffOption {
  const id = pickNumber(r.id);
  const name =
    [pickString(r.first_name), pickString(r.last_name)].filter(Boolean).join(' ') ||
    pickString(r.full_name, r.name, `Staff #${id}`);
  return {
    id,
    userId: pickNumber(r.user_id) || undefined,
    name,
    employeeCode: pickString(r.employee_code, `EMP${String(id).padStart(4, '0')}`),
    department: pickString(r.department),
    designation: pickString(r.designation),
    phone: pickString(r.phone, r.mobile),
    employmentType: pickString(r.employment_type, 'staff').replace(/_/g, ' '),
  };
}

export function useAdminHrData() {
  const { schoolId: sid } = useSchoolsSession();
  const schoolId = sid ?? undefined;

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([]);
  const [leaveApps, setLeaveApps] = useState<LeaveAppRow[]>([]);
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);

  const [leaveStatusFilter, setLeaveStatusFilter] = useState('');
  const [payslipViewPeriod, setPayslipViewPeriod] = useState<'all' | 'monthly' | 'yearly'>(
    'all',
  );
  const [payslipMonth, setPayslipMonth] = useState(new Date().getMonth() + 1);
  const [payslipYear, setPayslipYear] = useState(new Date().getFullYear());
  const [payslipDepartment, setPayslipDepartment] = useState('');
  const [payslipQuery, setPayslipQuery] = useState('');

  const staffById = useMemo(() => {
    const m = new Map<number, StaffOption>();
    staff.forEach((s) => m.set(s.id, s));
    return m;
  }, [staff]);

  const leaveTypeById = useMemo(() => {
    const m = new Map<number, LeaveTypeRow>();
    leaveTypes.forEach((t) => m.set(t.id, t));
    return m;
  }, [leaveTypes]);

  const loadStaff = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await staffProfilesApi.list({ school_id: schoolId, per_page: 200 });
      setStaff(safeList<Record<string, unknown>>(raw).map(mapStaff));
    } catch {
      setStaff([]);
    }
  }, [schoolId]);

  const loadLeaveTypes = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await leaveTypesApi.list({ school_id: schoolId, per_page: 100 });
      setLeaveTypes(
        safeList<Record<string, unknown>>(raw).map((r) => ({
          id: pickNumber(r.id),
          name: pickString(r.name, 'Leave'),
          code: pickString(r.code),
          maxDays: pickNumber(r.max_days, 10),
          isPaid: r.is_paid !== false,
          carryForward: Boolean(r.carry_forward),
          description: pickString(r.description),
          isActive: r.is_active !== false,
        })),
      );
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load leave types'));
      setLeaveTypes([]);
    }
  }, [schoolId]);

  const loadLeaveApps = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await leaveApplicationsApi.list({
        school_id: schoolId,
        status: leaveStatusFilter || undefined,
        per_page: 100,
      });
      setLeaveApps(
        safeList<Record<string, unknown>>(raw).map((r) => {
          const staffId = pickNumber(r.staff_id);
          const typeId = pickNumber(r.leave_type_id);
          const reason = pickString(r.reason);
          const half = parseHalfDay(reason);
          const days = pickNumber(r.days, half ? 0.5 : 1);
          return {
            id: pickNumber(r.id),
            staffId,
            staffName: pickString(r.staff_name, `Staff #${staffId}`),
            leaveTypeId: typeId,
            leaveTypeName: pickString(r.leave_type_name, `Type #${typeId}`),
            fromDate: pickString(r.from_date).slice(0, 10),
            toDate: pickString(r.to_date).slice(0, 10),
            days,
            halfDay: half || (days === 0.5 ? 'first_half' : ''),
            reason: stripHalfDay(reason),
            applyDate: pickString(r.created_at, r.apply_date).slice(0, 10),
            status: pickString(r.status, 'pending').toLowerCase(),
            isActive: r.is_active !== false,
          };
        }),
      );
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load leave applications'));
      setLeaveApps([]);
    }
  }, [schoolId, leaveStatusFilter]);

  const loadPayslips = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await payslipsApi.list({ school_id: schoolId, per_page: 200 });
      setPayslips(
        safeList<Record<string, unknown>>(raw).map((r) => {
          const staffId = pickNumber(r.staff_id);
          const basic = pickNumber(r.basic_salary, r.basic);
          const hra = pickNumber(r.hra);
          const da = pickNumber(r.da);
          const ta = pickNumber(r.ta);
          const otherAllowances = pickNumber(r.other_allowances);
          const pf = pickNumber(r.pf_deduction);
          const tax = pickNumber(r.tax_deduction);
          const otherDeductions = pickNumber(r.other_deductions);
          const gross =
            pickNumber(r.gross_salary) || basic + hra + da + ta + otherAllowances;
          const net =
            pickNumber(r.net_salary) || gross - pf - tax - otherDeductions;
          return {
            id: pickNumber(r.id),
            staffId,
            staffName: pickString(r.staff_name, `Staff #${staffId}`),
            employeeCode: `EMP${String(staffId).padStart(4, '0')}`,
            department: pickString(r.department),
            designation: pickString(r.designation),
            phone: '',
            employmentType: 'staff',
            month: pickNumber(r.month),
            year: pickNumber(r.year),
            basic,
            hra,
            da,
            ta,
            otherAllowances,
            pf,
            tax,
            otherDeductions,
            gross,
            net,
            status: pickString(r.status, 'draft').toLowerCase(),
            isActive: r.is_active !== false,
          };
        }),
      );
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load payslips'));
      setPayslips([]);
    }
  }, [schoolId]);

  const enrichedLeaveApps = useMemo(
    () =>
      leaveApps.map((a) => ({
        ...a,
        staffName: staffById.get(a.staffId)?.name || a.staffName,
        leaveTypeName: leaveTypeById.get(a.leaveTypeId)?.name || a.leaveTypeName,
      })),
    [leaveApps, staffById, leaveTypeById],
  );

  const enrichedPayslips = useMemo(
    () =>
      payslips.map((p) => {
        const s = staffById.get(p.staffId);
        return {
          ...p,
          staffName: s?.name || p.staffName,
          employeeCode: s?.employeeCode || p.employeeCode,
          department: s?.department || p.department,
          designation: s?.designation || p.designation,
          phone: s?.phone || p.phone,
          employmentType: s?.employmentType || p.employmentType,
        };
      }),
    [payslips, staffById],
  );

  const bootstrap = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      await Promise.all([loadStaff(), loadLeaveTypes(), loadPayslips()]);
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
    }
  }, [loadStaff, loadLeaveTypes, loadPayslips]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadLeaveApps();
  }, [status, loadLeaveApps]);

  const filteredPayslips = useMemo(() => {
    return enrichedPayslips.filter((p) => {
      if (payslipViewPeriod !== 'all' && p.year !== payslipYear) return false;
      if (payslipViewPeriod === 'monthly' && p.month !== payslipMonth) return false;
      if (payslipDepartment && p.department !== payslipDepartment) return false;
      const q = payslipQuery.trim().toLowerCase();
      if (q) {
        const hay = `${p.staffName} ${p.employeeCode} staff #${p.staffId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    enrichedPayslips,
    payslipViewPeriod,
    payslipYear,
    payslipMonth,
    payslipDepartment,
    payslipQuery,
  ]);

  const departmentOptions = useMemo(
    () =>
      [...new Set(staff.map((s) => s.department).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [staff],
  );

  const saveLeaveType = useCallback(
    async (form: LeaveTypeForm, editingId?: number) => {
      if (!form.name.trim()) return false;
      setBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          max_days: form.maxDays,
          is_paid: form.isPaid,
          carry_forward: form.carryForward,
          description: form.description.trim() || undefined,
        };
        if (editingId) await leaveTypesApi.update(editingId, payload);
        else await leaveTypesApi.create(payload);
        await loadLeaveTypes();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save leave type failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadLeaveTypes],
  );

  const removeLeaveType = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await leaveTypesApi.softDelete(id);
        await loadLeaveTypes();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [loadLeaveTypes],
  );

  const saveLeaveApp = useCallback(
    async (form: LeaveAppForm, editingId?: number) => {
      setBusy(true);
      setError(null);
      try {
        const days = form.halfDay ? 0.5 : Math.max(1, Math.ceil(
          (new Date(`${form.toDate}T12:00:00`).getTime() -
            new Date(`${form.fromDate}T12:00:00`).getTime()) /
            86400000,
        ) + 1);
        const reason = encodeHalfDay(form.reason, form.halfDay);
        if (editingId) {
          await leaveApplicationsApi.update(
            editingId,
            {
              from_date: form.fromDate,
              to_date: form.toDate,
              days,
              reason,
              status: form.status,
            },
            schoolId,
          );
        } else {
          await leaveApplicationsApi.create({
            school_id: schoolId,
            staff_id: form.staffId,
            leave_type_id: form.leaveTypeId,
            from_date: form.fromDate,
            to_date: form.toDate,
            days,
            reason,
          });
        }
        await loadLeaveApps();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save leave failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadLeaveApps],
  );

  const approveLeave = useCallback(
    async (id: number, decision: 'approved' | 'rejected', remarks?: string) => {
      setBusy(true);
      try {
        await leaveApplicationsApi.approve(
          id,
          { status: decision, remarks: remarks || undefined },
          schoolId,
        );
        await loadLeaveApps();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Update status failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadLeaveApps],
  );

  const removeLeaveApp = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await leaveApplicationsApi.softDelete(id, schoolId);
        await loadLeaveApps();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadLeaveApps],
  );

  const savePayslip = useCallback(
    async (form: PayslipForm, editingId?: number) => {
      setBusy(true);
      setError(null);
      try {
        const gross =
          form.basic + form.hra + form.da + form.ta + form.otherAllowances;
        const net = gross - form.pf - form.tax - form.otherDeductions;
        const payload = {
          school_id: schoolId,
          staff_id: form.staffId,
          month: form.month,
          year: form.year,
          basic_salary: form.basic,
          hra: form.hra,
          da: form.da,
          ta: form.ta,
          other_allowances: form.otherAllowances,
          pf_deduction: form.pf,
          tax_deduction: form.tax,
          other_deductions: form.otherDeductions,
          gross_salary: gross,
          net_salary: net,
          status: form.status,
        };
        if (editingId) await payslipsApi.update(editingId, payload, schoolId);
        else await payslipsApi.create(payload);
        setPayslipViewPeriod('monthly');
        setPayslipMonth(form.month);
        setPayslipYear(form.year);
        await loadPayslips();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save payslip failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadPayslips],
  );

  const removePayslip = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await payslipsApi.softDelete(id, schoolId);
        await loadPayslips();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadPayslips],
  );

  return useMemo(
    () => ({
      status,
      error,
      busy,
      staff,
      leaveTypes,
      leaveApps: enrichedLeaveApps,
      payslips: filteredPayslips,
      payslipTotal: filteredPayslips.length,
      leaveStatusFilter,
      setLeaveStatusFilter,
      payslipViewPeriod,
      setPayslipViewPeriod,
      payslipMonth,
      setPayslipMonth,
      payslipYear,
      setPayslipYear,
      payslipDepartment,
      setPayslipDepartment,
      payslipQuery,
      setPayslipQuery,
      departmentOptions,
      loadStaff,
      loadLeaveTypes,
      loadLeaveApps,
      loadPayslips,
      saveLeaveType,
      removeLeaveType,
      saveLeaveApp,
      approveLeave,
      removeLeaveApp,
      savePayslip,
      removePayslip,
      refetch: bootstrap,
    }),
    [
      status,
      error,
      busy,
      staff,
      leaveTypes,
      enrichedLeaveApps,
      filteredPayslips,
      leaveStatusFilter,
      payslipViewPeriod,
      payslipMonth,
      payslipYear,
      payslipDepartment,
      payslipQuery,
      departmentOptions,
      loadStaff,
      loadLeaveTypes,
      loadLeaveApps,
      loadPayslips,
      saveLeaveType,
      removeLeaveType,
      saveLeaveApp,
      approveLeave,
      removeLeaveApp,
      savePayslip,
      removePayslip,
      bootstrap,
    ],
  );
}
