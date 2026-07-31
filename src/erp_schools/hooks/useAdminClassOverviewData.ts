/**
 * useAdminClassOverviewData — school-wide Class Overview (web ClassOverviewTab).
 * Admin: Classes + Students + Teachers + My Profile data.
 * No teacher_id scoping (unlike useTeacherData).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  classOverviewApi,
  staffProfilesApi,
  studentsByUserApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import {
  computeClassOverviewKpis,
  mapTeacherClasses,
  mapTeacherStudents,
} from '../mappers/teacher';
import type { ClassInfo, ClassOverviewKpis, StudentInfo } from '../types/domain';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  settledValue,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

/** Web StaffProfileResponse fields used by TeachersTab + TeacherDetailPanel. */
export interface AdminStaffMember {
  id: string;
  profileId: number | null;
  userId: number | null;
  name: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  designation: string;
  department: string;
  employmentType: string;
  status: string;
  isTeaching: boolean;
  isActive: boolean;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  dateOfJoining: string;
  qualification: string;
  experienceYears: number | null;
  address: string;
  apaarId: string;
  bankName: string;
  bankAccount: string;
  ifscCode: string;
  panNumber: string;
  basicSalary: number | null;
  avatarUrl?: string;
}

/** Web: designation === 'instructor' (role_id=3). */
function isTeachingStaff(s: Record<string, unknown>): boolean {
  return pickString(s.designation).trim().toLowerCase() === 'instructor';
}

function mapStaffDirectory(raw: unknown): AdminStaffMember[] {
  // Web TeachersTab does not filter by is_active — show full directory.
  return safeList<Record<string, unknown>>(raw).map((s, i) => {
    const firstName = pickString(s.first_name);
    const lastName = pickString(s.last_name);
    const fullFromParts = [firstName, lastName].filter(Boolean).join(' ');
    const name =
      fullFromParts ||
      pickString(s.full_name, s.name, s.staff_name, 'Staff');
    const teaching = isTeachingStaff(s);
    const statusRaw = pickString(s.status).toLowerCase();
    const isActive =
      s.is_active === false || statusRaw === 'inactive' || statusRaw === 'deactivated'
        ? false
        : true;
    return {
      id: pickString(s.id, s.user_id, `staff-${i}`),
      profileId: s.id != null ? pickNumber(s.id) : null,
      userId: s.user_id != null ? pickNumber(s.user_id) : null,
      name,
      firstName: firstName || name.split(' ')[0] || '',
      lastName,
      employeeId: pickString(s.employee_code, s.employee_id, '—') || '—',
      designation: pickString(s.designation, teaching ? 'instructor' : '—') || '—',
      department: pickString(s.department, s.department_name, '—') || '—',
      employmentType: pickString(s.employment_type, s.employment_status, '—') || '—',
      status: statusRaw || (isActive ? 'active' : 'inactive'),
      isTeaching: teaching,
      isActive,
      email: pickString(s.email, s.work_email),
      phone: pickString(s.phone, s.mobile),
      gender: pickString(s.gender),
      dateOfBirth: pickString(s.date_of_birth),
      dateOfJoining: pickString(s.date_of_joining, s.joining_date, s.joined_on),
      qualification: pickString(s.qualification),
      experienceYears:
        s.experience_years != null && s.experience_years !== ''
          ? pickNumber(s.experience_years)
          : null,
      address: pickString(s.address),
      apaarId: pickString(s.apaar_id),
      bankName: pickString(s.bank_name),
      bankAccount: pickString(s.bank_account),
      ifscCode: pickString(s.ifsc_code),
      panNumber: pickString(s.pan_number),
      basicSalary:
        s.basic_salary != null && s.basic_salary !== ''
          ? pickNumber(s.basic_salary)
          : null,
      avatarUrl: pickString(s.avatar_url, s.photo_url) || undefined,
    };
  });
}

