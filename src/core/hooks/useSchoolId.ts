/**
 * useSchoolId — Central school_id accessor.
 *
 * Returns the resolved school_id for the currently logged-in user.
 * The value is set once (during login / checkAuth) and stored in the global
 * user store so every screen and API call can use the same value without
 * threading it through props.
 *
 * Usage:
 *   const schoolId = useSchoolId(); // number | null
 */

import { useUserStore } from '../store/user.store';

export function useSchoolId(): number | null {
  return useUserStore((s) => {
    // Primary: dedicated schoolId field (set during auth initialization)
    if (s.schoolId !== null && s.schoolId !== undefined) return s.schoolId;

    // Fallback: extract directly from user profile if store field not yet set
    const u = s.user as any;
    if (!u) return null;

    const toNum = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    return (
      toNum(u.school_id) ??
      toNum(u.schoolId) ??
      toNum(u.school?.id) ??
      toNum(u.school?.school_id) ??
      toNum(u.profile?.school?.id) ??
      toNum(u.profile?.school_id) ??
      toNum(u.profile?.schoolId) ??
      toNum(u.organization_id) ??
      toNum(u.org_id) ??
      null
    );
  });
}
