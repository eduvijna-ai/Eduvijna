/**
 * Shared assessment classroom inventory — same authorized scope as ClassesList.
 *
 * Teacher/instructor/admin: GET .../dashboard/quizzes?view_type=class_wise_students
 * Student: view_type=classes (class_wise_students returns empty under student auth).
 *
 * Never use quiz-derived sets, ERP counts, or unverified response totals as substitutes.
 */

import { API_BASE_URL } from '../api/config';
import * as TokenStorage from './tokenStorage';
import type { Classroom, Instructor } from '../types/quiz.types';

const DASHBOARD_API_URL = `${API_BASE_URL}/api/v1`;
const PAGE_SIZE = 100;

export type AssessmentClassroom = Classroom & {
  /** Enrollment / roster size when provided by class_wise rows (may be 0). */
  total_students?: number;
  student_count?: number;
  total_count?: number;
  students?: unknown[];
  attempts?: unknown;
};

export type AssessmentClassroomScope = {
  apiEnv: string;
  userId: string;
  role: string;
  schoolId?: string | number | null;
};

export type AssessmentClassroomsOk = {
  kind: 'ok';
  scopeKey: string;
  generation: number;
  classrooms: AssessmentClassroom[];
  /** Unique classroom_id count — authoritative Home / list KPI. */
  count: number;
  source: 'class_wise_students' | 'classes';
  pagesFetched: number;
};

export type AssessmentClassroomsFailed = {
  kind: 'failed';
  scopeKey: string;
  generation: number;
  error: string;
  /** Prior successful inventory for this scope, if any. */
  prior: AssessmentClassroom[] | null;
};

export type AssessmentClassroomsResult = AssessmentClassroomsOk | AssessmentClassroomsFailed;

type InFlight = {
  scopeKey: string;
  generation: number;
  promise: Promise<AssessmentClassroomsResult>;
};

let loadGeneration = 0;
let inFlight: InFlight | null = null;
const priorByScope = new Map<string, AssessmentClassroom[]>();

/** Instructor | teacher share the teacher assessment classroom path; admin too. */
export function usesTeacherAssessmentClassroomPath(role?: string | null): boolean {
  const r = String(role || '').trim().toLowerCase();
  return r === 'instructor' || r === 'teacher' || r === 'admin' || r === 'super_admin';
}

export function assessmentClassroomScopeKey(scope: AssessmentClassroomScope): string {
  return [
    String(scope.apiEnv || '').trim(),
    String(scope.userId || '').trim(),
    String(scope.role || '').trim().toLowerCase(),
    String(scope.schoolId ?? ''),
  ].join('::');
}

export function invalidateAssessmentClassroomsLoads(scopeKey?: string): void {
  loadGeneration += 1;
  inFlight = null;
  if (scopeKey) {
    priorByScope.delete(scopeKey);
  } else {
    priorByScope.clear();
  }
}

export function getAssessmentClassroomsLoadGeneration(): number {
  return loadGeneration;
}

/**
 * Normalize rows by stable classroom_id. Preserves zero-assignment / zero-roster
 * classrooms. Does not dedupe by grade, label, or subject.
 */
