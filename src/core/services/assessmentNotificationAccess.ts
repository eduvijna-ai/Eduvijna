/**
 * Authorization gates for assessment push taps.
 *
 * FCM payloads are routing hints, never evidence of enrollment or instructor access.
 * Every assessment navigation must be checked against an authenticated API response.
 */
import {
  fetchQuizCheckRecordForSession,
  fetchTeacherClassrooms,
  fetchQuizDetails,
} from './dashboardApi';

export type NotificationAccessResult =
  | { kind: 'authorized'; quizId: string; sessionId: string; classroomId: string }
  | { kind: 'denied'; reason: string };

function identifier(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
}

export async function authorizeStudentAssignedNotification(args: {
  studentId: string;
  sessionId: string;
  quizId?: string | null;
  classroomId?: string | null;
}): Promise<NotificationAccessResult> {
  if (!args.studentId || !args.sessionId) {
    return { kind: 'denied', reason: 'assignment_identity_missing' };
  }
  try {
    // The API scopes check-record to the signed-in student's identity.
    const row = await fetchQuizCheckRecordForSession(args.studentId, args.sessionId);
    if (!row?.quiz_details) {
      return { kind: 'denied', reason: 'assignment_not_found' };
    }
    const serverSession = identifier(row.quiz_details.session_id);
    const serverQuiz = identifier(row.quiz_details.quiz_id);
    const serverClass = identifier(
      row.classid || row.quiz_details.classroom_id || row.quiz_details.class_id,
    );
    if (
      !serverSession ||
      serverSession !== args.sessionId ||
      !serverQuiz ||
      (identifier(row.student_id) && identifier(row.student_id) !== args.studentId)
    ) {
      return { kind: 'denied', reason: 'assignment_scope_mismatch' };
    }
    if (args.quizId && identifier(args.quizId) !== serverQuiz) {
      return { kind: 'denied', reason: 'assignment_quiz_mismatch' };
    }
    if (args.classroomId && identifier(args.classroomId) !== serverClass) {
      return { kind: 'denied', reason: 'assignment_classroom_mismatch' };
    }
    return {
      kind: 'authorized',
      quizId: serverQuiz,
      sessionId: serverSession,
      classroomId: serverClass,
    };
  } catch {
    return { kind: 'denied', reason: 'assignment_lookup_unavailable' };
  }
}

export async function authorizeInstructorCompletionNotification(args: {
  classroomId: string;
  quizId: string;
  studentId: string;
  sessionId: string;
}): Promise<NotificationAccessResult> {
  if (!args.classroomId || !args.quizId || !args.studentId || !args.sessionId) {
    return { kind: 'denied', reason: 'completion_identity_missing' };
  }
  const numericQuizId = Number(args.quizId);
  if (!Number.isSafeInteger(numericQuizId) || numericQuizId <= 0) {
    return { kind: 'denied', reason: 'completion_quiz_invalid' };
  }
  try {
    // Both queries use the authenticated instructor's API access.
    const inventory = await fetchTeacherClassrooms();
    const rows = Array.isArray(inventory.data) ? inventory.data : [];
    const classroom = rows.find((row) => {
      const record = row as unknown as Record<string, unknown>;
      return [
        record.classroom_id,
        record.class_id,
        record.id,
      ].some((v) => identifier(v) === args.classroomId);
    });
    if (!classroom) {
      return { kind: 'denied', reason: 'completion_classroom_not_authorized' };
    }
    const members = (classroom as unknown as { students?: Array<Record<string, unknown>> }).students;
    if (
      !Array.isArray(members) ||
      !members.some((member) =>
        [member.student_id, member.user_id, member.id].some(
          (id) => identifier(id) === args.studentId,
        ),
      )
    ) {
      return { kind: 'denied', reason: 'completion_student_not_in_class' };
    }

    const quizzes = await fetchQuizDetails(args.classroomId, numericQuizId);
    const quizRows = Array.isArray(quizzes.data) ? quizzes.data : [];
    if (!quizRows.some((quiz) => {
      const row = quiz as unknown as Record<string, unknown>;
      const quizId = identifier(row.quiz_id ?? row.id);
      const classId = identifier(row.classroom_id ?? row.class_id);
      const returnedSession = identifier(row.session_id ?? row.sessionId);
      // When the instructor summary includes a session, it must match the
      // notification. Do not open a different assignment of the same quiz.
      return quizId === args.quizId &&
        (!classId || classId === args.classroomId) &&
        (!returnedSession || returnedSession === args.sessionId);
    })) {
      return { kind: 'denied', reason: 'completion_quiz_not_in_class' };
    }
    return {
      kind: 'authorized',
      quizId: args.quizId,
      sessionId: args.sessionId,
      classroomId: args.classroomId,
    };
  } catch {
    return { kind: 'denied', reason: 'completion_lookup_unavailable' };
  }
}
