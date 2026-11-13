import {
  fetchQuizCheckRecord,
  fetchQuizCheckRecordForSession,
  type CheckRecordQuiz,
  type CheckRecordResponse,
} from './dashboardApi';

export type GradedAssignmentResolution =
  | { kind: 'resolved'; sessionId: string; classroomId: string }
  | { kind: 'ambiguous' }
  | { kind: 'none' };

function verifiedCompletedAssignment(
  row: CheckRecordQuiz | null | undefined,
  studentId: string,
  quizId: string | number,
  expectedClassroomId?: string | null,
): { sessionId: string; classroomId: string } | null {
  if (!row || row.status !== 'completed') return null;
  if (row.student_id && String(row.student_id) !== studentId) return null;
  if (String(row.quiz_details?.quiz_id ?? '') !== String(quizId)) return null;
  const sessionId = String(row.quiz_details?.session_id ?? '').trim();
  const classroomId = String(
    row.classid || row.quiz_details?.classroom_id || row.quiz_details?.class_id || '',
  ).trim();
  if (!sessionId || !classroomId) return null;
  if (expectedClassroomId && classroomId !== expectedClassroomId) return null;
  return { sessionId, classroomId };
}

/**
 * Resolve a graded notification ONLY to a completed assignment returned by
 * the authenticated student's check-record API.
 *
 * If session is provided, verify exactly that session. Without it, never
 * guess when the same quiz appears in multiple assignment sessions.
 */
export async function resolveStudentGradedAssignmentSession(
  studentId: string,
  quizId: string | number,
  expected?: { sessionId?: string | null; classroomId?: string | null },
): Promise<GradedAssignmentResolution> {
  if (!studentId || quizId == null || String(quizId).trim() === '') {
    return { kind: 'none' };
  }

  if (expected?.sessionId) {
    try {
      const row = await fetchQuizCheckRecordForSession(studentId, expected.sessionId);
      const verified = verifiedCompletedAssignment(
        row,
        studentId,
        quizId,
        expected.classroomId,
      );
      return verified?.sessionId === expected.sessionId
        ? { kind: 'resolved', ...verified }
        : { kind: 'none' };
    } catch {
      return { kind: 'none' };
    }
  }

  const [pendingSettled, completedSettled] = await Promise.allSettled([
    fetchQuizCheckRecord(studentId, 'pending'),
    fetchQuizCheckRecord(studentId, 'completed'),
  ]);
  const rows: NonNullable<CheckRecordResponse['result']> = [];
  if (pendingSettled.status === 'fulfilled') {
    rows.push(...(pendingSettled.value.result ?? []));
  }
  if (completedSettled.status === 'fulfilled') {
    rows.push(...(completedSettled.value.result ?? []));
  }
  if (
    rows.length === 0 &&
    pendingSettled.status === 'rejected' &&
    completedSettled.status === 'rejected'
  ) {
    return { kind: 'none' };
  }

  const sessions = new Map<string, string>();
  for (const row of rows) {
    const verified = verifiedCompletedAssignment(
      row,
      studentId,
      quizId,
      expected?.classroomId,
    );
    if (verified) {
      sessions.set(verified.sessionId, verified.classroomId);
    }
  }

  if (sessions.size === 1) {
    const [sessionId, classroomId] = [...sessions.entries()][0];
    return { kind: 'resolved', sessionId, classroomId };
  }
  if (sessions.size > 1) {
    return { kind: 'ambiguous' };
  }
  return { kind: 'none' };
}
