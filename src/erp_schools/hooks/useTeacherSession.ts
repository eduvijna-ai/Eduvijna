/**
 * useTeacherSession
 *
 * Read-only adapter over the app's EXISTING authentication/session. It does NOT
 * implement any login/token/refresh logic — it simply reads the already-resolved
 * user from the shared Zustand user store and derives the teacher persona using
 * the same role predicate the rest of the app uses
 * (`role === 'instructor' | 'teacher'`).
 *
 * Depends only on `@core` (never on `src/erp/`) to keep the module isolated.
 */

import { useMemo } from 'react';
import { useUserStore } from '@core/store/user.store';

export type ERPSchoolsPersona =
  | 'teacher'
  | 'student'
  | 'parent'
  | 'principal'
  | 'admin'
  | 'unknown';

export interface TeacherSession {
  isAuthenticated: boolean;
  persona: ERPSchoolsPersona;
  isTeacher: boolean;
  schoolId: number | null;
  /** Best-effort display name from the existing profile. */
  displayName: string;
  /** First name only, for greetings. */
  firstName: string;
}

function toPersona(role?: string, roleId?: number | null): ERPSchoolsPersona {
  if (roleId === 1 || role === 'super_admin') return 'admin';
  if (roleId === 2 || role === 'admin') return 'admin';
  if (role === 'instructor' || role === 'teacher') return 'teacher';
  if (roleId === 4 || role === 'student') return 'student';
  if (role === 'parent') return 'parent';
  if (role === 'principal') return 'principal';
  return 'unknown';
}

export function useTeacherSession(): TeacherSession {
  const user = useUserStore((s) => s.user);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const schoolId = useUserStore((s) => s.schoolId);

  return useMemo<TeacherSession>(() => {
    const role = user?.role;
    const roleId = user?.role_id != null ? Number(user.role_id) : null;
    const persona = toPersona(role, roleId);

    const displayName =
      user?.name?.trim() ||
      user?.full_name?.trim() ||
      user?.username?.trim() ||
      'Teacher';
    const firstName = displayName.split(' ')[0] ?? displayName;

    return {
      isAuthenticated,
      persona,
      isTeacher: persona === 'teacher',
      schoolId: schoolId ?? null,
      displayName,
      firstName,
    };
  }, [user, isAuthenticated, schoolId]);
}
