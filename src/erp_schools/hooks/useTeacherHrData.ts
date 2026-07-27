/**
 * Teacher HR / payroll / leave — web HRTab My Leave + My Payslips parity.
 * APIs: staff/me, leave-types, leave-applications, payslips
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
  currentPayroll as mockCurrentPayroll,
  leaveBalances as mockBalances,
  leaveHistory as mockHistory,
  leaveTypeOptions as mockLeaveTypes,
  salaryBreakdown as mockBreakdown,
  salaryHistory as mockSalaryHistory,
} from '../data';
import type {
  LeaveBalance,
  LeaveRecord,
  PayslipSummary,
  SalaryBreakdown,
} from '../types/domain';
import {
  extractErrorMessage,
  formatDisplayDate,
  pickNumber,
  pickString,
  safeList,
  settledValue,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

type LeaveOption = { label: string; value: string; maxDays?: number };

export type LeaveFormPayload = {
  leaveTypeId: string | number;
  fromDate: string;
  toDate: string;
  reason?: string;
  halfDay?: 'first' | 'second' | null;
  days?: number;
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function leaveTypeCode(label: string, i: number): LeaveBalance['type'] {
  const raw = label.toUpperCase();
  if (raw.includes('MED') || raw.startsWith('ML')) return 'ML';
  if (raw.includes('EARN') || raw.startsWith('EL')) return 'EL';
  if (raw.includes('COMP') || raw.startsWith('CO')) return 'CO';
  if (raw.includes('CASUAL') || raw.startsWith('CL')) return 'CL';
  return (['CL', 'ML', 'EL', 'CO'] as const)[i % 4];
}

function mapLeaveStatus(raw: string): LeaveRecord['status'] {
  const s = raw.toLowerCase();
  if (s.includes('approve')) return 'approved';
  if (s.includes('reject')) return 'rejected';
  if (s.includes('cancel')) return 'cancelled';
  return 'pending';
}

function parseHalfDay(reason: string): 'first' | 'second' | null {
  if (/\[Half Day:\s*First Half\]/i.test(reason)) return 'first';
  if (/\[Half Day:\s*Second Half\]/i.test(reason)) return 'second';
  return null;
}

function stripHalfDayPrefix(reason: string): string {
  return reason.replace(/\[Half Day:\s*(First|Second) Half\]\s*/i, '').trim();
}

function encodeHalfDayReason(reason: string, halfDay?: 'first' | 'second' | null): string {
  const base = reason.trim();
  if (halfDay === 'first') return `[Half Day: First Half]${base ? ` ${base}` : ''}`;
  if (halfDay === 'second') return `[Half Day: Second Half]${base ? ` ${base}` : ''}`;
  return base;
}

function mapPayslip(p: Record<string, unknown>, i: number): PayslipSummary {
  const month = pickNumber(p.month);
  const year = pickNumber(p.year);
  const monthLabel =
    month && year
      ? `${MONTH_NAMES[Math.max(0, Math.min(11, month - 1))]} ${year}`
      : pickString(p.month_label, p.period, p.month, `Payslip ${i + 1}`);
  const basic = pickNumber(p.basic_salary, p.basic, p.basic_pay);
  const hra = pickNumber(p.hra);
  const da = pickNumber(p.da);
  const ta = pickNumber(p.ta);
  const otherAllow = pickNumber(p.other_allowances);
  const pf = pickNumber(p.pf_deduction);
  const tax = pickNumber(p.tax_deduction);
  const otherDed = pickNumber(p.other_deductions);
  const earnTotal =
    pickNumber(p.gross_salary) || basic + hra + da + ta + otherAllow;
  const dedTotal = pf + tax + otherDed || pickNumber(p.total_deductions);
  const net = pickNumber(p.net_salary, p.net_pay, p.amount, earnTotal - dedTotal);
  const statusRaw = pickString(p.status).toLowerCase() || 'paid';
  const status = (
    ['paid', 'pending', 'processing', 'draft', 'generated', 'approved', 'cancelled'].includes(
      statusRaw,
    )
      ? statusRaw
      : 'paid'
  ) as PayslipSummary['status'];
  const payslipId = pickNumber(p.id, i + 1);

  return {
    id: String(payslipId || `pay-${i}`),
    payslipId,
    monthLabel,
    month: month || undefined,
    year: year || undefined,
    paidOn: formatDisplayDate(pickString(p.payment_date, p.paid_on, p.created_at) || null),
    netSalary: net,
    grossSalary: earnTotal,
    basicSalary: basic,
    status,
    paymentMethod: pickString(p.payment_method) || undefined,
    employeeCode: pickString(p.employee_code, p.emp_id) || undefined,
    staffName: pickString(p.staff_name, p.full_name, p.name) || undefined,
    department: pickString(p.department) || undefined,
    designation: pickString(p.designation) || undefined,
    earnings: {
      basic,
      hra,
      da,
      ta,
      otherAllowances: otherAllow,
      total: earnTotal,
    },
    deductions: {
      pf,
      tax,
      other: otherDed,
      total: dedTotal,
    },
  };
}

