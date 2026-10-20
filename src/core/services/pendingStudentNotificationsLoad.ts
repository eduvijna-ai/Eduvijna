/**
 * Pending Notifications (student) load — single-flight coalesce + generation invalidate.
 * Callers must compare current account/school/role scope at apply time (not capture-only).
 */

import { ParsedQuiz } from '../types/dashboard.types';
import { isStudentQuizActive } from '../../utils/quizFilters';
import { resolveClassroomDisplayName } from '../../utils/classroomDisplayName';
import {
  checkRecordToQuiz,
  fetchQuizCheckRecord,
} from './dashboardApi';
import {
  ClassroomLookupScope,
  classroomLookupScopeKey,
  effectiveClassroomNameMap,
  loadScopedStudentClassroomNameLookup,
  type ClassroomLookupResult,
} from './studentClassroomLookup';

export type PendingNotificationsScope = ClassroomLookupScope & {
  /** Role string used for invalidate / path selection. */
  role?: string | null;
};

export type PendingNotificationsMapped = {
  quizzes: ParsedQuiz[];
  lookupResult: ClassroomLookupResult;
  scopeKey: string;
  generation: number;
};

export type PendingNotificationsLoadResult =
  | { kind: 'ok'; data: PendingNotificationsMapped }
  | { kind: 'stale'; reason: 'invalidated' | 'scope_changed' | 'superseded' }
  | { kind: 'error'; error: unknown; generation: number; scopeKey: string };

type InFlightEntry = {
  scopeKey: string;
  generation: number;
  promise: Promise<PendingNotificationsLoadResult>;
};

let loadGeneration = 0;
let inFlight: InFlightEntry | null = null;

/** Canonical ERP teacher/instructor predicate (+ admin dashboard path for Notifications). */
export function usesTeacherNotificationsPath(role?: string | null): boolean {
  const r = String(role || '').trim().toLowerCase();
  return r === 'instructor' || r === 'teacher' || r === 'admin' || r === 'super_admin';
}

export function pendingNotificationsScopeKey(scope: PendingNotificationsScope): string {
  return `${classroomLookupScopeKey(scope)}::${String(scope.role ?? '').trim().toLowerCase()}`;
}

/** Invalidate in-flight / pending applies (logout, account/school/role change, unmount). */
export function invalidatePendingStudentNotificationsLoads(): void {
  loadGeneration += 1;
  inFlight = null;
}

export function getPendingStudentNotificationsLoadGeneration(): number {
  return loadGeneration;
}

export type LoadPendingStudentNotificationsOptions = {
  /**
   * Read live scope at completion — must not rely solely on values closed over
   * when the load started.
   */
  getCurrentScope: () => PendingNotificationsScope | null;
  fetchCheckRecord?: typeof fetchQuizCheckRecord;
  loadClassroomLookup?: typeof loadScopedStudentClassroomNameLookup;
};

function mapPendingRows(
  response: Awaited<ReturnType<typeof fetchQuizCheckRecord>>,
  lookupResult: ClassroomLookupResult,
): ParsedQuiz[] {
  const classroomLookup = effectiveClassroomNameMap(lookupResult);
  const mapped = (response.result || [])
    .map((row) => {
      const quiz = checkRecordToQuiz(row, { classroomNameLookup: classroomLookup });
      const classId = String(quiz.classroom_id || quiz.class_id || row.classid || '');
      return {
        ...quiz,
        classroom_name: resolveClassroomDisplayName(classId, {
          recordName: quiz.classroom_name,
          lookup: classroomLookup,
        }),
      };
    })
    .filter(isStudentQuizActive) as ParsedQuiz[];

  mapped.sort((a: any, b: any) => {
    const dateA = new Date(a.assigned_at || a.created_at).getTime();
    const dateB = new Date(b.assigned_at || b.created_at).getTime();
    return dateB - dateA;
  });
  return mapped;
}

function scopeStillCurrent(
  startedKey: string,
  startedGeneration: number,
  getCurrentScope: () => PendingNotificationsScope | null,
): boolean {
  if (startedGeneration !== loadGeneration) return false;
  const current = getCurrentScope();
  if (!current?.userId) return false;
  if (usesTeacherNotificationsPath(current.role)) return false;
  return pendingNotificationsScopeKey(current) === startedKey;
}

/**
 * Load pending student notifications. Identical in-flight scope keys share one request.
 * Success/error results are marked stale when generation or live scope no longer matches.
 */
export async function loadPendingStudentNotifications(
  scope: PendingNotificationsScope,
  options: LoadPendingStudentNotificationsOptions,
): Promise<PendingNotificationsLoadResult> {
  if (!scope.userId || usesTeacherNotificationsPath(scope.role)) {
    return { kind: 'stale', reason: 'scope_changed' };
  }

  const scopeKey = pendingNotificationsScopeKey(scope);
  if (inFlight && inFlight.scopeKey === scopeKey && inFlight.generation === loadGeneration) {
    return inFlight.promise;
  }

  const generation = loadGeneration;
  const fetchCheckRecord = options.fetchCheckRecord ?? fetchQuizCheckRecord;
  const loadClassroomLookup = options.loadClassroomLookup ?? loadScopedStudentClassroomNameLookup;

  const promise = (async (): Promise<PendingNotificationsLoadResult> => {
    try {
      const [response, lookupResult] = await Promise.all([
        fetchCheckRecord(scope.userId, 'pending'),
        loadClassroomLookup({
          userId: scope.userId,
          schoolId: scope.schoolId,
        }),
      ]);

      if (!scopeStillCurrent(scopeKey, generation, options.getCurrentScope)) {
        return {
          kind: 'stale',
          reason: generation !== loadGeneration ? 'invalidated' : 'scope_changed',
        };
      }

      return {
        kind: 'ok',
        data: {
          quizzes: mapPendingRows(response, lookupResult),
          lookupResult,
          scopeKey,
          generation,
        },
      };
    } catch (error) {
      if (!scopeStillCurrent(scopeKey, generation, options.getCurrentScope)) {
        return {
          kind: 'stale',
          reason: generation !== loadGeneration ? 'invalidated' : 'scope_changed',
        };
      }
      return { kind: 'error', error, generation, scopeKey };
    }
  })();

  inFlight = { scopeKey, generation, promise };
  try {
    return await promise;
  } finally {
    if (inFlight?.promise === promise) {
      inFlight = null;
    }
  }
}

/** Test helper: whether a completed result may update UI for the live scope. */
export function canApplyPendingNotificationsResult(
  result: PendingNotificationsLoadResult,
  getCurrentScope: () => PendingNotificationsScope | null,
): boolean {
  if (result.kind === 'stale') return false;
  const scopeKey = result.kind === 'ok' ? result.data.scopeKey : result.scopeKey;
  const generation = result.kind === 'ok' ? result.data.generation : result.generation;
  return scopeStillCurrent(scopeKey, generation, getCurrentScope);
}
