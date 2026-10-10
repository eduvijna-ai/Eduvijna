/**
 * Assigned-quiz submission + checkpoint recovery matrix against dev-api (redacted output).
 *
 * Credentials (gitignored): .dev-api-credentials.local.json
 * {
 *   "accounts": {
 *     "instructor": { "username": "...", "password": "..." },
 *     "student": { "username": "demo_aarya", "password": "..." }
 *   },
 *   "disposableQuiz": {
 *     "classroomId": "class_e2d9c6ba",
 *     "targetStudentUsername": "demo_aarya"
 *   }
 * }
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { redactDeep } from './lib/trace-redact.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');

function loadConfig() {
  if (!existsSync(credFile)) {
    return null;
  }
  return JSON.parse(readFileSync(credFile, 'utf8'));
}

async function api(token, method, path, body) {
  const res = await fetch(`${getDevApiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _preview: text.slice(0, 200) };
  }
  return { status: res.status, data: redactDeep(data) };
}

function summarizeCheckRecord(data) {
  const rows = data?.result ?? [];
  return {
    rowCount: rows.length,
    sample: rows.slice(0, 2).map((row) =>
      redactDeep({
        quiz_id: row.quiz_details?.quiz_id,
        session_id: row.quiz_details?.session_id,
        student_status: row.status,
        score: row.quiz_details?.score,
      }),
    ),
  };
}

async function createDisposableQuiz(instructorAuth, cfg) {
  const classroomId = cfg.disposableQuiz?.classroomId;
  if (!classroomId) {
    return { skipped: true, reason: 'missing disposableQuiz.classroomId' };
  }
  const topic = `DEV_MATRIX_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const shareBody = {
    topic,
    file_name: topic,
    classroom_id: classroomId,
    instructor_id: instructorAuth.userId,
    instructor_name: instructorAuth.username,
    quiz_id: null,
    createdby: instructorAuth.username,
    student_level: 'Class 5',
    session_id: `dev_matrix_${Date.now()}`,
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
  };
  const share = await api(instructorAuth.token, 'POST', '/api/v1/sharequiz', shareBody);
  if (share.status >= 400) {
    return { step: 'sharequiz', ...share };
  }
  const quizId = share.data?.quiz_id;
  const sessionId = share.data?.session_id ?? share.data?.classroom_id;
  return {
    step: 'sharequiz',
    ...share,
    fixture: redactDeep({ topic, quizId, sessionId, classroomId }),
  };
}

async function runStudentSubmissionMatrix(studentAuth, fixture) {
  if (!fixture?.quizId || !fixture?.sessionId) {
    return { skipped: true, reason: 'no fixture quiz/session from instructor step' };
  }
  const studentId = studentAuth.userId;
  const quizId = fixture.quizId;
  const sessionId = fixture.sessionId;
  const steps = [];

  const attemptsBefore = await api(
    studentAuth.token,
    'GET',
    `/api/v1/dashboard/quiz-attempts?student_id=${studentId}&quiz_id=${quizId}&class_id=${sessionId}`,
  );
  steps.push({ name: 'quiz_attempts_before', ...attemptsBefore });

  const createAttempt = await api(studentAuth.token, 'POST', '/api/v1/dashboard/quiz-attempts', {
    quiz_id: Number(quizId),
    student_id: studentId,
    class_id: sessionId,
    started_at: new Date().toISOString(),
    status: 'in_progress',
  });
  steps.push({ name: 'create_attempt', ...createAttempt });

  const attemptId =
    createAttempt.data?.id ??
    createAttempt.data?.attempt_id ??
    createAttempt.data?.data?.id;

  const checkpoint = {
    version: 1,
    userId: studentId,
    quizId: String(quizId),
    sessionId,
    attemptId,
    attemptUpdated: false,
    startedAt: new Date().toISOString(),
    selectedAnswers: { 0: '4' },
    scorePercent: 100,
    questionCount: 1,
  };

  steps.push({
    name: 'simulated_client_interrupt_after_attempt',
    note: 'Checkpoint persisted locally in app; script holds in-memory snapshot only',
    checkpoint: redactDeep(checkpoint),
  });

  if (attemptId) {
    const putAttempt = await api(
      studentAuth.token,
      'PUT',
      `/api/v1/dashboard/quiz-attempts/${attemptId}`,
      {
        status: 'completed',
        score: 100,
        completed_at: new Date().toISOString(),
        time_spent: 12,
      },
    );
    steps.push({ name: 'put_attempt_completed', ...putAttempt });
    checkpoint.attemptUpdated = true;
  }

  const submission = await api(studentAuth.token, 'POST', '/api/v1/dashboard/quiz-submissions', {
    quiz_id: Number(quizId),
    student_id: studentId,
    classroom_id: sessionId,
    score: 100,
    summary: 'matrix verify',
    submitted_at: new Date().toISOString(),
    log_data: {
      answers: { 0: '4' },
      question_results: { 0: true },
      question_count: 1,
    },
  });
  steps.push({ name: 'post_quiz_submissions', ...submission });

  const attended = await api(
    studentAuth.token,
    'GET',
    `/api/v1/dashboard/attended-quiz?student_id=${studentId}&session_id=${sessionId}&quiz_id=${quizId}`,
  );
  steps.push({ name: 'attended_quiz_after_submit', ...attended });

  const completedList = await api(studentAuth.token, 'POST', '/api/v1/quiz/check-record', {
    p_check_type: 'completed',
    p_student_id: studentId,
    p_session_id: '',
  });
  steps.push({
    name: 'check_record_completed_visibility',
    status: completedList.status,
    data: summarizeCheckRecord(completedList.data),
  });

  steps.push({
    name: 'recovery_restart_note',
    note:
      'Mobile re-reads checkpoint via quizSubmissionCheckpoint.ts then resumes PUT/POST; matrix validates server state after full POST.',
    postInterruptCheckpoint: redactDeep({ ...checkpoint, attemptUpdated: true, immutable: true }),
  });

  return { steps };
}

async function main() {
  const cfg = loadConfig();
  const report = {
    verifiedAt: new Date().toISOString(),
    apiBase: getDevApiBase(),
    status: 'pending_credentials',
    limitations: [],
    instructor: null,
    student: null,
  };

  if (!cfg?.accounts?.instructor?.username || !cfg?.accounts?.student?.username) {
    report.limitations.push(
      'Create .dev-api-credentials.local.json with instructor + student accounts to execute live matrix.',
    );
    const out = join(repoRoot, 'docs', 'development', 'e2e-fixtures', 'submission-matrix-redacted.json');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`Wrote ${out} (credentials missing)`);
    process.exit(2);
  }

  const instructorAuth = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );
  const studentAuth = await loginDevApi(
    cfg.accounts.student.username,
    cfg.accounts.student.password,
  );

  report.status = 'executed';
  report.instructor = {
    role: instructorAuth.role,
    identityConfirmed: instructorAuth.userId !== 'unknown',
    createFixture: await createDisposableQuiz(instructorAuth, cfg),
  };

  const fixture = report.instructor.createFixture?.fixture;
  report.student = {
    role: studentAuth.role,
    username: studentAuth.username,
    identityConfirmed: studentAuth.userId !== 'unknown',
    matrix: await runStudentSubmissionMatrix(studentAuth, fixture),
  };

  if (cfg.disposableQuiz?.targetStudentUsername && cfg.disposableQuiz.targetStudentUsername !== studentAuth.username) {
    report.limitations.push(
      `Student login (${studentAuth.username}) does not match configured target ${cfg.disposableQuiz.targetStudentUsername}; assignment visibility for that user was not verified.`,
    );
  }

  const out = join(repoRoot, 'docs', 'development', 'e2e-fixtures', 'submission-matrix-redacted.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`Wrote ${out}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
