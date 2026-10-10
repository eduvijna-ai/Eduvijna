import { getDevApiBase, loginDevApi } from './dev-api-auth.mjs';

export function getMatrixApiBase() {
  return getDevApiBase();
}

export async function loginMatrixAccount(username, password) {
  return loginDevApi(username, password);
}

export async function discoverClassroomForStudent(instructorToken, studentId, apiBase = getMatrixApiBase()) {
  const res = await fetch(
    `${apiBase}/api/v1/dashboard/quizzes?view_type=class_wise_students&limit=100&offset=0`,
    { headers: { Authorization: `Bearer ${instructorToken}` } },
  );
  const data = await res.json();
  const rows = data.data ?? [];
  for (const row of rows) {
    const attempts =
      typeof row.attempts === 'string' ? JSON.parse(row.attempts) : row.attempts ?? [];
    const hit = attempts.find((s) => String(s.student_id) === String(studentId));
    if (hit) {
      return { classroomId: String(row.classroom_id), classroomName: String(row.classroom_name) };
    }
  }
  throw new Error('no_classroom_for_student');
}

export async function createDisposableMatrixAssignment(
  instructorToken,
  instructorId,
  classroomId,
  apiBase = getMatrixApiBase(),
) {
  const topic = `DEV_MATRIX_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const requestedSessionId = `dev_matrix_${Date.now()}`;
  const res = await fetch(`${apiBase}/api/v1/sharequiz`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${instructorToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic,
      file_name: topic,
      classroom_id: classroomId,
      instructor_id: instructorId,
      instructor_name: 'instructor',
      quiz_id: null,
      createdby: 'instructor',
      student_level: 'Class 5',
      session_id: requestedSessionId,
      questions: {
        quizzes: [
          {
            quiz: {
              question: 'Matrix verify: 2 + 2 = ?',
              options: ['3', '4', '5', '6'],
              answer: 'B',
              explanation: null,
            },
            answer: 'B',
          },
        ],
      },
      status: 'active',
      tags: { subject: 'Mathematics', difficulty: 'easy' },
      question_count: 1,
      duration: 30,
      summary: 'Disposable dev submission matrix fixture',
      type: 'multiple_choice',
      is_public: false,
      is_timer: false,
      start_time: now.toISOString(),
      end_time: end.toISOString(),
      has_time_limit: false,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.quiz_id || !data.session_id) {
    throw new Error(`sharequiz_failed status=${res.status}`);
  }

  const quizId = Number(data.quiz_id);
  const resolvedClassroomId = String(data.classroom_id || classroomId);
  const sessionId = String(data.session_id);

  const assignmentRes = await fetch(`${apiBase}/api/v1/dashboard/quiz-assignments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${instructorToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quiz_id: quizId,
      class_id: resolvedClassroomId,
      assigned_by: instructorId,
      assigned_at: data.assigned_at || now.toISOString(),
      due_date: data.due_date || end.toISOString(),
      is_active: true,
    }),
  });
  if (!assignmentRes.ok) {
    throw new Error(`quiz_assignment_failed status=${assignmentRes.status}`);
  }

  const classroomQuizRes = await fetch(`${apiBase}/api/v1/dashboard/classroom-quizzes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${instructorToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quiz_id: quizId,
      classroom_id: resolvedClassroomId,
      instructor_id: instructorId,
      topic,
      date_created: new Date().toISOString(),
      is_active: true,
    }),
  });
  if (!classroomQuizRes.ok) {
    throw new Error(`classroom_quiz_failed status=${classroomQuizRes.status}`);
  }

  return {
    topic,
    quizId,
    sessionId,
    classroomId: resolvedClassroomId,
    apiBase,
  };
}

/** No documented disposable-delete API; record limitation only (does not mutate production data). */
export async function cleanupDisposableMatrixAssignment(_instructorToken, fixture) {
  if (!fixture?.topic?.startsWith('DEV_MATRIX_')) {
    return { ok: false, skipped: true, reason: 'not_disposable_topic' };
  }
  return {
    ok: false,
    skipped: true,
    limitation:
      'No supported dev-api cleanup contract for sharequiz fixtures; disposable rows may remain until TTL.',
  };
}
