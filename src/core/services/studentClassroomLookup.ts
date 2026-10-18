/**
 * Account/school-scoped classroom name lookup with failure vs empty distinction,
 * bounded retry, and stale-scope protection.
 */

import { fetchStudentClassroomNameLookup } from './dashboardApi';

export type ClassroomLookupScope = {
  userId: string;
  schoolId?: string | number | null;
};

export type ClassroomLookupOk = {
  status: 'ok';
  scopeKey: string;
  map: Map<string, string>;
};

export type ClassroomLookupFailed = {
  status: 'failed';
  scopeKey: string;
  error: string;
  /** Last successful map for this scope, if any — never a silent empty substitute. */
  priorMap: Map<string, string> | null;
};

export type ClassroomLookupResult = ClassroomLookupOk | ClassroomLookupFailed;

const priorByScope = new Map<string, Map<string, string>>();

export function classroomLookupScopeKey(scope: ClassroomLookupScope): string {
  return `${String(scope.userId || '').trim()}::${String(scope.schoolId ?? '')}`;
}

export function clearClassroomLookupCache(scopeKey?: string): void {
  if (scopeKey) {
    priorByScope.delete(scopeKey);
    return;
  }
  priorByScope.clear();
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Load authorized classroom labels. Distinguishes transport/API failure from an
 * empty-but-successful map. Retries once on failure. Never invents names.
 */
export async function loadScopedStudentClassroomNameLookup(
  scope: ClassroomLookupScope,
  options?: { retries?: number; fetchFn?: () => Promise<Map<string, string>> },
): Promise<ClassroomLookupResult> {
  const scopeKey = classroomLookupScopeKey(scope);
  if (!scope.userId) {
    return {
      status: 'failed',
      scopeKey,
      error: 'missing_user',
      priorMap: priorByScope.get(scopeKey) ?? null,
    };
  }

  const retries = options?.retries ?? 1;
  const fetchFn = options?.fetchFn ?? fetchStudentClassroomNameLookup;
  let lastError = 'lookup_failed';

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const map = await fetchFn();
      const copy = new Map(map);
      priorByScope.set(scopeKey, copy);
      return { status: 'ok', scopeKey, map: copy };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'lookup_failed';
      if (attempt < retries) {
        await sleep(400 * (attempt + 1));
      }
    }
  }

  return {
    status: 'failed',
    scopeKey,
    error: lastError,
    priorMap: priorByScope.get(scopeKey) ?? null,
  };
}

/** Effective map for UI: ok map, else prior for same scope, else empty (caller must surface failure). */
export function effectiveClassroomNameMap(result: ClassroomLookupResult): Map<string, string> {
  if (result.status === 'ok') return result.map;
  return result.priorMap ?? new Map();
}
