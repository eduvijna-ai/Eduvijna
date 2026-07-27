/**
 * Schools session — single read of auth/user store for erp_schools.
 * Does not implement login; mirrors useTeacherSession with richer fields.
 */

import { useMemo } from 'react';
import { useUserStore } from '@core/store/user.store';
import type { ERPSchoolsPersona } from './useTeacherSession';
import { resolveDisplayName, resolveFirstName } from '../utils/displayName';

export interface SchoolsSession {
  isAuthenticated: boolean;
  persona: ERPSchoolsPersona;
  isTeacher: boolean;
  isStudent: boolean;
  isAdmin: boolean;
  schoolId: number | null;
  userId: number | null;
  roleId: number | null;
  role: string | undefined;
  displayName: string;
  firstName: string;
  email: string;
}

function toPersona(role?: string, roleId?: number | null): ERPSchoolsPersona {
  if (roleId === 1 || role === 'super_admin') return 'admin';
  if (roleId === 2 || role === 'admin') return 'admin';
  if (roleId === 8 || role === 'principal') return 'principal';
  if (role === 'instructor' || role === 'teacher') return 'teacher';
  if (roleId === 4 || role === 'student') return 'student';
  if (role === 'parent' || roleId === 16) return 'parent';
  return 'unknown';
}

export function useSchoolsSession(): SchoolsSession {
  const user = useUserStore((s) => s.user);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const schoolId = useUserStore((s) => s.schoolId);

  return useMemo<SchoolsSession>(() => {
    const role = user?.role;
    const roleId = user?.role_id != null ? Number(user.role_id) : null;
    const persona = toPersona(role, roleId);
    const fallback =
      persona === 'student' ? 'Student' : persona === 'admin' ? 'Admin' : 'Teacher';

    const userIdRaw = user?.id != null ? Number(user.id) : null;
    const userId = userIdRaw != null && Number.isFinite(userIdRaw) ? userIdRaw : null;

    return {
      isAuthenticated,
      persona,
      isTeacher: persona === 'teacher',
      isStudent: persona === 'student',
      isAdmin: persona === 'admin' || persona === 'principal',
      schoolId: schoolId ?? null,
      userId,
      roleId,
      role,
      displayName: resolveDisplayName(user, fallback),
      firstName: resolveFirstName(user, fallback),
      email: user?.email ?? '',
    };
  }, [user, isAuthenticated, schoolId]);
}