export function normalizeAssessmentClassroomRows(rows: unknown[]): AssessmentClassroom[] {
  const map = new Map<string, AssessmentClassroom>();
  for (const raw of rows || []) {
    const row = raw as Record<string, unknown>;
    const id = String(row?.classroom_id || row?.class_id || row?.classid || '').trim();
    if (!id || map.has(id)) continue;

    let instructorData: Instructor;
    if (row.instructor) {
      try {
        instructorData =
          typeof row.instructor === 'string'
            ? JSON.parse(row.instructor as string)
            : (row.instructor as Instructor);
      } catch {
        instructorData = {
          instructor_id: '0',
          instructor_username: 'unknown',
          instructor_fullname: 'Unknown Instructor',
          instructor_avatar_url: null,
        };
      }
    } else {
      instructorData = {
        instructor_id: '0',
        instructor_username: 'unknown',
        instructor_fullname: 'Unknown Instructor',
        instructor_avatar_url: null,
      };
    }

    let students: any[] = [];
    if (row.attempts) {
      try {
        const parsed =
          typeof row.attempts === 'string' ? JSON.parse(row.attempts as string) : row.attempts;
        if (Array.isArray(parsed)) {
          students = parsed.map((student: any) => ({
            id: student.student_id,
            user_id: student.student_id,
            student_id: student.student_id,
            fullname: student.student_fullname,
            username: student.student_username,
            email: student.email,
            phone: student.phone,
            status: student.status,
            role: student.role,
            avatar_url: student.avatar_url,
            last_login: student.last_login,
            dob: student.dob,
          }));
        }
      } catch {
        students = Array.isArray(row.students) ? (row.students as any[]) : [];
      }
    } else if (Array.isArray(row.students)) {
      students = row.students as any[];
    }

    const studentCount =
      Number(row.total_students ?? row.total_count ?? row.student_count ?? 0) ||
      students.length ||
      0;

    map.set(id, {
      classroom_id: id,
      classroom_name: String(row.classroom_name || row.name || id),
      instructor: instructorData,
      total_students: studentCount,
      student_count: studentCount,
      total_count: studentCount,
      students,
      attempts: row.attempts,
    });
  }
  return Array.from(map.values());
}

/** @deprecated Prefer normalizeAssessmentClassroomRows — kept for existing imports. */
export function mapClassWiseStudentsToClassrooms(rows: any[]): Classroom[] {
  return normalizeAssessmentClassroomRows(rows);
}

/**
 * Authoritative count is always unique classroom_id length.
 * Reported pagination totals are ignored when they diverge (assignment-row totals).
 */
export function resolveAuthoritativeClassroomCount(params: {
  uniqueClassrooms: number;
  reportedTotal?: number | null;
  hasMore?: boolean;
}): number {
  return Math.max(0, params.uniqueClassrooms);
}

export type AssessmentClassroomPageResult = {
  rows: unknown[];
  /** Server (or contract-derived) indication that more pages exist. */
  hasMore: boolean;
  reportedTotal: number | null;
  /** Next offset to request; defaults to offset + applied limit. */
  nextOffset: number;
  appliedLimit: number;
};

export type FetchAllAssessmentClassroomsOutcome =
  | { kind: 'complete'; rows: unknown[]; pagesFetched: number }
  | {
      kind: 'incomplete';
      rows: unknown[];
      pagesFetched: number;
      reason:
        | 'hasMore_short_or_empty_page'
        | 'repeated_page'
        | 'no_progress_loop'
        | 'safety_limit_exhausted'
        | 'inconsistent_pagination';
    };

function rowClassroomId(row: unknown): string {
  const r = row as Record<string, unknown>;
  return String(r?.classroom_id || r?.class_id || r?.classid || '').trim();
}

function pageFingerprint(rows: unknown[]): string {
  return rows.map(rowClassroomId).filter(Boolean).join('|');
}

/**
 * Interpret API pagination for one page. Prefer explicit hasMore/next_offset;
 * fall back to reported total and full-page heuristics without inventing totals.
 */
export function interpretAssessmentClassroomPage(params: {
  rows: unknown[];
  offset: number;
  limit: number;
  body?: any;
}): AssessmentClassroomPageResult {
  const { rows, offset, limit, body } = params;
  const reportedRaw =
    body?.pagination?.total ?? body?.meta?.total_count ?? body?.pagination?.total_count ?? null;
  const reportedTotal = Number.isFinite(Number(reportedRaw)) ? Number(reportedRaw) : null;
  const explicitHasMore = body?.pagination?.hasMore ?? body?.pagination?.has_more;
  const nextFromServer = body?.pagination?.next_offset ?? body?.pagination?.nextOffset;
  const nextOffset =
    Number.isFinite(Number(nextFromServer)) && Number(nextFromServer) > offset
      ? Number(nextFromServer)
      : offset + limit;

  let hasMore: boolean;
  if (typeof explicitHasMore === 'boolean') {
    hasMore = explicitHasMore;
  } else if (reportedTotal != null) {
    hasMore = offset + rows.length < reportedTotal;
  } else {
    // No explicit cursor/total — a full page may have more; a short page ends.
    hasMore = rows.length >= limit;
  }

  return {
    rows,
    hasMore,
    reportedTotal,
    nextOffset,
    appliedLimit: limit,
  };
}

