/**
 * Pure helpers for push/deep-link navigation params (Quiz-React parity).
 */

export function buildQuizGradedResultsNavigationParams(data: {
  quiz_id?: string | number;
  quizId?: string | number;
  session_id?: string;
  sessionId?: string;
  student_id?: string | number;
  studentId?: string | number;
  quiz_title?: string;
  quizTitle?: string;
}): Record<string, unknown> | null {
  const quizId = data.quiz_id ?? data.quizId;
  if (quizId == null || quizId === '') {
    return null;
  }

  const sessionId = data.session_id ?? data.sessionId;
  const studentId = data.student_id ?? data.studentId;
  const quizName = data.quiz_title ?? data.quizTitle;

  const params: Record<string, unknown> = {
    quizId,
    isTeacherView: false,
  };

  if (sessionId) {
    params.sessionId = sessionId;
  }
  if (studentId != null && studentId !== '') {
    params.studentId = String(studentId);
  }
  if (quizName) {
    params.quizName = quizName;
  }

  return params;
}