function mapLeaveApp(
  a: Record<string, unknown>,
  i: number,
  typeNameById: Map<number, string>,
): LeaveRecord {
  const leaveId = pickNumber(a.id, i + 1);
  const typeId = pickNumber(a.leave_type_id);
  const typeLabel = pickString(
    a.leave_type_name,
    typeNameById.get(typeId),
    a.type,
    'Leave',
  );
  const reason = pickString(a.reason);
  const halfDay = parseHalfDay(reason);
  const fromRaw = pickString(a.from_date, a.start_date);
  const toRaw = pickString(a.to_date, a.end_date);
  const from = formatDisplayDate(fromRaw || null);
  const to = formatDisplayDate(toRaw || null);
  return {
    id: String(leaveId || `lv-${i}`),
    leaveId,
    leaveTypeId: typeId || undefined,
    type: leaveTypeCode(typeLabel, i),
    typeLabel,
    dateRange: from && to ? `${from} – ${to}` : from || to,
    fromDate: fromRaw.slice(0, 10),
    toDate: toRaw.slice(0, 10),
    days: pickNumber(a.days, a.total_days, halfDay ? 0.5 : 1),
    reason: stripHalfDayPrefix(reason) || undefined,
    halfDay,
    applyDate: formatDisplayDate(pickString(a.created_at, a.apply_date) || null) || undefined,
    status: mapLeaveStatus(pickString(a.status)),
    decisionLabel: pickString(a.remarks, a.status),
    isActive: a.is_active !== false,
  };
}