async function fetchAssessmentClassroomPage(params: {
  viewType: 'class_wise_students' | 'classes';
  limit: number;
  offset: number;
}): Promise<AssessmentClassroomPageResult> {
  const token = await TokenStorage.getAccessToken();
  if (!token) {
    throw new Error('assessment_classrooms_unauthenticated');
  }
  const url =
    `${DASHBOARD_API_URL}/dashboard/quizzes` +
    `?view_type=${encodeURIComponent(params.viewType)}` +
    `&limit=${params.limit}&offset=${params.offset}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`assessment_classrooms_http_${response.status}:${text.slice(0, 120)}`);
  }
  const body = await response.json();
  const rows = Array.isArray(body?.data) ? body.data : [];
  return interpretAssessmentClassroomPage({
    rows,
    offset: params.offset,
    limit: params.limit,
    body,
  });
}

/**
 * Walk all pages until the API indicates completion.
 * Never treats a short/duplicate page with hasMore=true as success.
 * Safety-limit exhaustion and non-progress loops are incomplete failures.
 */
export async function fetchAllAssessmentClassroomRows(
  viewType: 'class_wise_students' | 'classes',
  options?: {
    pageSize?: number;
    maxPages?: number;
    fetchPage?: typeof fetchAssessmentClassroomPage;
  },
): Promise<FetchAllAssessmentClassroomsOutcome> {
  const pageSize = options?.pageSize ?? PAGE_SIZE;
  const maxPages = options?.maxPages ?? 50;
  const fetchPage = options?.fetchPage ?? fetchAssessmentClassroomPage;
  const byId = new Map<string, unknown>();
  let offset = 0;
  let pagesFetched = 0;
  let consecutiveNoProgress = 0;
  const seenPageKeys = new Set<string>();

  while (pagesFetched < maxPages) {
    const page = await fetchPage({ viewType, limit: pageSize, offset });
    pagesFetched += 1;

    const fingerprint = pageFingerprint(page.rows);
    const pageKey = `${offset}::${fingerprint}`;
    if (seenPageKeys.has(pageKey)) {
      return {
        kind: 'incomplete',
        rows: Array.from(byId.values()),
        pagesFetched,
        reason: 'repeated_page',
      };
    }
    seenPageKeys.add(pageKey);

    const sizeBefore = byId.size;
    for (const row of page.rows) {
      const id = rowClassroomId(row);
      if (!id || byId.has(id)) continue;
      byId.set(id, row);
    }
    const madeProgress = byId.size > sizeBefore;

    if (!page.hasMore) {
      return {
        kind: 'complete',
        rows: Array.from(byId.values()),
        pagesFetched,
      };
    }

    // Server says more pages remain.
    if (page.rows.length === 0 || page.rows.length < page.appliedLimit) {
      return {
        kind: 'incomplete',
        rows: Array.from(byId.values()),
        pagesFetched,
        reason: 'hasMore_short_or_empty_page',
      };
    }

    // Duplicate-only page: keep advancing while hasMore, but bound non-progress.
    if (!madeProgress) {
      consecutiveNoProgress += 1;
      if (consecutiveNoProgress >= 2) {
        return {
          kind: 'incomplete',
          rows: Array.from(byId.values()),
          pagesFetched,
          reason: 'no_progress_loop',
        };
      }
    } else {
      consecutiveNoProgress = 0;
    }

    if (!Number.isFinite(page.nextOffset) || page.nextOffset <= offset) {
      return {
        kind: 'incomplete',
        rows: Array.from(byId.values()),
        pagesFetched,
        reason: 'inconsistent_pagination',
      };
    }
    offset = page.nextOffset;
  }

  return {
    kind: 'incomplete',
    rows: Array.from(byId.values()),
    pagesFetched,
    reason: 'safety_limit_exhausted',
  };
}

export type LoadAssessmentClassroomsOptions = {
  getCurrentScope: () => AssessmentClassroomScope | null;
  fetchAll?: typeof fetchAllAssessmentClassroomRows;
};

function scopeStillCurrent(
  startedKey: string,
  startedGeneration: number,
  getCurrentScope: () => AssessmentClassroomScope | null,
): boolean {
  if (startedGeneration !== loadGeneration) return false;
  const current = getCurrentScope();
  if (!current?.userId) return false;
  return assessmentClassroomScopeKey(current) === startedKey;
}

/**
 * Load complete authorized assessment classroom inventory for the live scope.
 * Coalesces identical in-flight loads; rejects stale results after invalidate/scope change.
 */
export async function loadAssessmentClassrooms(
  scope: AssessmentClassroomScope,
  options: LoadAssessmentClassroomsOptions,
): Promise<AssessmentClassroomsResult> {
  if (!scope.userId) {
    return {
      kind: 'failed',
      scopeKey: assessmentClassroomScopeKey(scope),
      generation: loadGeneration,
      error: 'missing_user',
      prior: null,
    };
  }

  const scopeKey = assessmentClassroomScopeKey(scope);
  if (inFlight && inFlight.scopeKey === scopeKey && inFlight.generation === loadGeneration) {
    return inFlight.promise;
  }

  const generation = loadGeneration;
  const fetchAll = options.fetchAll ?? fetchAllAssessmentClassroomRows;
  const teacherPath = usesTeacherAssessmentClassroomPath(scope.role);
  const source: 'class_wise_students' | 'classes' = teacherPath
    ? 'class_wise_students'
    : 'classes';

  const promise = (async (): Promise<AssessmentClassroomsResult> => {
    try {
      const outcome = await fetchAll(source);
      if (!scopeStillCurrent(scopeKey, generation, options.getCurrentScope)) {
        return {
          kind: 'failed',
          scopeKey,
          generation,
          error: 'stale_scope',
          prior: priorByScope.get(scopeKey) ?? null,
        };
      }

      // Incomplete pagination must not publish a partial count as authoritative.
      if (outcome.kind === 'incomplete') {
        return {
          kind: 'failed',
          scopeKey,
          generation,
          error: `incomplete_inventory:${outcome.reason}`,
          prior: priorByScope.get(scopeKey) ?? null,
        };
      }

      const classrooms = normalizeAssessmentClassroomRows(outcome.rows);
      priorByScope.set(scopeKey, classrooms);
      return {
        kind: 'ok',
        scopeKey,
        generation,
        classrooms,
        count: classrooms.length,
        source,
        pagesFetched: outcome.pagesFetched,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'assessment_classrooms_failed';
      if (!scopeStillCurrent(scopeKey, generation, options.getCurrentScope)) {
        return {
          kind: 'failed',
          scopeKey,
          generation,
          error: 'stale_scope',
          prior: priorByScope.get(scopeKey) ?? null,
        };
      }
      return {
        kind: 'failed',
        scopeKey,
        generation,
        error,
        prior: priorByScope.get(scopeKey) ?? null,
      };
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

export function canApplyAssessmentClassroomsResult(
  result: AssessmentClassroomsResult,
  getCurrentScope: () => AssessmentClassroomScope | null,
): boolean {
  if (result.kind === 'failed' && result.error === 'stale_scope') return false;
  const current = getCurrentScope();
  if (!current?.userId) return false;
  if (result.generation !== loadGeneration) return false;
  return assessmentClassroomScopeKey(current) === result.scopeKey;
}

/** Dropdown / filter option shape shared by Assessments + Analytics. */
export function assessmentClassroomsToOptions(
  classrooms: AssessmentClassroom[],
): Array<{ classroom_id: string; classroom_name: string }> {
  return classrooms.map((c) => ({
    classroom_id: c.classroom_id,
    classroom_name: c.classroom_name,
  }));
}
