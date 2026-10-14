/**
 * Session-scoped quiz-attempt selection for open-quiz / check-record recovery.
 * API contract: filter with class_id = assignment session_id (see sharedApi.checkQuizAttempt).
 */

export type QuizAttemptListRow = {
  id?: number;
  status?: string;
  score?: number;
  session_id?: string;
  class_id?: string;
  completed_at?: string;
};

export type PickCompletedAttemptResult =
  | { kind: 'none' }
  | { kind: 'ambiguous' }
  | { kind: 'found'; attempt: QuizAttemptListRow };

/**
 * When attempts are already scoped by server query (student + quiz + class_id=sessionId),
 * accept a single completed row; reject multiple completed rows for the same assignment.
 */
/** LMS classroom id must not be confused with assignment session_id (often a UUID). */
export function resolveAssignmentClassroomId(
  sessionId: string | null | undefined,
  ...candidates: Array<string | null | undefined>
): string | undefined {
  const session = sessionId != null ? String(sessionId).trim() : '';
  for (const candidate of candidates) {
    if (candidate == null || String(candidate).trim() === '') continue;
    const value = String(candidate).trim();
    if (session && value === session) continue;
    return value;
  }
  return undefined;
}

export function coerceQuizAttemptsListResponse(
  payload: unknown,
): QuizAttemptListRow[] {
  if (Array.isArray(payload)) {
    return payload as QuizAttemptListRow[];
  }
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data as QuizAttemptListRow[];
    }
    if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: QuizAttemptListRow[] }).data;
    }
  }
  return [];
}

export function pickCompletedAttemptForScopedList(
  attempts: QuizAttemptListRow[] | null | undefined,
): PickCompletedAttemptResult {
  if (!Array.isArray(attempts) || attempts.length === 0) {
    return { kind: 'none' };
  }
  const completed = attempts.filter((row) => row.status === 'completed');
  if (completed.length === 0) {
    return { kind: 'none' };
  }
  if (completed.length > 1) {
    return { kind: 'ambiguous' };
  }
  return { kind: 'found', attempt: completed[0] };
}
