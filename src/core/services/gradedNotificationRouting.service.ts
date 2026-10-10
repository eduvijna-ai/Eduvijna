import { fetchQuizCheckRecord } from './dashboardApi';

export type GradedAssignmentResolution =
  | { kind: 'resolved'; sessionId: string; classroomId: string }
  | { kind: 'ambiguous' }
  | { kind: 'none' };

/**
 * Resolve assignment session for quiz_graded payloads missing session_id.
 * Never guesses among multiple assignments for the same quiz.
 */
export async function resolveStudentGradedAssignmentSession(
  studentId: string,
  quizId: string | number,
): Promise<GradedAssignmentResolution> {
  if (!studentId || quizId == null || String(quizId).trim() === '') {
    return { kind: 'none' };
  }

  const [pendingRes, completedRes] = await Promise.all([
    fetchQuizCheckRecord(studentId, 'pending'),
    fetchQuizCheckRecord(studentId, 'completed'),
  ]);
  const rows = [...(pendingRes.result ?? []), ...(completedRes.result ?? [])];
  const matches = rows.filter(
    (row) => String(row.quiz_details?.quiz_id ?? '') === String(quizId),
  );

  const sessions = new Map<string, string>();
  for (const row of matches) {
    const sessionId = row.quiz_details?.session_id;
    if (!sessionId) continue;
    const classroomId =
      row.quiz_details?.classroom_id ??
      row.classroom_id ??
      row.quiz_details?.class_id ??
      '';
    sessions.set(String(sessionId), String(classroomId ?? ''));
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