export function useTeacherHrData() {
  const { schoolId, userId } = useSchoolsSession();
  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [staffName, setStaffName] = useState('');
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>(mockBalances);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRecord[]>(mockHistory);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<LeaveOption[]>(mockLeaveTypes);
  const [currentPayroll, setCurrentPayroll] = useState(mockCurrentPayroll);
  const [salaryHistory, setSalaryHistory] = useState<PayslipSummary[]>(
    mockSalaryHistory as PayslipSummary[],
  );
  const [salaryBreakdown, setSalaryBreakdown] = useState<SalaryBreakdown>(mockBreakdown);

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setLeaveBalances(mockBalances);
      setLeaveHistory(mockHistory);
      setLeaveTypeOptions(mockLeaveTypes);
      setCurrentPayroll(mockCurrentPayroll);
      setSalaryHistory(mockSalaryHistory as PayslipSummary[]);
      setSalaryBreakdown(mockBreakdown);
      setStatus('ready');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      // Resolve own staff profile (web HRTab non-admin path)
      let ownStaffId: number | null = null;
      try {
        const me = (await staffProfilesApi.getMyProfile(schoolId ?? undefined)) as Record<
          string,
          unknown
        >;
        ownStaffId = pickNumber(me.id, me.staff_id) || null;
        if (!ownStaffId && userId) ownStaffId = userId;
        setStaffId(ownStaffId);
        setStaffName(pickString(me.full_name, me.name, me.first_name));
      } catch {
        ownStaffId = userId;
        setStaffId(ownStaffId);
      }

      const baseParams: Record<string, string | number> = { per_page: 50 };
      if (schoolId) baseParams.school_id = schoolId;

      const leaveParams = { ...baseParams };
      const payParams = { ...baseParams, per_page: 200 };
      if (ownStaffId) {
        leaveParams.staff_id = ownStaffId;
        payParams.staff_id = ownStaffId;
      }

      const results = await Promise.allSettled([
        leaveTypesApi.list({ ...baseParams, per_page: 200 }),
        leaveApplicationsApi.list(leaveParams),
        payslipsApi.list(payParams),
      ]);

      const types = safeList<Record<string, unknown>>(settledValue(results[0], null));
      let apps = safeList<Record<string, unknown>>(settledValue(results[1], null));
      let pays = safeList<Record<string, unknown>>(settledValue(results[2], null));

      // Fallback: if staff-scoped list empty, fetch all and filter client-side (web does this for payslips)
      if (ownStaffId && pays.length === 0) {
        try {
          const allPays = safeList<Record<string, unknown>>(
            await payslipsApi.list({ ...baseParams, per_page: 200 }),
          );
          pays = allPays.filter(
            (p) =>
              pickNumber(p.staff_id) === ownStaffId ||
              pickNumber(p.user_id) === userId,
          );
        } catch {
          /* keep empty */
        }
      }
      if (ownStaffId && apps.length === 0) {
        try {
          const allApps = safeList<Record<string, unknown>>(
            await leaveApplicationsApi.list({ ...baseParams, per_page: 50 }),
          );
          apps = allApps.filter((a) => pickNumber(a.staff_id) === ownStaffId);
        } catch {
          /* keep empty */
        }
      }

      const typeNameById = new Map<number, string>();
      types.forEach((t) => {
        const id = pickNumber(t.id);
        if (id) typeNameById.set(id, pickString(t.name, t.leave_type_name, 'Leave'));
      });

      setLeaveTypeOptions(
        types.length
          ? types.map((t) => {
              const name = pickString(t.name, t.leave_type_name, 'Leave');
              const maxDays = pickNumber(t.max_days);
              return {
                label: maxDays ? `${name} (${maxDays} days max)` : name,
                value: String(pickNumber(t.id) || pickString(t.id, t.code, t.name)),
                maxDays: maxDays || undefined,
              };
            })
          : mockLeaveTypes,
      );

      setLeaveBalances(
        types.length
          ? types.map((t, i) => {
              const label = pickString(t.name, t.leave_type_name, 'Leave');
              const maxDays = pickNumber(t.max_days);
              return {
                id: pickString(t.id, t.code, `leave-type-${i}`),
                type: leaveTypeCode(label, i),
                label,
                daysLeft: pickNumber(t.remaining, t.balance, t.available_days, maxDays),
                maxDays: maxDays || undefined,
                accent: (['green', 'blue', 'orange', 'purple'] as const)[i % 4],
              };
            })
          : [],
      );

      setLeaveHistory(apps.map((a, i) => mapLeaveApp(a, i, typeNameById)));

      const mappedPays = pays.map((p, i) => mapPayslip(p, i));
      // Newest first by year/month
      mappedPays.sort((a, b) => {
        const ay = a.year || 0;
        const by = b.year || 0;
        if (ay !== by) return by - ay;
        return (b.month || 0) - (a.month || 0);
      });
      setSalaryHistory(mappedPays);

      const latest = mappedPays[0];
      if (latest) {
        const earn = latest.earnings;
        const ded = latest.deductions;
        setCurrentPayroll({
          monthLabel: latest.monthLabel,
          netSalary: latest.netSalary,
          status: latest.status === 'paid' ? 'paid' : 'pending',
          paidOn: latest.paidOn,
        });
        setSalaryBreakdown({
          basic: earn?.basic ?? latest.basicSalary ?? 0,
          allowances:
            (earn?.hra ?? 0) +
            (earn?.da ?? 0) +
            (earn?.ta ?? 0) +
            (earn?.otherAllowances ?? 0),
          deductions: ded?.total ?? 0,
          net: latest.netSalary,
        });
      } else {
        setCurrentPayroll({ monthLabel: '—', netSalary: 0, status: 'paid', paidOn: '' });
        setSalaryBreakdown({ basic: 0, allowances: 0, deductions: 0, net: 0 });
      }

      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
    }
  }, [schoolId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyLeave = useCallback(
    async (payload: LeaveFormPayload) => {
      if (!staffId) {
        setError('Staff profile not found. Please try again.');
        return false;
      }
      setSaving(true);
      setError(null);
      try {
        const half = payload.halfDay || null;
        const days = half ? 0.5 : payload.days ?? 1;
        await leaveApplicationsApi.create({
          school_id: schoolId ?? undefined,
          staff_id: staffId,
          leave_type_id: Number(payload.leaveTypeId),
          from_date: payload.fromDate,
          to_date: payload.toDate,
          days,
          reason: encodeHalfDayReason(payload.reason || '', half),
        });
        await load();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to apply leave'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, staffId, load],
  );

  const updateLeave = useCallback(
    async (leaveId: number, payload: LeaveFormPayload) => {
      setSaving(true);
      setError(null);
      try {
        const half = payload.halfDay || null;
        const days = half ? 0.5 : payload.days ?? 1;
        await leaveApplicationsApi.update(
          leaveId,
          {
            from_date: payload.fromDate,
            to_date: payload.toDate,
            days,
            reason: encodeHalfDayReason(payload.reason || '', half),
            leave_type_id: Number(payload.leaveTypeId) || undefined,
          },
          schoolId ?? undefined,
        );
        await load();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to update leave'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, load],
  );

  const deactivateLeave = useCallback(
    async (leaveId: number) => {
      setSaving(true);
      setError(null);
      try {
        await leaveApplicationsApi.softDelete(leaveId, schoolId ?? undefined);
        await load();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to deactivate leave'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, load],
  );

  const getPayslip = useCallback(
    async (payslipId: number): Promise<PayslipSummary | null> => {
      try {
        const raw = (await payslipsApi.get(payslipId, schoolId ?? undefined)) as Record<
          string,
          unknown
        >;
        return mapPayslip(raw, 0);
      } catch (e) {
        // Fall back to cached list row
        const cached = salaryHistory.find((s) => s.payslipId === payslipId);
        if (cached) return cached;
        setError(extractErrorMessage(e, 'Failed to load payslip'));
        return null;
      }
    },
    [schoolId, salaryHistory],
  );

  return useMemo(
    () => ({
      leaveBalances,
      leaveHistory,
      leaveTypeOptions,
      currentPayroll,
      salaryHistory,
      salaryBreakdown,
      staffId,
      staffName,
      status,
      error,
      saving,
      today: toLocalDateStr(),
      refetch: load,
      applyLeave,
      updateLeave,
      deactivateLeave,
      getPayslip,
    }),
    [
      leaveBalances,
      leaveHistory,
      leaveTypeOptions,
      currentPayroll,
      salaryHistory,
      salaryBreakdown,
      staffId,
      staffName,
      status,
      error,
      saving,
      load,
      applyLeave,
      updateLeave,
      deactivateLeave,
      getPayslip,
    ],
  );
}
