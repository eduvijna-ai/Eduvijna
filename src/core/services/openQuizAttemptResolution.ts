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
