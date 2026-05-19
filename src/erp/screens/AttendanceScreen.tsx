/**
 * Attendance Screen
 * Sub-tabs: Student Attendance | My Attendance | Staff Attendance (admin) | Pending Approvals (admin) | Settings
 *
 * - Student attendance: monthly grid via /attendance/monthly-grid, requires class_id + academic_year context
 * - My Attendance: staff uses staffAttendanceApi, students use studentSummary
 * - Staff grid: staffAttendanceApi.getAll with date range + staffProfilesApi for names
 * - Admins can mark any date and approve pending staff attendance
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  attendanceRecordsApi,
  studentsByUserApi,
  staffAttendanceApi,
  staffProfilesApi,
  attendanceSettingsApi,
} from '../../core/api/erp.api';
import {
  BRAND,
  COLORS,
  SectionHeader,
  LoadingState,
  EmptyState,
  FormField,
  StyledInput,
  SimpleSelect,
  ListRow,
  StatusBadge,
} from '../components/common';
import { useErpRole } from '../hooks/useErpRole';
import { useAcademicYear } from '../contexts/AcademicYearContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function toLocalDateStr(year: number, month1Based: number, day: number): string {
  return `${year}-${String(month1Based).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getMonthMatrix(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = getDaysInMonth(year, month);
  const cells: Array<number | null> = [];

  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= totalDays; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function toNumberOrUndefined(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function buildErrorMessage(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => (typeof d === 'string' ? d : d?.msg || d?.message || JSON.stringify(d)))
      .join(', ');
  }
  if (detail && typeof detail === 'object') {
    return detail.message || detail.msg || JSON.stringify(detail);
  }
  if (typeof error?.message === 'string') return error.message;
  return fallback;
}

function normalizeStudentEntry(s: any) {
  const firstName = String(s?.first_name ?? '').trim();
  const lastName = String(s?.last_name ?? '').trim();
  const fullFromParts = `${firstName} ${lastName}`.trim();

  return {
    student_id:
      toNumberOrUndefined(s?.student_id) ??
      toNumberOrUndefined(s?.student_profile_id) ??
      toNumberOrUndefined(s?.id) ??
      toNumberOrUndefined(s?.user_id),
    student_name:
      s?.student_name ??
      s?.full_name ??
      s?.name ??
      s?.student_full_name ??
      (fullFromParts || undefined),
    admission_number:
      s?.admission_number ??
      s?.admission_no ??
      s?.admission_id ??
      s?.roll_number ??
      '',
    class_id: toNumberOrUndefined(s?.class_id),
    class_name: s?.class_name ?? s?.class ?? undefined,
    section_id: toNumberOrUndefined(s?.section_id),
    section_name: s?.section_name ?? s?.section ?? undefined,
    subject_id: toNumberOrUndefined(s?.subject_id),
    subject_name: s?.subject_name ?? s?.subject ?? undefined,
  };
}

function normalizeStaffEntry(s: any) {
  const firstName = String(s?.first_name ?? '').trim();
  const lastName = String(s?.last_name ?? '').trim();
  const fullFromParts = `${firstName} ${lastName}`.trim();

  return {
    user_id: toNumberOrUndefined(s?.user_id) ?? toNumberOrUndefined(s?.id),
    employee_code: s?.employee_code ?? s?.staff_code ?? s?.emp_code ?? '',
    department: s?.department ?? s?.department_name ?? s?.dept ?? 'General',
    full_name: s?.full_name ?? s?.name ?? (fullFromParts || undefined),
  };
}

function normalizeStaffFromAttendanceRecord(r: any) {
  const uid =
    toNumberOrUndefined(r?.staff_user_id) ??
    toNumberOrUndefined(r?.user_id) ??
    toNumberOrUndefined(r?.staff_id) ??
    toNumberOrUndefined(r?.staff_profile_id);

  return {
    user_id: uid,
    employee_code: r?.employee_code ?? r?.staff_code ?? '',
    department: r?.department ?? r?.department_name ?? 'General',
    full_name: r?.staff_name ?? r?.full_name ?? r?.name ?? (uid ? `Staff #${uid}` : 'Staff'),
  };
}

export default function AttendanceScreen() {
  const navigation = useNavigation<any>();
  const { schoolId, isAdmin, isTeacher, isStudent, user } = useErpRole();
  const { selectedYearId } = useAcademicYear();
  const today = new Date();
  const todayStr = toLocalDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const [activeTab, setActiveTab] = useState('student');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Student tab: 3-step bulk flow
  const [studentFlowStep, setStudentFlowStep] = useState<'select' | 'mark' | 'overview'>('select');
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);
  const [subjectId, setSubjectId] = useState<number | ''>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [classId, setClassId] = useState<number | ''>('');
  const [sectionId, setSectionId] = useState<number | ''>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<Record<number, string>>({});

  // Staff tab: 3-step bulk flow (admin)
  const [staffFlowStep, setStaffFlowStep] = useState<'select' | 'mark' | 'overview'>('select');
  const [staffDateStr, setStaffDateStr] = useState(todayStr);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffDepartment, setStaffDepartment] = useState<string>('all');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffSelectedUserIds, setStaffSelectedUserIds] = useState<number[]>([]);
  const [staffStatuses, setStaffStatuses] = useState<Record<number, string>>({});
  const [staffRecordIds, setStaffRecordIds] = useState<Record<number, number>>({});

  // My Attendance
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [mySummary, setMySummary] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [myFirstHalf, setMyFirstHalf] = useState<'present' | 'absent'>('present');
  const [mySecondHalf, setMySecondHalf] = useState<'present' | 'absent'>('present');
  const [mySaveLoading, setMySaveLoading] = useState(false);

  const myTodayRecord = useMemo(() => {
    if (isStudent) return null;
    return myRecords.find((r: any) => String(r?.date ?? '').slice(0, 10) === todayStr) ?? null;
  }, [isStudent, myRecords, todayStr]);

  const myStatusByDate = useMemo(() => {
    const map: Record<string, string> = {};
    myRecords.forEach((r: any) => {
      const ds = String(r?.date ?? '').slice(0, 10);
      if (!ds) return;
      map[ds] = String(r?.status ?? '').toLowerCase();
    });
    return map;
  }, [myRecords]);

  // Pending approvals
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingRefreshing, setPendingRefreshing] = useState(false);

  // Settings
  const [settings, setSettings] = useState<any>({});

  const baseTabs = [
    { key: 'student', label: 'Student' },
    { key: 'my', label: 'My Attendance' },
    ...(isAdmin ? [{ key: 'staff', label: 'Staff' }] : []),
    ...(isAdmin ? [{ key: 'pending', label: 'Pending' }] : []),
    ...(isAdmin ? [{ key: 'settings', label: 'Settings' }] : []),
  ];

  const baseParams = schoolId ? { school_id: schoolId } : {};

  // Derive class/section options from students-by-user data
  const classOptions = useMemo(() => {
    const map = new Map<number, string>();
    allStudents.forEach((s: any) => {
      if (s.class_id) map.set(s.class_id, s.class_name ?? `Class ${s.class_id}`);
    });
    return Array.from(map, ([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allStudents]);

  const sectionOptions = useMemo(() => {
    const map = new Map<number, string>();
    allStudents
      .filter((s: any) => s.class_id === classId)
      .forEach((s: any) => {
        if (s.section_id) map.set(s.section_id, s.section_name ?? `Section ${s.section_id}`);
      });
    return Array.from(map, ([value, label]) => ({ label, value }));
  }, [allStudents, classId]);

  const subjectOptions = useMemo(() => {
    const map = new Map<number, string>();
    allStudents.forEach((s: any) => {
      if (s.subject_id) map.set(s.subject_id, s.subject_name ?? `Subject ${s.subject_id}`);
    });
    return Array.from(map, ([value, label]) => ({ label, value }));
  }, [allStudents]);

  // Load students-by-user (requires academic_year_id) for class/section dropdowns
  useEffect(() => {
    if (!selectedYearId) return;
    setStudentsLoading(true);
    studentsByUserApi.getAll({ academic_year_id: selectedYearId })
      .then((data: any) => {
        const items: any[] = Array.isArray(data) ? data : (data?.items ?? []);
        const normalized = items.map(normalizeStudentEntry);
        setAllStudents(normalized);
        // Auto-select first available class
        if (classId === '') {
          const first = normalized.find((s: any) => s.class_id);
          if (first?.class_id) setClassId(first.class_id);
        }
      })
      .catch(() => setAllStudents([]))
      .finally(() => setStudentsLoading(false));
  }, [selectedYearId]);

  // Reset section when class changes
  useEffect(() => { setSectionId(''); }, [classId]);

  // Load student attendance via monthly-grid endpoint (selected date context)
  const loadStudentAttendance = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const selectedYear = Number(selectedDateStr.slice(0, 4));
      const selectedMonth = Number(selectedDateStr.slice(5, 7));
      const gridData = await attendanceRecordsApi.monthlyGrid({
        class_id: classId,
        section_id: sectionId || undefined,
        month: selectedMonth,
        year: selectedYear,
        school_id: schoolId,
      });
      const studs: any[] = gridData?.students ?? [];

      const initialStatuses: Record<number, string> = {};
      studs.forEach((s: any) => {
        const sid = toNumberOrUndefined(s.student_id);
        if (!sid) return;
        initialStatuses[sid] = s.daily_status?.[selectedDateStr] ?? '';
      });
      setStudentStatuses(initialStatuses);
      setSelectedStudentIds(
        studs
          .map((s: any) => toNumberOrUndefined(s.student_id))
          .filter((id: number | undefined): id is number => id !== undefined),
      );
    } catch {
      setSelectedStudentIds([]);
      setStudentStatuses({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, classId, sectionId, selectedDateStr]);

  // Load staff attendance and status map for selected date (admin only)
  const loadStaffAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const d = new Date(`${staffDateStr}T00:00:00`);
      const y = d.getFullYear();
      const m = d.getMonth();
      const dateFrom = toLocalDateStr(y, m + 1, 1);
      const dateTo = toLocalDateStr(y, m + 1, getDaysInMonth(y, m));
      const [staffRes, attRes] = await Promise.all([
        staffProfilesApi.list({ ...baseParams, per_page: 200 }),
        staffAttendanceApi.getAll({ ...baseParams, date_from: dateFrom, date_to: dateTo, per_page: 10000 }),
      ]);

      const staffRaw =
        staffRes?.items ??
        staffRes?.data?.items ??
        staffRes?.data ??
        staffRes ??
        [];
      const profileStaff = staffRaw.map(normalizeStaffEntry).filter((s: any) => !!s.user_id);

      const records =
        attRes?.items ??
        attRes?.data?.items ??
        attRes?.records ??
        attRes?.data?.records ??
        attRes?.data ??
        attRes ??
        [];

      const staffMap = new Map<number, any>();
      profileStaff.forEach((s: any) => {
        if (!s.user_id) return;
        staffMap.set(s.user_id, s);
      });

      records.forEach((r: any) => {
        const fromRec = normalizeStaffFromAttendanceRecord(r);
        if (!fromRec.user_id) return;
        if (!staffMap.has(fromRec.user_id)) {
          staffMap.set(fromRec.user_id, fromRec);
        }
      });

      const mergedStaff = Array.from(staffMap.values()).sort((a, b) =>
        String(a.full_name || '').localeCompare(String(b.full_name || '')),
      );
      setStaffList(mergedStaff);

      const statusMap: Record<number, string> = {};
      const recordMap: Record<number, number> = {};

      records.forEach((r: any) => {
        const uid =
          toNumberOrUndefined(r.staff_user_id) ??
          toNumberOrUndefined(r.user_id) ??
          toNumberOrUndefined(r.staff_id) ??
          toNumberOrUndefined(r.staff_profile_id);
        if (!uid) return;
        const recDate = String(r.date ?? '').slice(0, 10);
        if (recDate === staffDateStr) {
          statusMap[uid] = r.status ?? '';
          if (toNumberOrUndefined(r.id)) recordMap[uid] = Number(r.id);
        }
      });

      setStaffStatuses(statusMap);
      setStaffRecordIds(recordMap);

      if (staffFlowStep === 'select') {
        setStaffSelectedUserIds(mergedStaff.map((s: any) => s.user_id));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, staffDateStr, staffFlowStep]);

  // Load my attendance (staff uses staffAttendanceApi, students use studentSummary)
  const loadMyAttendance = useCallback(async () => {
    setMyLoading(true);
    try {
      const daysInMonth = getDaysInMonth(year, month);
      const dateFrom = toLocalDateStr(year, month + 1, 1);
      const dateTo = toLocalDateStr(year, month + 1, daysInMonth);

      if (!isStudent) {
        // Staff/admin: fetch personal records from staffAttendanceApi
        const data = await staffAttendanceApi.getAll({
          staff_user_id: user?.id,
          date_from: dateFrom,
          date_to: dateTo,
          school_id: schoolId,
          per_page: 10000,
        });
        const records: any[] = data?.items ?? data?.data?.items ?? data?.data ?? data ?? [];
        setMyRecords(records);
        const summary = { present: 0, absent: 0, late: 0, total: records.length };
        records.forEach((r: any) => {
          if (r.status === 'present') summary.present++;
          else if (r.status === 'absent') summary.absent++;
          else if (r.status === 'half_day' || r.status === 'late') summary.late++;
        });
        setMySummary(summary);
      } else if (user?.id) {
        // Student: use attendance summary + records for calendar
        const [data, recData] = await Promise.all([
          attendanceRecordsApi.studentSummary({
            student_id: user.id,
            date_from: dateFrom,
            date_to: dateTo,
            school_id: schoolId,
          }),
          attendanceRecordsApi.getAll({
            student_id: user.id,
            date_from: dateFrom,
            date_to: dateTo,
            school_id: schoolId,
            per_page: 10000,
          }),
        ]);
        setMySummary({
          present: data?.present ?? 0,
          absent: data?.absent ?? 0,
          late: data?.late ?? 0,
          total: data?.total_days ?? 0,
        });
        const records: any[] = recData?.items ?? recData?.data?.items ?? recData?.data ?? recData ?? [];
        setMyRecords(records);
      }
    } catch { /* ignore */ }
    finally { setMyLoading(false); }
  }, [user?.id, isStudent, schoolId, year, month]);

  const loadPendingApprovals = useCallback(async () => {
    setPendingLoading(true);
    try {
      const data = await staffAttendanceApi.pendingApprovals(baseParams);
      setPendingApprovals(data?.items ?? data ?? []);
    } catch { /* ignore */ }
    finally { setPendingLoading(false); setPendingRefreshing(false); }
  }, [schoolId]);

  useEffect(() => {
    if (isStudent) return;
    if (!myTodayRecord) {
      setMyFirstHalf('present');
      setMySecondHalf('present');
      return;
    }
    const first = String(myTodayRecord?.first_half ?? '').toLowerCase();
    const second = String(myTodayRecord?.second_half ?? '').toLowerCase();
    setMyFirstHalf(first === 'absent' ? 'absent' : 'present');
    setMySecondHalf(second === 'absent' ? 'absent' : 'present');
  }, [isStudent, myTodayRecord]);

  const loadSettings = useCallback(async () => {
    try {
      const data = await attendanceSettingsApi.get(baseParams);
      setSettings(data ?? {});
    } catch { /* ignore */ }
  }, [schoolId]);

  const approveRecord = async (recordId: number | string, action: 'approved' | 'rejected') => {
    try {
      await staffAttendanceApi.approveRecord(recordId, action, baseParams);
      Alert.alert('Success', `Record ${action}.`);
      loadPendingApprovals();
    } catch (e: any) {
      Alert.alert('Error', buildErrorMessage(e, 'Action failed.'));
    }
  };

  const saveMyAttendance = async () => {
    if (isStudent || !user?.id) return;
    if (!schoolId) {
      Alert.alert('School required', 'Unable to save attendance because the school context is missing.');
      return;
    }
    setMySaveLoading(true);
    try {
      await staffAttendanceApi.bulkUpsert({
        school_id: schoolId,
        date: todayStr,
        records: [
          {
            staff_user_id: Number(user.id),
            first_half: myFirstHalf,
            second_half: mySecondHalf,
          },
        ],
      });
      Alert.alert('Success', 'My attendance saved successfully.');
      await loadMyAttendance();
    } catch (e: any) {
      Alert.alert('Error', buildErrorMessage(e, 'Failed to save my attendance.'));
    } finally {
      setMySaveLoading(false);
    }
  };

  // Reload when tab, period, class, section, or selected date changes
  useEffect(() => {
    if (activeTab === 'student') loadStudentAttendance();
    else if (activeTab === 'my') loadMyAttendance();
    else if (activeTab === 'staff') loadStaffAttendance();
    else if (activeTab === 'pending') loadPendingApprovals();
    else if (activeTab === 'settings') loadSettings();
  }, [activeTab, year, month, classId, sectionId, selectedDateStr, staffDateStr]);

  const formatDateLong = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const shiftSelectedDate = (daysDelta: number) => {
    const d = new Date(`${selectedDateStr}T00:00:00`);
    d.setDate(d.getDate() + daysDelta);
    setSelectedDateStr(toLocalDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudentIds((prev) => (
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    ));
  };

  const markAllSelected = (status: string) => {
    setStudentStatuses((prev) => {
      const next = { ...prev };
      selectedStudentIds.forEach((id) => {
        next[id] = status;
      });
      return next;
    });
  };

  const clearAllSelected = () => {
    setStudentStatuses((prev) => {
      const next = { ...prev };
      selectedStudentIds.forEach((id) => {
        next[id] = '';
      });
      return next;
    });
  };

  const saveBulkAttendance = async () => {
    if (!classId) return;
    if (!schoolId) {
      Alert.alert('School required', 'Unable to save attendance because the school context is missing.');
      return;
    }
    if (!subjectId) {
      Alert.alert('Subject required', 'Please select a subject before saving attendance.');
      return;
    }
    const validStatuses = new Set(['present', 'absent', 'late']);
    const records = selectedStudentIds
      .filter((id) => validStatuses.has(studentStatuses[id]))
      .map((id) => ({ student_id: id, status: studentStatuses[id] }));

    if (records.length === 0) {
      Alert.alert('No records', 'Please mark at least one selected student as Present, Absent, or Late.');
      return;
    }

    const isToday = selectedDateStr === todayStr;
    if (isTeacher && !isToday) {
      Alert.alert('Restricted', 'You can only mark attendance for today.');
      return;
    }

    setSaving(true);
    try {
      await attendanceRecordsApi.bulkUpsert({
        class_id: classId as number,
        section_id: (sectionId as number) || undefined,
        subject_id: Number(subjectId),
        date: selectedDateStr,
        school_id: schoolId,
        records,
      });
      setStudentFlowStep('overview');
    } catch (e: any) {
      Alert.alert('Error', buildErrorMessage(e, 'Failed to save attendance.'));
    } finally {
      setSaving(false);
    }
  };

  const monthOptions = MONTHS.map((m, i) => ({ label: m, value: i }));
  const yearOptions = [-2, -1, 0, 1].map((d) => ({ label: String(today.getFullYear() + d), value: today.getFullYear() + d }));

  const filteredStudentRows = useMemo(() => {
    const base = allStudents.filter((s: any) => {
      if (!classId) return false;
      if (s.class_id !== classId) return false;
      if (sectionId && s.section_id !== sectionId) return false;
      if (subjectId && s.subject_id !== subjectId) return false;
      return true;
    });

    const dedup = new Map<string, any>();
    base.forEach((s: any) => {
      const idKey = s.student_id ? `id:${s.student_id}` : `adm:${s.admission_number || ''}|name:${s.student_name || ''}`;
      if (dedup.has(idKey)) return;
      dedup.set(idKey, {
        student_id: s.student_id,
        student_name: s.student_name,
        admission_number: s.admission_number,
        _row_key: idKey,
      });
    });

    const q = studentSearch.trim().toLowerCase();
    const rows = Array.from(dedup.values());
    if (!q) return rows;
    return rows.filter((s: any) => {
      const name = String(s.student_name ?? '').toLowerCase();
      const adm = String(s.admission_number ?? '').toLowerCase();
      return name.includes(q) || adm.includes(q);
    });
  }, [allStudents, classId, sectionId, subjectId, studentSearch]);

  useEffect(() => {
    if (studentFlowStep !== 'select') return;
    const ids = filteredStudentRows.map((s: any) => s.student_id).filter((id: any) => !!id);
    setSelectedStudentIds(ids);
  }, [studentFlowStep, filteredStudentRows]);

  const selectedCount = selectedStudentIds.length;
  const overviewCounts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let off = 0;
    selectedStudentIds.forEach((id) => {
      const s = studentStatuses[id] ?? '';
      if (s === 'present') present += 1;
      else if (s === 'absent') absent += 1;
      else if (s === 'late') late += 1;
      else off += 1;
    });
    return { total: selectedCount, present, absent, late, off };
  }, [selectedStudentIds, studentStatuses, selectedCount]);

  const getStudentStatusLabel = (status: string) => {
    if (status === 'present') return 'P';
    if (status === 'absent') return 'A';
    if (status === 'late') return 'L';
    return '-';
  };

  const getStudentStatusColor = (status: string) => {
    if (status === 'present') return COLORS.success;
    if (status === 'absent') return COLORS.danger;
    if (status === 'late') return COLORS.warning;
    return COLORS.gray[400];
  };

  const getCalendarStatusCode = (status: string) => {
    if (status === 'present') return 'P';
    if (status === 'absent') return 'A';
    if (status === 'late' || status === 'half_day') return 'L';
    if (status === 'holiday' || status === 'off' || status === 'week_off') return 'H';
    return '';
  };

  const getCalendarStatusColor = (status: string) => {
    if (status === 'present') return COLORS.success;
    if (status === 'absent') return COLORS.danger;
    if (status === 'late' || status === 'half_day') return COLORS.warning;
    if (status === 'holiday' || status === 'off' || status === 'week_off') return COLORS.gray[500];
    return COLORS.gray[300];
  };

  const staffDepartmentOptions = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s: any) => {
      if (s.department) set.add(String(s.department));
    });
    return [{ label: 'All Departments', value: 'all' }, ...Array.from(set).sort().map((d) => ({ label: d, value: d }))];
  }, [staffList]);

  const filteredStaffRows = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    return staffList.filter((s: any) => {
      if (staffDepartment !== 'all' && s.department !== staffDepartment) return false;
      if (!q) return true;
      const name = String(s.full_name ?? '').toLowerCase();
      const code = String(s.employee_code ?? '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [staffList, staffSearch, staffDepartment]);

  useEffect(() => {
    if (staffFlowStep !== 'select') return;
    setStaffSelectedUserIds(filteredStaffRows.map((s: any) => s.user_id));
  }, [staffFlowStep, filteredStaffRows]);

  const staffSelectedCount = staffSelectedUserIds.length;

  const staffOverviewCounts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let off = 0;
    staffSelectedUserIds.forEach((uid) => {
      const st = staffStatuses[uid] ?? '';
      if (st === 'present') present += 1;
      else if (st === 'absent') absent += 1;
      else if (st === 'late' || st === 'half_day') late += 1;
      else off += 1;
    });
    return { total: staffSelectedCount, present, absent, late, off };
  }, [staffSelectedUserIds, staffStatuses, staffSelectedCount]);

  const toggleStaffSelection = (uid: number) => {
    setStaffSelectedUserIds((prev) => (
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    ));
  };

  const markAllSelectedStaff = (status: string) => {
    setStaffStatuses((prev) => {
      const next = { ...prev };
      staffSelectedUserIds.forEach((id) => { next[id] = status; });
      return next;
    });
  };

  const clearAllSelectedStaff = () => {
    setStaffStatuses((prev) => {
      const next = { ...prev };
      staffSelectedUserIds.forEach((id) => { next[id] = ''; });
      return next;
    });
  };

  const saveBulkStaffAttendance = async () => {
    if (!isAdmin) return;
    const records = staffSelectedUserIds
      .filter((id) => ['present', 'absent', 'late', 'half_day'].includes(staffStatuses[id]))
      .map((id) => ({
        staff_user_id: id,
        status: staffStatuses[id],
        existingId: staffRecordIds[id],
      }));

    if (records.length === 0) {
      Alert.alert('No records', 'Please mark at least one selected staff record.');
      return;
    }

    setSaving(true);
    try {
      for (const rec of records) {
        if (rec.existingId) {
          await staffAttendanceApi.update(rec.existingId, { status: rec.status });
        } else {
          await staffAttendanceApi.create({
            staff_user_id: rec.staff_user_id,
            date: staffDateStr,
            status: rec.status,
            ...baseParams,
          });
        }
      }
      setStaffFlowStep('overview');
      await loadStaffAttendance();
    } catch (e: any) {
      Alert.alert('Error', buildErrorMessage(e, 'Failed to save staff attendance.'));
    } finally {
      setSaving(false);
    }
  };

  const renderStudentFlow = () => {
    if (studentsLoading) return <LoadingState />;

    if (studentFlowStep === 'select') {
      return (
        <View style={styles.flowWrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Criteria</Text>
            <View style={styles.rowGap8}>
              <View style={{ flex: 1 }}>
                <SimpleSelect
                  options={[{ label: 'Select Class', value: '' }, ...classOptions]}
                  value={classId}
                  onChange={(v) => setClassId(v === '' ? '' : Number(v))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SimpleSelect
                  options={[{ label: 'All Sections', value: '' }, ...sectionOptions]}
                  value={sectionId}
                  onChange={(v) => setSectionId(v === '' ? '' : Number(v))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SimpleSelect
                  options={[{ label: 'All Subjects', value: '' }, ...subjectOptions]}
                  value={subjectId}
                  onChange={(v) => setSubjectId(v === '' ? '' : Number(v))}
                />
              </View>
            </View>

            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateArrowBtn} onPress={() => shiftSelectedDate(-1)}>
                <Text style={styles.dateArrowText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.dateDisplay}>
                <Text style={styles.dateDisplayText}>{formatDateLong(selectedDateStr)}</Text>
              </View>
              <TouchableOpacity style={styles.dateArrowBtn} onPress={() => shiftSelectedDate(1)}>
                <Text style={styles.dateArrowText}>›</Text>
              </TouchableOpacity>
            </View>

            <FormField label="Search Students">
              <StyledInput
                value={studentSearch}
                onChangeText={setStudentSearch}
                placeholder="Name or Adm No..."
              />
            </FormField>

            <View style={styles.selectionHeader}>
              <Text style={styles.selectionHeaderText}>{selectedCount} Students Selected</Text>
              <TouchableOpacity onPress={() => setSelectedStudentIds([])}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {!classId ? (
              <EmptyState message="Select class and section to load students." />
            ) : filteredStudentRows.length === 0 ? (
              <EmptyState message="No students found for selected criteria." />
            ) : filteredStudentRows.map((row: any, idx: number) => {
              const sid = row.student_id;
              const selected = selectedStudentIds.includes(sid);
              const status = studentStatuses[sid] ?? '';
              return (
                <TouchableOpacity
                  key={row._row_key ?? `student-row-${sid ?? 'na'}-${idx}`}
                  style={styles.studentRow}
                  onPress={() => { if (sid) toggleStudentSelection(sid); }}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                    {selected ? <Text style={styles.checkboxTick}>✓</Text> : null}
                  </View>
                  <View style={styles.studentInfoWrap}>
                    <Text style={styles.studentName}>{row.student_name ?? 'Student'}</Text>
                    {row.admission_number ? <Text style={styles.studentAdm}>{row.admission_number}</Text> : null}
                  </View>
                  <Text style={[styles.statusTextPlain, { color: getStudentStatusColor(status) }]}>
                    {status ? status.charAt(0).toUpperCase() + status.slice(1) : '-'}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.primaryBtn, (selectedCount === 0 || !subjectId) && styles.primaryBtnDisabled]}
              disabled={selectedCount === 0 || !subjectId}
              onPress={() => {
                if (!classId) {
                  Alert.alert('Select class', 'Please select class and section first.');
                  return;
                }
                if (!subjectId) {
                  Alert.alert('Subject required', 'Please select subject to enable attendance marking.');
                  return;
                }
                setStudentFlowStep('mark');
              }}
            >
              <Text style={styles.primaryBtnText}>{subjectId ? 'Next: Mark Attendance' : 'Select Subject to Continue'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (!classId) {
      return (
        <View style={styles.flowWrap}>
          <View style={styles.card}>
            <EmptyState message="Select class in the first step to continue." />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStudentFlowStep('select')}>
              <Text style={styles.primaryBtnText}>Back to Select Criteria</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (loading) return <LoadingState />;

    if (studentFlowStep === 'mark') {
      return (
        <View style={styles.flowWrap}>
          <View style={styles.card}>
            <View style={styles.summaryTopRow}>
              <View>
                <Text style={styles.slimLabel}>Date</Text>
                <Text style={styles.boldValue}>{formatDateLong(selectedDateStr)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.slimLabel}>Students Selected</Text>
                <Text style={styles.bigCount}>{selectedCount}</Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>Mark Attendance For All</Text>
            <View style={styles.bulkBtnsRow}>
              {[
                { key: 'present', label: 'P', caption: 'Present', color: COLORS.success },
                { key: 'absent', label: 'A', caption: 'Absent', color: COLORS.danger },
                { key: 'late', label: 'L', caption: 'Late', color: COLORS.warning },
                { key: '', label: '-', caption: 'Off', color: COLORS.gray[400] },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.caption}
                  style={[styles.bulkBtn, { borderColor: opt.color + '66' }]}
                  onPress={() => markAllSelected(opt.key)}
                >
                  <Text style={[styles.bulkBtnCode, { color: opt.color }]}>{opt.label}</Text>
                  <Text style={styles.bulkBtnCaption}>{opt.caption}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.cardTitle, { marginTop: 8 }]}>Or Mark Individually</Text>
            <FormField label="Search student">
              <StyledInput value={studentSearch} onChangeText={setStudentSearch} placeholder="Search student" />
            </FormField>

            {filteredStudentRows.filter((s: any) => selectedStudentIds.includes(s.student_id)).map((row: any, idx: number) => {
              const sid = row.student_id;
              const status = studentStatuses[sid] ?? '';
              return (
                <View key={row._row_key ?? `mark-row-${sid ?? 'na'}-${idx}`} style={styles.studentRow}>
                  <View style={[styles.checkbox, styles.checkboxChecked]}><Text style={styles.checkboxTick}>✓</Text></View>
                  <View style={styles.studentInfoWrap}>
                    <Text style={styles.studentName}>{row.student_name ?? 'Student'}</Text>
                    {row.admission_number ? <Text style={styles.studentAdm}>{row.admission_number}</Text> : null}
                  </View>
                  <View style={styles.individualStatusRow}>
                    {['present', 'absent', 'late', ''].map((s) => (
                      <TouchableOpacity
                        key={`${sid}-${s || 'off'}`}
                        onPress={() => setStudentStatuses((prev) => ({ ...prev, [sid]: s }))}
                        style={[
                          styles.tinyStatusBtn,
                          status === s && {
                            borderColor: getStudentStatusColor(s),
                            backgroundColor: getStudentStatusColor(s) + '22',
                          },
                        ]}
                      >
                        <Text style={[styles.tinyStatusText, status === s && { color: getStudentStatusColor(s) }]}>
                          {getStudentStatusLabel(s)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}

            <TouchableOpacity onPress={clearAllSelected}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]} disabled={saving} onPress={saveBulkAttendance}>
              <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save Attendance'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.flowWrap}>
        <View style={styles.card}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.slimLabel}>Date</Text>
              <Text style={styles.boldValue}>{formatDateLong(selectedDateStr)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.slimLabel}>Class</Text>
              <Text style={styles.boldValue}>{classOptions.find((c) => c.value === classId)?.label ?? 'Class'} · {sectionOptions.find((s) => s.value === sectionId)?.label ?? 'All Sections'}</Text>
            </View>
          </View>

          <View style={styles.overviewCardsRow}>
            <View style={styles.overviewCard}><Text style={styles.overviewNum}>{overviewCounts.total}</Text><Text style={styles.overviewLabel}>Total</Text></View>
            <View style={styles.overviewCard}><Text style={[styles.overviewNum, { color: COLORS.success }]}>{overviewCounts.present}</Text><Text style={styles.overviewLabel}>Present</Text></View>
            <View style={styles.overviewCard}><Text style={[styles.overviewNum, { color: COLORS.danger }]}>{overviewCounts.absent}</Text><Text style={styles.overviewLabel}>Absent</Text></View>
            <View style={styles.overviewCard}><Text style={[styles.overviewNum, { color: COLORS.warning }]}>{overviewCounts.late}</Text><Text style={styles.overviewLabel}>Late</Text></View>
            <View style={styles.overviewCard}><Text style={[styles.overviewNum, { color: COLORS.gray[500] }]}>{overviewCounts.off}</Text><Text style={styles.overviewLabel}>Off</Text></View>
          </View>

          <FormField label="Search student">
            <StyledInput value={studentSearch} onChangeText={setStudentSearch} placeholder="Search student" />
          </FormField>

          {filteredStudentRows.filter((s: any) => selectedStudentIds.includes(s.student_id)).map((row: any, idx: number) => {
            const sid = row.student_id;
            const status = studentStatuses[sid] ?? '';
            return (
              <ListRow
                key={row._row_key ?? `overview-row-${sid ?? 'na'}-${idx}`}
                title={`${idx + 1}. ${row.student_name ?? 'Student'}`}
                subtitle={row.admission_number}
                rightComponent={<StatusBadge status={status || 'off'} />}
              />
            );
          })}

          <View style={styles.overviewActionsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStudentFlowStep('mark')}>
              <Text style={styles.secondaryBtnText}>Edit Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => Alert.alert('Export / Share', 'Export/Share can be connected to PDF or CSV in the next step.') }>
              <Text style={styles.primaryBtnText}>Export / Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderStaffFlow = () => {
    if (loading) return <LoadingState />;

    if (staffFlowStep === 'select') {
      return (
        <View style={styles.flowWrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Staff Criteria</Text>
            <View style={styles.rowGap8}>
              <View style={{ flex: 1 }}>
                <SimpleSelect
                  options={staffDepartmentOptions}
                  value={staffDepartment}
                  onChange={(v) => setStaffDepartment(String(v))}
                />
              </View>
            </View>

            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateArrowBtn} onPress={() => {
                const d = new Date(`${staffDateStr}T00:00:00`);
                d.setDate(d.getDate() - 1);
                setStaffDateStr(toLocalDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()));
              }}>
                <Text style={styles.dateArrowText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.dateDisplay}><Text style={styles.dateDisplayText}>{formatDateLong(staffDateStr)}</Text></View>
              <TouchableOpacity style={styles.dateArrowBtn} onPress={() => {
                const d = new Date(`${staffDateStr}T00:00:00`);
                d.setDate(d.getDate() + 1);
                setStaffDateStr(toLocalDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()));
              }}>
                <Text style={styles.dateArrowText}>›</Text>
              </TouchableOpacity>
            </View>

            <FormField label="Search Staff">
              <StyledInput value={staffSearch} onChangeText={setStaffSearch} placeholder="Name or employee code..." />
            </FormField>

            <View style={styles.selectionHeader}>
              <Text style={styles.selectionHeaderText}>{staffSelectedCount} Staff Selected</Text>
              <TouchableOpacity onPress={() => setStaffSelectedUserIds([])}><Text style={styles.clearAllText}>Clear All</Text></TouchableOpacity>
            </View>

            {filteredStaffRows.length === 0 ? <EmptyState message="No staff records found." /> : filteredStaffRows.map((row: any, idx: number) => {
              const uid = row.user_id;
              const selected = staffSelectedUserIds.includes(uid);
              const status = staffStatuses[uid] ?? '';
              return (
                <TouchableOpacity key={`staff-row-${uid}-${idx}`} style={styles.studentRow} onPress={() => toggleStaffSelection(uid)}>
                  <View style={[styles.checkbox, selected && styles.checkboxChecked]}>{selected ? <Text style={styles.checkboxTick}>✓</Text> : null}</View>
                  <View style={styles.studentInfoWrap}>
                    <Text style={styles.studentName}>{row.full_name ?? 'Staff'}</Text>
                    <Text style={styles.studentAdm}>{row.employee_code || row.department}</Text>
                  </View>
                  <Text style={[styles.statusTextPlain, { color: getStudentStatusColor(status) }]}>{status ? status.charAt(0).toUpperCase() + status.slice(1) : '-'}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={[styles.primaryBtn, staffSelectedCount === 0 && styles.primaryBtnDisabled]} disabled={staffSelectedCount === 0} onPress={() => setStaffFlowStep('mark')}>
              <Text style={styles.primaryBtnText}>Next: Mark Attendance</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (staffFlowStep === 'mark') {
      return (
        <View style={styles.flowWrap}>
          <View style={styles.card}>
            <View style={styles.summaryTopRow}>
              <View>
                <Text style={styles.slimLabel}>Date</Text>
                <Text style={styles.boldValue}>{formatDateLong(staffDateStr)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.slimLabel}>Staff Selected</Text>
                <Text style={styles.bigCount}>{staffSelectedCount}</Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>Mark Attendance For All</Text>
            <View style={styles.bulkBtnsRow}>
              {[
                { key: 'present', label: 'P', caption: 'Present', color: COLORS.success },
                { key: 'absent', label: 'A', caption: 'Absent', color: COLORS.danger },
                { key: 'late', label: 'L', caption: 'Late', color: COLORS.warning },
                { key: '', label: '-', caption: 'Off', color: COLORS.gray[400] },
              ].map((opt) => (
                <TouchableOpacity key={opt.caption} style={[styles.bulkBtn, { borderColor: opt.color + '66' }]} onPress={() => markAllSelectedStaff(opt.key)}>
                  <Text style={[styles.bulkBtnCode, { color: opt.color }]}>{opt.label}</Text>
                  <Text style={styles.bulkBtnCaption}>{opt.caption}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.cardTitle, { marginTop: 8 }]}>Or Mark Individually</Text>
            <FormField label="Search staff">
              <StyledInput value={staffSearch} onChangeText={setStaffSearch} placeholder="Search staff" />
            </FormField>

            {filteredStaffRows.filter((s: any) => staffSelectedUserIds.includes(s.user_id)).map((row: any, idx: number) => {
              const uid = row.user_id;
              const status = staffStatuses[uid] ?? '';
              return (
                <View key={`staff-mark-${uid}-${idx}`} style={styles.studentRow}>
                  <View style={[styles.checkbox, styles.checkboxChecked]}><Text style={styles.checkboxTick}>✓</Text></View>
                  <View style={styles.studentInfoWrap}>
                    <Text style={styles.studentName}>{row.full_name ?? 'Staff'}</Text>
                    <Text style={styles.studentAdm}>{row.employee_code || row.department}</Text>
                  </View>
                  <View style={styles.individualStatusRow}>
                    {['present', 'absent', 'late', ''].map((s) => (
                      <TouchableOpacity key={`staff-${uid}-${s || 'off'}`} onPress={() => setStaffStatuses((prev) => ({ ...prev, [uid]: s }))} style={[
                        styles.tinyStatusBtn,
                        status === s && { borderColor: getStudentStatusColor(s), backgroundColor: getStudentStatusColor(s) + '22' },
                      ]}>
                        <Text style={[styles.tinyStatusText, status === s && { color: getStudentStatusColor(s) }]}>{getStudentStatusLabel(s)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}

            <TouchableOpacity onPress={clearAllSelectedStaff}><Text style={styles.clearAllText}>Clear All</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]} disabled={saving} onPress={saveBulkStaffAttendance}>
              <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save Attendance'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.flowWrap}>
        <View style={styles.card}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.slimLabel}>Date</Text>
              <Text style={styles.boldValue}>{formatDateLong(staffDateStr)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.slimLabel}>Department</Text>
              <Text style={styles.boldValue}>{staffDepartment === 'all' ? 'All' : staffDepartment}</Text>
            </View>
          </View>

          <View style={styles.overviewCardsRow}>
            <View style={styles.overviewCard}><Text style={styles.overviewNum}>{staffOverviewCounts.total}</Text><Text style={styles.overviewLabel}>Total</Text></View>
            <View style={styles.overviewCard}><Text style={[styles.overviewNum, { color: COLORS.success }]}>{staffOverviewCounts.present}</Text><Text style={styles.overviewLabel}>Present</Text></View>
            <View style={styles.overviewCard}><Text style={[styles.overviewNum, { color: COLORS.danger }]}>{staffOverviewCounts.absent}</Text><Text style={styles.overviewLabel}>Absent</Text></View>
            <View style={styles.overviewCard}><Text style={[styles.overviewNum, { color: COLORS.warning }]}>{staffOverviewCounts.late}</Text><Text style={styles.overviewLabel}>Late</Text></View>
            <View style={styles.overviewCard}><Text style={[styles.overviewNum, { color: COLORS.gray[500] }]}>{staffOverviewCounts.off}</Text><Text style={styles.overviewLabel}>Off</Text></View>
          </View>

          <FormField label="Search staff"><StyledInput value={staffSearch} onChangeText={setStaffSearch} placeholder="Search staff" /></FormField>

          {filteredStaffRows.filter((s: any) => staffSelectedUserIds.includes(s.user_id)).map((row: any, idx: number) => {
            const uid = row.user_id;
            const status = staffStatuses[uid] ?? '';
            return (
              <ListRow key={`staff-overview-${uid}-${idx}`} title={`${idx + 1}. ${row.full_name ?? 'Staff'}`} subtitle={row.employee_code || row.department} rightComponent={<StatusBadge status={status || 'off'} />} />
            );
          })}

          <View style={styles.overviewActionsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStaffFlowStep('mark')}><Text style={styles.secondaryBtnText}>Edit Attendance</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => Alert.alert('Export / Share', 'Export/Share can be connected to PDF or CSV in the next step.')}><Text style={styles.primaryBtnText}>Export / Share</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <View style={styles.screenHeaderRow}>
        <TouchableOpacity style={styles.screenBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.screenBackIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Attendance</Text>
      </View>

      <View style={styles.tabsScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarWrap}>
          {baseTabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.topTab, active && styles.topTabActive]}
                onPress={() => {
                  setActiveTab(tab.key);
                  if (tab.key !== 'student') setStudentFlowStep('select');
                }}
              >
                <Text numberOfLines={1} style={[styles.topTabText, active && styles.topTabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Month/Year selector (my-attendance only) */}
      {activeTab === 'my' && (
        <View style={styles.periodRow}>
          <View style={{ flex: 1 }}>
            <SimpleSelect options={monthOptions} value={month} onChange={(v) => setMonth(Number(v))} />
          </View>
          <View style={{ flex: 1 }}>
            <SimpleSelect options={yearOptions} value={year} onChange={(v) => setYear(Number(v))} />
          </View>
        </View>
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing || pendingRefreshing} onRefresh={() => {
          if (activeTab === 'student') { setRefreshing(true); loadStudentAttendance(); }
          else if (activeTab === 'my') loadMyAttendance();
          else if (activeTab === 'staff') { setRefreshing(true); loadStaffAttendance(); }
          else if (activeTab === 'pending') { setPendingRefreshing(true); loadPendingApprovals(); }
        }} />}
      >
        <View style={styles.contentWrap}>
        {/* Legend */}
        {(activeTab === 'staff' || activeTab === 'student') && (
          <View style={styles.legendWrap}>
          <View style={styles.legend}>
            {([['P', COLORS.success, 'Present'], ['A', COLORS.danger, 'Absent'], ['L', COLORS.warning, 'Late']] as [string, string, string][]).map(([code, color, label]) => (
              <View key={code} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>
          </View>
        )}

        {activeTab === 'student' && renderStudentFlow()}

        {activeTab === 'my' && (
          myLoading ? <LoadingState /> : (
            <View style={styles.flowWrap}>
              <View style={styles.card}>
              {!isStudent && (
                <View style={styles.myMarkCard}>
                  <View style={styles.myMarkHeadRow}>
                    <Text style={styles.myMarkTitle}>Mark My Attendance</Text>
                    <Text style={styles.myMarkDate}>{todayStr}</Text>
                  </View>
                  {myTodayRecord ? (
                    <View style={styles.myMarkedBanner}>
                      <Text style={styles.myMarkedBannerText}>Already marked today · {String(myTodayRecord?.status ?? 'pending')}</Text>
                    </View>
                  ) : null}
                  <View style={styles.myHalfRow}>
                    <Text style={styles.myHalfLabel}>1st Half</Text>
                    <View style={styles.myHalfToggleRow}>
                      {(['present', 'absent'] as const).map((v) => (
                        <TouchableOpacity
                          key={`first-${v}`}
                          style={[
                            styles.myHalfPill,
                            myFirstHalf === v && (v === 'present' ? styles.myHalfPresent : styles.myHalfAbsent),
                          ]}
                          onPress={() => setMyFirstHalf(v)}
                        >
                          <Text style={[styles.myHalfPillText, myFirstHalf === v && styles.myHalfPillTextActive]}>
                            {v === 'present' ? 'Present' : 'Absent'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.myHalfRow}>
                    <Text style={styles.myHalfLabel}>2nd Half</Text>
                    <View style={styles.myHalfToggleRow}>
                      {(['present', 'absent'] as const).map((v) => (
                        <TouchableOpacity
                          key={`second-${v}`}
                          style={[
                            styles.myHalfPill,
                            mySecondHalf === v && (v === 'present' ? styles.myHalfPresent : styles.myHalfAbsent),
                          ]}
                          onPress={() => setMySecondHalf(v)}
                        >
                          <Text style={[styles.myHalfPillText, mySecondHalf === v && styles.myHalfPillTextActive]}>
                            {v === 'present' ? 'Present' : 'Absent'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, mySaveLoading && styles.primaryBtnDisabled]}
                    onPress={saveMyAttendance}
                    disabled={mySaveLoading}
                  >
                    <Text style={styles.primaryBtnText}>{mySaveLoading ? 'Saving...' : myTodayRecord ? 'Update My Attendance' : 'Save My Attendance'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.summaryRow}>
                {(
                  [
                    [mySummary.present, 'Present', COLORS.success],
                    [mySummary.absent, 'Absent', COLORS.danger],
                    [mySummary.late, 'Late/Half', COLORS.warning],
                    [mySummary.total, 'Total', COLORS.primary],
                  ] as [number, string, string][]
                ).map(([count, label, color]) => (
                  <View key={label} style={[styles.summaryCard, { borderTopColor: color }]}>
                    <Text style={styles.summaryCount}>{count}</Text>
                    <Text style={styles.summaryLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.calendarLegend}>
                {([
                  ['P', 'Present', COLORS.success],
                  ['A', 'Absent', COLORS.danger],
                  ['L', 'Late', COLORS.warning],
                  ['H', 'Holiday', COLORS.gray[500]],
                ] as [string, string, string][]).map(([code, label, color]) => (
                  <View key={code} style={styles.calendarLegendItem}>
                    <View style={[styles.calendarLegendDot, { backgroundColor: color }]} />
                    <Text style={styles.calendarLegendText}>{code} · {label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.calendarWrap}>
                <View style={styles.calendarWeekHeaderRow}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <Text key={d} style={styles.calendarWeekHeaderText}>{d}</Text>
                  ))}
                </View>

                {getMonthMatrix(year, month).map((week, wIdx) => (
                  <View key={`week-${wIdx}`} style={styles.calendarWeekRow}>
                    {week.map((day, dIdx) => {
                      if (!day) return <View key={`empty-${wIdx}-${dIdx}`} style={styles.calendarCellEmpty} />;

                      const ds = toLocalDateStr(year, month + 1, day);
                      const status = myStatusByDate[ds] ?? '';
                      const code = getCalendarStatusCode(status);
                      const color = getCalendarStatusColor(status);
                      const isFuture = ds > todayStr;
                      const isToday = ds === todayStr;

                      return (
                        <TouchableOpacity
                          key={ds}
                          style={[
                            styles.calendarCell,
                            isFuture && styles.calendarCellFuture,
                            isToday && styles.calendarCellToday,
                          ]}
                          disabled={isFuture}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.calendarDayText, isFuture && styles.calendarDayTextFuture]}>{day}</Text>
                          {code ? (
                            <View style={[styles.calendarCodeBadge, { backgroundColor: color + '22', borderColor: color + '66' }]}>
                              <Text style={[styles.calendarCodeText, { color }]}>{code}</Text>
                            </View>
                          ) : (
                            <View style={styles.calendarCodePlaceholder} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
              </View>
            </View>
          )
        )}

        {activeTab === 'staff' && isAdmin && renderStaffFlow()}

        {activeTab === 'pending' && isAdmin && (
          pendingLoading ? <LoadingState /> : pendingApprovals.length === 0 ? (
            <EmptyState message="No pending approvals." />
          ) : (
            <View style={styles.flowWrap}>
              <View style={styles.card}>
              {pendingApprovals.map((rec: any) => (
                <View key={rec.id} style={styles.approvalCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.approvalName}>{rec.staff_name ?? `Staff #${rec.staff_user_id ?? rec.staff_id}`}</Text>
                    <Text style={styles.approvalSub}>{rec.date?.slice(0, 10)}  Â·  {rec.status ?? 'pending'}</Text>
                    {rec.check_in_time ? <Text style={styles.approvalSub}>In: {rec.check_in_time}  Out: {rec.check_out_time ?? '-'}</Text> : null}
                  </View>
                  <View style={styles.approvalActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={() => approveRecord(rec.id, 'approved')}>
                      <Text style={styles.actionBtnText}>âœ“</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.danger }]} onPress={() => approveRecord(rec.id, 'rejected')}>
                      <Text style={styles.actionBtnText}>âœ•</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              </View>
            </View>
          )
        )}

        {activeTab === 'settings' && (
          <View style={styles.flowWrap}>
            <View style={styles.card}>
            <SectionHeader title="Attendance Settings" />
            <FormField label="Working Days per Week">
              <StyledInput
                value={String(settings.working_days_per_week ?? '')}
                onChangeText={(v) => setSettings((s: any) => ({ ...s, working_days_per_week: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="Grace Period (minutes)">
              <StyledInput
                value={String(settings.grace_period_minutes ?? '')}
                onChangeText={(v) => setSettings((s: any) => ({ ...s, grace_period_minutes: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <TouchableOpacity
              style={styles.saveSettingsBtn}
              onPress={async () => {
                try {
                  await attendanceSettingsApi.update({ ...settings, ...baseParams });
                  Alert.alert('Success', 'Settings saved.');
                } catch {
                  Alert.alert('Error', 'Failed to save settings.');
                }
              }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '700' }}>Save Settings</Text>
            </TouchableOpacity>
            </View>
          </View>
        )}
        </View>
        <View style={{ height: 14 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 2,
    paddingBottom: 4,
    backgroundColor: COLORS.gray[50],
  },
  screenBackBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenBackIcon: {
    fontSize: 22,
    lineHeight: 22,
    color: COLORS.gray[700],
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 20,
    color: COLORS.gray[800],
    fontWeight: '800',
  },
  tabsScroll: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  tabBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },
  contentWrap: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  topTab: {
    minWidth: 88,
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTabActive: {
    backgroundColor: BRAND.primary,
  },
  topTabText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  topTabTextActive: {
    color: COLORS.white,
  },
  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingVertical: 5 },
  flowWrap: { paddingHorizontal: 6, paddingTop: 3, paddingBottom: 5 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 7,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginBottom: 5,
  },
  rowGap8: { flexDirection: 'row', gap: 6, marginBottom: 7 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 7,
  },
  dateArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: BRAND.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowText: { fontSize: 18, color: BRAND.primary, fontWeight: '700' },
  dateDisplay: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  dateDisplayText: { color: COLORS.gray[800], fontWeight: '600', fontSize: 12 },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    backgroundColor: BRAND.tint,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  selectionHeaderText: { color: BRAND.primary, fontWeight: '700', fontSize: 13 },
  clearAllText: { color: COLORS.danger, fontWeight: '600', fontSize: 12 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.gray[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  checkboxTick: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  studentInfoWrap: { flex: 1 },
  studentName: { fontSize: 12.5, color: COLORS.gray[800], fontWeight: '600' },
  studentAdm: { fontSize: 11, color: COLORS.gray[500], marginTop: 2 },
  statusTextPlain: { fontSize: 12, fontWeight: '700' },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: BRAND.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 10,
    padding: 7,
    marginBottom: 7,
  },
  slimLabel: { fontSize: 11, color: COLORS.gray[500], marginBottom: 2 },
  boldValue: { fontSize: 13, color: COLORS.gray[800], fontWeight: '700' },
  bigCount: { fontSize: 22, color: BRAND.primary, fontWeight: '800' },
  bulkBtnsRow: { flexDirection: 'row', gap: 6, marginBottom: 1 },
  bulkBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 9,
    minHeight: 60,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkBtnCode: { fontSize: 19, fontWeight: '800', lineHeight: 20 },
  bulkBtnCaption: { fontSize: 10, color: COLORS.gray[500], marginTop: 2, textAlign: 'center' },
  individualStatusRow: { flexDirection: 'row', gap: 4 },
  tinyStatusBtn: {
    width: 28,
    height: 24,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tinyStatusText: { fontSize: 11, fontWeight: '700', color: COLORS.gray[600] },
  overviewCardsRow: { flexDirection: 'row', gap: 6, marginBottom: 7 },
  overviewCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 9,
    paddingVertical: 5,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  overviewNum: { fontSize: 17, fontWeight: '800', color: BRAND.primary },
  overviewLabel: { fontSize: 10, color: COLORS.gray[500], marginTop: 2 },
  overviewActionsRow: { flexDirection: 'row', gap: 8, marginTop: 7 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND.primary,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  secondaryBtnText: { color: BRAND.primary, fontWeight: '700' },
  legendWrap: {
    paddingHorizontal: 6,
    paddingBottom: 0,
  },
  legend: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: COLORS.white,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.gray[600] },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  summaryBarText: { fontSize: 12, fontWeight: '600', color: COLORS.gray[700] },
  gridRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  nameCell: { width: 130, paddingHorizontal: 8, paddingVertical: 8 },
  nameText: { fontSize: 12, color: COLORS.gray[800], fontWeight: '500' },
  subText: { fontSize: 10, color: COLORS.gray[500], marginTop: 1 },
  headerText: { fontSize: 11, fontWeight: '700', color: COLORS.gray[600], textAlign: 'center' },
  dayCell: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    margin: 2,
    backgroundColor: COLORS.gray[100],
  },
  todayHeaderCell: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  statsCell: { width: 60, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  statsText: { fontSize: 10, color: COLORS.gray[600] },
  cellText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  saveSettingsBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    elevation: 1,
  },
  summaryCount: { fontSize: 22, fontWeight: '800', color: COLORS.gray[800] },
  summaryLabel: { fontSize: 11, color: COLORS.gray[500], marginTop: 2 },
  myMarkCard: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    backgroundColor: COLORS.white,
  },
  myMarkHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  myMarkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  myMarkDate: {
    fontSize: 11,
    color: COLORS.gray[600],
    fontWeight: '600',
  },
  myHalfRow: {
    marginBottom: 6,
  },
  myHalfLabel: {
    fontSize: 11,
    color: COLORS.gray[600],
    marginBottom: 4,
    fontWeight: '600',
  },
  myHalfToggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  myHalfPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  myHalfPresent: {
    backgroundColor: COLORS.success + '18',
    borderColor: COLORS.success + '66',
  },
  myHalfAbsent: {
    backgroundColor: COLORS.danger + '18',
    borderColor: COLORS.danger + '66',
  },
  myHalfPillText: {
    fontSize: 12,
    color: COLORS.gray[700],
    fontWeight: '600',
  },
  myHalfPillTextActive: {
    color: COLORS.gray[900],
    fontWeight: '700',
  },
  myMarkedBanner: {
    backgroundColor: BRAND.tint,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BRAND.primary + '33',
  },
  myMarkedBannerText: {
    color: BRAND.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  calendarLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calendarLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calendarLegendText: {
    fontSize: 11,
    color: COLORS.gray[600],
  },
  calendarWrap: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 10,
    padding: 6,
    backgroundColor: COLORS.white,
  },
  calendarWeekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarWeekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    color: COLORS.gray[500],
    fontWeight: '700',
  },
  calendarWeekRow: {
    flexDirection: 'row',
  },
  calendarCell: {
    flex: 1,
    minHeight: 48,
    margin: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    backgroundColor: COLORS.white,
  },
  calendarCellEmpty: {
    flex: 1,
    minHeight: 48,
    margin: 2,
  },
  calendarCellFuture: {
    backgroundColor: COLORS.gray[100],
    borderColor: COLORS.gray[100],
  },
  calendarCellToday: {
    borderColor: BRAND.primary,
    borderWidth: 1.5,
    backgroundColor: BRAND.tint,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  calendarDayTextFuture: {
    color: COLORS.gray[400],
  },
  calendarCodeBadge: {
    minWidth: 22,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCodeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  calendarCodePlaceholder: {
    height: 16,
  },
  approvalCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    marginBottom: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  approvalName: { fontSize: 14, fontWeight: '600', color: COLORS.gray[800] },
  approvalSub: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
  approvalActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
