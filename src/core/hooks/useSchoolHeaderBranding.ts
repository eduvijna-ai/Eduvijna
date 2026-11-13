/**
 * Authenticated Home header school name + logo branding.
 * Tied to the signed-in account; clears immediately on logout / account change.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { get, API_BASE_URL } from '../api/config';
import { getAuthSessionEpoch } from '../api/apiRefreshCoordinator';
import { resolveLogoUrl, withLogoCacheBust } from '../utils/resolveLogoUrl';
import {
  EMPTY_SCHOOL_BRANDING,
  applyMySchoolToBrandingState,
  clearSchoolBrandingForAccountChange,
  parseMySchoolResponse,
  shouldAcceptSchoolBrandingResponse,
  type SchoolBrandingState,
} from '../utils/schoolBranding';
import type { UserProfile } from '../types';

function isSuperAdminUser(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const anyUser = user as unknown as {
    role_id?: number;
    role_name?: string;
    role?: string;
  };
  return (
    anyUser.role_id === 1 ||
    anyUser.role_name === 'super_admin' ||
    anyUser.role === 'super_admin'
  );
}

function accountIdOf(user: UserProfile | null | undefined): string | null {
  if (!user?.id) return null;
  return String(user.id);
}

export type UseSchoolHeaderBrandingArgs = {
  user: UserProfile | null;
  /** When false (logged out), branding clears immediately. */
  isAuthenticated: boolean;
};

export type UseSchoolHeaderBrandingResult = {
  schoolName: string;
  /** Absolute logo URI with cache-bust, or null to show EduVijna fallback */
  logoUri: string | null;
  /** True while waiting for first branding for this account */
  loading: boolean;
  /** Bump revision / re-fetch (Home refresh, focus) */
  refresh: () => void;
  /** Mark remote image failed → fall back to EduVijna mark */
  onLogoError: () => void;
  logoFailed: boolean;
};

export function useSchoolHeaderBranding({
  user,
  isAuthenticated,
}: UseSchoolHeaderBrandingArgs): UseSchoolHeaderBrandingResult {
  const accountId = isAuthenticated ? accountIdOf(user) : null;
  const superAdmin = isSuperAdminUser(user);

  const [branding, setBranding] = useState<SchoolBrandingState>(EMPTY_SCHOOL_BRANDING);
  const [logoFailed, setLogoFailed] = useState(false);
  const requestSeq = useRef(0);

  // Immediate clear on logout / account switch — do not wait for in-flight responses.
  useEffect(() => {
    setLogoFailed(false);
    setBranding((prev) => clearSchoolBrandingForAccountChange(prev, accountId));
  }, [accountId]);

  const fetchBranding = useCallback(async () => {
    if (!accountId || superAdmin) {
      setBranding((prev) => ({
        ...EMPTY_SCHOOL_BRANDING,
        accountId,
        revision: prev.revision + 1,
        loading: false,
      }));
      setLogoFailed(false);
      return;
    }

    const seq = ++requestSeq.current;
    const requestAccountId = accountId;
    const requestEpoch = getAuthSessionEpoch();

    setBranding((prev) => ({
      ...prev,
      accountId: requestAccountId,
      loading: true,
    }));

    try {
      const resp = await get<unknown>('/api/v1/school-management/my-school');
      if (seq !== requestSeq.current) return;
      if (
        !shouldAcceptSchoolBrandingResponse({
          requestAccountId,
          currentAccountId: accountId,
          requestEpoch,
          currentEpoch: getAuthSessionEpoch(),
        })
      ) {
        return;
      }
      const record = parseMySchoolResponse(resp);
      setLogoFailed(false);
      setBranding((prev) => applyMySchoolToBrandingState(prev, record, requestAccountId));
    } catch {
      if (seq !== requestSeq.current) return;
      if (
        !shouldAcceptSchoolBrandingResponse({
          requestAccountId,
          currentAccountId: accountId,
          requestEpoch,
          currentEpoch: getAuthSessionEpoch(),
        })
      ) {
        return;
      }
      // Keep prior name if any; clear logo on hard failure so fallback shows.
      setBranding((prev) => ({
        ...prev,
        accountId: requestAccountId,
        logoUrlRaw: null,
        loading: false,
        revision: prev.revision + 1,
      }));
      setLogoFailed(false);
    }
  }, [accountId, superAdmin]);

  useEffect(() => {
    void fetchBranding();
  }, [fetchBranding]);

  // Revalidate when Home/header gains focus (same URL replacement on web).
  useFocusEffect(
    useCallback(() => {
      if (!accountId || superAdmin) return;
      void fetchBranding();
    }, [accountId, superAdmin, fetchBranding]),
  );

  // Also revalidate when returning to foreground.
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active' && accountId && !superAdmin) {
        void fetchBranding();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [accountId, superAdmin, fetchBranding]);

  const schoolNameFromProfile = useMemo(() => {
    type SchoolObj = { name?: string; school_name?: string };
    const profileUser = user as
      | (UserProfile & {
          schoolName?: string;
          profile?: {
            school_name?: string;
            schoolName?: string;
            school?: string | SchoolObj;
          };
        })
      | null
      | undefined;
    if (!profileUser) return '';
    const schoolField = profileUser.school as string | SchoolObj | null | undefined;
    const schoolObj =
      schoolField && typeof schoolField === 'object' ? (schoolField as SchoolObj) : undefined;
    const profileSchoolField = profileUser.profile?.school;
    const profileSchoolObj =
      profileSchoolField && typeof profileSchoolField === 'object'
        ? (profileSchoolField as SchoolObj)
        : undefined;
    const candidates: Array<string | undefined> = [
      branding.schoolName,
      profileUser.school_name ?? undefined,
      profileUser.schoolName,
      typeof schoolField === 'string' ? schoolField : undefined,
      schoolObj?.name,
      schoolObj?.school_name,
      profileUser.profile?.school_name,
      profileUser.profile?.schoolName,
      profileSchoolObj?.name,
      profileSchoolObj?.school_name,
    ];
    return (
      candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ||
      ''
    );
  }, [user, branding.schoolName]);

  const logoUri = useMemo(() => {
    if (superAdmin || !accountId) return null;
    if (logoFailed) return null;
    if (branding.accountId !== accountId) return null;
    const raw =
      branding.logoUrlRaw ??
      (typeof (user as { logo_url?: string } | null)?.logo_url === 'string'
        ? (user as { logo_url?: string }).logo_url
        : null) ??
      (typeof (user as { school_logo_url?: string } | null)?.school_logo_url === 'string'
        ? (user as { school_logo_url?: string }).school_logo_url
        : null);
    const absolute = resolveLogoUrl(raw, API_BASE_URL);
    if (!absolute) return null;
    return withLogoCacheBust(absolute, branding.revision);
  }, [superAdmin, accountId, logoFailed, branding, user]);

  const onLogoError = useCallback(() => {
    setLogoFailed(true);
  }, []);

  const refresh = useCallback(() => {
    void fetchBranding();
  }, [fetchBranding]);

  return {
    schoolName: schoolNameFromProfile,
    logoUri,
    loading: branding.loading && branding.accountId === accountId,
    refresh,
    onLogoError,
    logoFailed,
  };
}