export function useAdminClassOverviewData() {
  const session = useSchoolsSession();
  const { selectedYearId } = useAcademicYear();
  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [staff, setStaff] = useState<AdminStaffMember[]>([]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (USE_MOCK_DATA) {
        setStatus('ready');
        return;
      }
      const schoolId = session.schoolId;
      if (schoolId == null) {
        setStatus('error');
        setError('School not selected');
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setStatus('loading');
      setError(null);

      const params: Record<string, unknown> = {
        school_id: schoolId,
        per_page: 500,
      };
      if (selectedYearId != null) params.academic_year_id = selectedYearId;

      try {
        const results = await Promise.allSettled([
          classOverviewApi.getAll(params),
          classOverviewApi.getKPIs(params),
          studentsByUserApi.getAll(params),
          staffProfilesApi.list({
            school_id: schoolId,
            per_page: 200,
          }),
        ]);

        const overviewRaw = settledValue(results[0], null);
        const kpiRaw = settledValue(results[1], null);
        const rosterRaw = settledValue(results[2], null);
        const staffRaw = settledValue(results[3], null);

        const studentsMapped = mapTeacherStudents(rosterRaw);
        // School-wide: do NOT pass teacherUserId
        const mapped = mapTeacherClasses(overviewRaw ?? kpiRaw, {
          students: studentsMapped,
        });
        const fallback =
          mapped.classes.length === 0 && kpiRaw
            ? mapTeacherClasses(kpiRaw, { students: studentsMapped })
            : mapped;

        setClasses(fallback.classes);
        setStudents(studentsMapped);
        setStaff(mapStaffDirectory(staffRaw));
        setStatus('ready');
      } catch (e) {
        setError(extractErrorMessage(e));
        setStatus('error');
        setClasses([]);
        setStudents([]);
        setStaff([]);
      } finally {
        setRefreshing(false);
      }
    },
    [session.schoolId, selectedYearId],
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void loadRef.current(false);
  }, [session.schoolId, selectedYearId]);

  const refetch = useCallback(async () => {
    await loadRef.current(true);
  }, []);

  const getOverviewKpis = useCallback(
    (filters?: {
      className?: string;
      sectionName?: string;
      subjectName?: string;
    }): ClassOverviewKpis =>
      computeClassOverviewKpis(classes, students, filters ?? {}, false),
    [classes, students],
  );

  const getStudentById = useCallback(
    (studentId?: string): StudentInfo | undefined => {
      if (!students.length) return undefined;
      if (!studentId) return students[0];
      return (
        students.find((s) => s.id === studentId) ||
        students.find((s) => String(s.profileId) === studentId) ||
        students.find((s) => String(s.userId) === studentId) ||
        students[0]
      );
    },
    [students],
  );

  const getStaffById = useCallback(
    (staffId?: string): AdminStaffMember | undefined => {
      if (!staff.length) return undefined;
      if (!staffId) return staff[0];
      return (
        staff.find((s) => s.id === staffId) ||
        staff.find((s) => String(s.profileId) === staffId) ||
        staff.find((s) => String(s.userId) === staffId) ||
        staff[0]
      );
    },
    [staff],
  );

  const teachingStaff = useMemo(() => staff.filter((s) => s.isTeaching), [staff]);
  const nonTeachingStaff = useMemo(() => staff.filter((s) => !s.isTeaching), [staff]);

  return useMemo(
    () => ({
      classes,
      students,
      staff,
      teachingStaff,
      nonTeachingStaff,
      status,
      error,
      refreshing,
      refetch,
      getOverviewKpis,
      getStudentById,
      getStaffById,
      hasAcademicYear: selectedYearId != null,
    }),
    [
      classes,
      students,
      staff,
      teachingStaff,
      nonTeachingStaff,
      status,
      error,
      refreshing,
      refetch,
      getOverviewKpis,
      getStudentById,
      getStaffById,
      selectedYearId,
    ],
  );
}
