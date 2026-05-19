import { useAuth } from '../../core/hooks/useAuth';
import { useUserStore } from '../../core/store/user.store';

// role_id mapping mirrors the web app
// role_id 1 = super_admin, role_id 2 = admin, others = staff/teacher

export function useErpRole() {
  const auth = useAuth();
  const user = auth?.user;
  // Use centrally stored school_id from the user store first
  const storeSchoolId = useUserStore((s) => s.schoolId);

  const toNum = (v: any): number | undefined => {
    if (v === null || v === undefined || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const roleId: number | undefined = user?.role_id;
  const role: string | undefined = user?.role;

  const isSuperAdmin =
    roleId === 1 || role === 'super_admin';

  const isAdmin =
    roleId === 1 ||
    roleId === 2 ||
    role === 'super_admin' ||
    role === 'admin';

  const isTeacher =
    role === 'instructor' || role === 'teacher';

  const isStudent = role === 'student';

  // School ID: store value takes priority (set once during auth init),
  // with full multi-field fallback from user profile for edge cases
  const schoolId: number | undefined =
    (storeSchoolId !== null && storeSchoolId !== undefined ? storeSchoolId : undefined) ??
    toNum(user?.school_id) ??
    toNum(user?.schoolId) ??
    toNum(user?.school?.id) ??
    toNum(user?.school?.school_id) ??
    toNum(user?.profile?.school?.id) ??
    toNum(user?.profile?.school_id) ??
    toNum(user?.profile?.schoolId) ??
    toNum(user?.organization_id) ??
    toNum(user?.org_id) ??
    toNum(user?.tenant_school_id) ??
    undefined;

  return { user, roleId, role, isSuperAdmin, isAdmin, isTeacher, isStudent, schoolId };
}
