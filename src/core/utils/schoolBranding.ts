/**
 * School branding helpers for authenticated mobile header.
 * Pure functions so account-isolation and same-URL refresh are unit-testable.
 */

export type MySchoolRecord = {
  school_id?: number;
  school_name?: string;
  logo_url?: string | null;
};

export type SchoolBrandingState = {
  /** Authenticated account id this branding belongs to */
  accountId: string | null;
  schoolId: number | null;
  schoolName: string;
  /** Raw logo_url from API (may be relative /api/...) */
  logoUrlRaw: string | null;
  /** Monotonic revision bumped on each successful fetch / explicit refresh */
  revision: number;
  loading: boolean;
};

export const EMPTY_SCHOOL_BRANDING: SchoolBrandingState = {
  accountId: null,
  schoolId: null,
  schoolName: '',
  logoUrlRaw: null,
  revision: 0,
  loading: false,
};

export function parseMySchoolResponse(resp: unknown): MySchoolRecord {
  const body = (resp ?? {}) as Record<string, unknown>;
  const nested =
    body.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : null;

  const schoolName =
    (typeof body.school_name === 'string' && body.school_name) ||
    (typeof body.name === 'string' && body.name) ||
    (typeof nested?.school_name === 'string' && nested.school_name) ||
    (typeof nested?.name === 'string' && nested.name) ||
    '';

  const schoolIdRaw = body.school_id ?? nested?.school_id;
  const schoolId =
    typeof schoolIdRaw === 'number' && Number.isFinite(schoolIdRaw) && schoolIdRaw > 0
      ? schoolIdRaw
      : undefined;

  const logoRaw = body.logo_url ?? nested?.logo_url;
  const logo_url =
    typeof logoRaw === 'string' && logoRaw.trim().length > 0 ? logoRaw.trim() : null;

  return {
    ...(schoolId ? { school_id: schoolId } : {}),
    ...(schoolName ? { school_name: schoolName } : {}),
    logo_url,
  };
}

/**
 * Late my-school responses must match the account that requested them.
 * Returns false when the user logged out or switched accounts.
 */
export function shouldAcceptSchoolBrandingResponse(args: {
  requestAccountId: string | null;
  currentAccountId: string | null;
  requestEpoch?: number;
  currentEpoch?: number;
}): boolean {
  if (!args.currentAccountId) return false;
  if (!args.requestAccountId) return false;
  if (args.requestAccountId !== args.currentAccountId) return false;
  if (
    typeof args.requestEpoch === 'number' &&
    typeof args.currentEpoch === 'number' &&
    args.requestEpoch !== args.currentEpoch
  ) {
    return false;
  }
  return true;
}

export function applyMySchoolToBrandingState(
  prev: SchoolBrandingState,
  record: MySchoolRecord,
  accountId: string,
): SchoolBrandingState {
  return {
    accountId,
    schoolId: record.school_id ?? null,
    schoolName: record.school_name?.trim() || '',
    logoUrlRaw: record.logo_url ?? null,
    revision: prev.revision + 1,
    loading: false,
  };
}

/** Clear immediately on logout / account change so School A never paints beside School B. */
export function clearSchoolBrandingForAccountChange(
  prev: SchoolBrandingState,
  nextAccountId: string | null,
): SchoolBrandingState {
  if (prev.accountId === nextAccountId) return prev;
  return {
    ...EMPTY_SCHOOL_BRANDING,
    accountId: nextAccountId,
    loading: Boolean(nextAccountId),
    revision: prev.revision + 1,
  };
}
