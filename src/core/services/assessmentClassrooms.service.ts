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

type PageFetchResult = {
  rows: unknown[];
  hasMore: boolean;
  reportedTotal: number | null;
};

async function fetchAssessmentClassroomPage(params: {
  viewType: 'class_wise_students' | 'classes';
  limit: number;
  offset: number;
}): Promise<PageFetchResult> {
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
  const reportedRaw =
    body?.pagination?.total ?? body?.meta?.total_count ?? body?.pagination?.total_count ?? null;
  const reportedTotal = Number.isFinite(Number(reportedRaw)) ? Number(reportedRaw) : null;
  const hasMoreFlag = Boolean(body?.pagination?.hasMore ?? body?.pagination?.has_more);
  const limit = params.limit;
  const offset = params.offset;
  const hasMore =
    hasMoreFlag ||
    (reportedTotal != null && offset + rows.length < reportedTotal) ||
    rows.length >= limit;
  return { rows, hasMore: hasMore && rows.length > 0, reportedTotal };
}

/**
 * Walk all pages. Stops when a page returns fewer than PAGE_SIZE rows
 * (or hasMore is false). Dedupes by classroom_id across pages.
 */
export async function fetchAllAssessmentClassroomRows(
  viewType: 'class_wise_students' | 'classes',
  options?: { pageSize?: number; fetchPage?: typeof fetchAssessmentClassroomPage },
): Promise<{ rows: unknown[]; pagesFetched: number }> {
  const pageSize = options?.pageSize ?? PAGE_SIZE;
  const fetchPage = options?.fetchPage ?? fetchAssessmentClassroomPage;
  const byId = new Map<string, unknown>();
  let offset = 0;
  let pagesFetched = 0;
  const maxPages = 50;

  while (pagesFetched < maxPages) {
    const page = await fetchPage({ viewType, limit: pageSize, offset });
    pagesFetched += 1;
    const sizeBefore = byId.size;
    for (const row of page.rows) {
      const id = String(
        (row as any)?.classroom_id || (row as any)?.class_id || (row as any)?.classid || '',
      ).trim();
      if (!id || byId.has(id)) continue;
      byId.set(id, row);
    }
    const madeProgress = byId.size > sizeBefore;
    if (!page.hasMore || page.rows.length < pageSize || !madeProgress) break;
    offset += pageSize;
  }

  return { rows: Array.from(byId.values()), pagesFetched };
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
      const { rows, pagesFetched } = await fetchAll(source);
      if (!scopeStillCurrent(scopeKey, generation, options.getCurrentScope)) {
        return {
          kind: 'failed',
          scopeKey,
          generation,
          error: 'stale_scope',
          prior: priorByScope.get(scopeKey) ?? null,
        };
      }
      const classrooms = normalizeAssessmentClassroomRows(rows);
      priorByScope.set(scopeKey, classrooms);
      return {
        kind: 'ok',
        scopeKey,
        generation,
        classrooms,
        count: classrooms.length,
        source,
        pagesFetched,
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
