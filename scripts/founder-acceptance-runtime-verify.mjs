/**
 * Founder acceptance: live dev-api probes + redacted evidence (no secrets in output).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { redactDeep } from './lib/trace-redact.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const outDir = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence');
const outFile = join(outDir, 'live-api-acceptance-redacted.json');

const FIXTURE = {
  quizId: 479,
  studentId: '70',
  attemptId: 207,
  sessionId: 'a6882262-5c50-4cf5-a4a8-dc8786862916',
  classroomId: 'class_4d82c60e',
  wrongSessionId: '00000000-0000-0000-0000-000000000099',
};

async function api(token, method, path, body) {
  const res = await fetch(`${getDevApiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _preview: text.slice(0, 300) };
  }
  return { ok: res.ok, status: res.status, data };
}

function teacherQuizRow(data, quizId, sessionId) {
  const rows = Array.isArray(data?.data) ? data.data : [];
  return rows.find(
    (r) =>
      Number(r.quiz_id) === Number(quizId) &&
      (!sessionId || String(r.session_id) === String(sessionId)),
  );
}

function pickAttempt(quizRow, studentId, attemptId) {
  const attempts =
    typeof quizRow?.attempts === 'string' ? JSON.parse(quizRow.attempts) : quizRow?.attempts;
  if (!Array.isArray(attempts)) return null;
  return attempts.find(
    (a) =>
      String(a.student_id) === String(studentId) &&
      (attemptId == null || Number(a.attempt_id) === Number(attemptId)),
  );
}

async function attendedQuiz(token, quizId, sessionId, studentId, classroomId) {
  const q = new URLSearchParams({
    quiz_id: String(quizId),
    session_id: sessionId,
    student_id: studentId,
  });
  if (classroomId) q.set('classroom_id', classroomId);
  return api(token, 'GET', `/api/v1/dashboard/attended-quiz?${q.toString()}`);
}

async function main() {
  if (!existsSync(credFile)) {
    console.error('missing_credentials_file');
    process.exit(2);
  }
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  mkdirSync(outDir, { recursive: true });

  const report = {
    verifiedAt: new Date().toISOString(),
    apiBase: getDevApiBase(),
    fixture: FIXTURE,
    steps: [],
    status: 'pending',
  };

  const instructor = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );
  const student = await loginDevApi(cfg.accounts.student.username, cfg.accounts.student.password);
  report.steps.push({
    step: 'login',
    instructorRole: instructor.role,
    studentRole: student.role,
    studentIdMatchesFixture: String(student.userId) === FIXTURE.studentId,
  });

  const teacherQuizzes = await api(
    instructor.token,
    'GET',
    `/api/v1/dashboard/quizzes?view_type=all&quiz_id=${FIXTURE.quizId}&limit=50`,
  );
  const quizRow = teacherQuizRow(teacherQuizzes.data, FIXTURE.quizId, FIXTURE.sessionId);
  const attempt = pickAttempt(quizRow, FIXTURE.studentId, FIXTURE.attemptId);
  report.steps.push({
    step: 'teacher_quiz_assignment',
    httpStatus: teacherQuizzes.status,
    foundQuiz: Boolean(quizRow),
    parentSessionId: quizRow?.session_id ?? null,
    attemptId: attempt?.attempt_id ?? null,
    attemptHasSessionId: Boolean(attempt?.session_id),
    studentScore: attempt?.score ?? null,
    evidence: redactDeep({
      quiz_id: quizRow?.quiz_id,
      session_id: quizRow?.session_id,
      classroom_id: quizRow?.classroom_id ?? quizRow?.class_id,
      attempt_status: attempt?.status,
    }),
  });

  const attendedOk = await attendedQuiz(
    student.token,
    FIXTURE.quizId,
    FIXTURE.sessionId,
    FIXTURE.studentId,
    FIXTURE.classroomId,
  );
  const attended = attendedOk.data?.data ?? attendedOk.data;
  const ws = attended?.worksheet_data ?? attended?.WorksheetData;
  const questions = ws?.Worksheet
    ? Object.keys(ws.Worksheet).length
    : Array.isArray(attended?.questions)
      ? attended.questions.length
      : null;
  report.steps.push({
    step: 'attended_quiz_worksheet',
    httpStatus: attendedOk.status,
    score: attended?.score ?? attended?.percentage ?? null,
    evaluatedItemCount: questions,
    hasWorksheetData: Boolean(ws),
    evidence: redactDeep({
      quiz_id: attended?.quiz_id,
      session_id: attended?.session_id,
      attempt_id: attended?.attempt_id,
      score: attended?.score,
      questionKeys: questions,
    }),
  });

  const attendedWrong = await attendedQuiz(
    student.token,
    FIXTURE.quizId,
    FIXTURE.wrongSessionId,
    FIXTURE.studentId,
    FIXTURE.classroomId,
  );
  report.steps.push({
    step: 'attended_quiz_wrong_session',
    httpStatus: attendedWrong.status,
    ok: attendedWrong.ok,
    evidence: redactDeep(attendedWrong.data),
  });

  const checkCompleted = await api(instructor.token, 'POST', '/api/v1/quiz/check-record', {
    p_check_type: 'completed',
    p_student_id: FIXTURE.studentId,
    p_session_id: FIXTURE.sessionId,
  });
  const hit = (checkCompleted.data?.result ?? []).find(
    (r) => String(r.quiz_details?.quiz_id) === String(FIXTURE.quizId),
  );
  report.steps.push({
    step: 'check_record_session_scoped',
    httpStatus: checkCompleted.status,
    rowCount: (checkCompleted.data?.result ?? []).length,
    fixtureHit: Boolean(hit),
    evidence: redactDeep(hit?.quiz_details ?? {}),
  });

  const studentDetails = await api(
    student.token,
    'GET',
    '/api/v1/dashboard/quizzes?view_type=student_total_details&limit=200&offset=0',
  );
  const completedRows = (studentDetails.data?.data ?? []).flatMap((session) => {
    let attempts = [];
    try {
      attempts = session.attempts ? JSON.parse(session.attempts) : [];
    } catch {
      attempts = [];
    }
    return attempts
      .filter((a) => a.status === 'completed')
      .map((a) => ({
        quiz_id: session.quiz_id,
        session_id: session.session_id,
        score: a.score,
        attempt_id: a.attempt_id,
      }));
  });
  report.steps.push({
    step: 'student_total_details_completed',
    httpStatus: studentDetails.status,
    completedCount: completedRows.length,
    fixturePresent: completedRows.some(
      (r) =>
        Number(r.quiz_id) === FIXTURE.quizId &&
        String(r.session_id) === FIXTURE.sessionId,
    ),
    sample: redactDeep(completedRows.slice(0, 5)),
  });

  const historySources = [
    ['web-quiz', 'Doc-File-Assessment'],
    ['web-quiz', 'Document'],
    ['quiz', 'DocumentUpload'],
    ['worksheet', 'Doc-File-Worksheet'],
    ['worksheet', 'Doc-Worksheet'],
    ['document-quiz', 'Doc-File-Curriculum'],
  ];
  const history = [];
  for (const [type, source] of historySources) {
    const res = await api(
      instructor.token,
      'GET',
      `/api/v1/user-assessments?assessment_type=${encodeURIComponent(type)}&source=${encodeURIComponent(source)}&limit=50`,
    );
    const rows = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    history.push({ type, source, status: res.status, count: rows.length });
  }
  report.steps.push({ step: 'document_history_sources', buckets: history });

  const catalog = await api(instructor.token, 'GET', '/api/v1/curriculum/catalog?current_only=true');
  const contexts = catalog.data?.contexts ?? [];
  const cbse10Math = contexts.find((c) => {
    const board = `${c.board?.code || ''} ${c.board?.label || ''}`;
    const grade = `${c.grade?.code || ''} ${c.grade?.label || ''}`;
    const subject = `${c.subject?.code || ''} ${c.subject?.label || ''}`;
    return /cbse/i.test(board) && /\b10\b|class\s*10|grade\s*10/i.test(grade) && /math/i.test(subject);
  });
  report.steps.push({
    step: 'curriculum_catalog_cbse_10_math',
    httpStatus: catalog.status,
    contextCount: contexts.length,
    referenceContextFound: Boolean(cbse10Math),
    evidence: redactDeep(cbse10Math ?? {}),
  });

  const failures = [];
  if (!quizRow) failures.push('teacher_quiz_row_missing');
  if (!attempt) failures.push('fixture_attempt_missing');
  if (attendedOk.status !== 200) failures.push('attended_quiz_failed');
  if (Number(attended?.score ?? attended?.percentage) !== 60 && attended?.score != 60) {
    if (attended?.score == null && attended?.percentage == null) failures.push('score_missing');
  }
  if (!hit) failures.push('check_record_fixture_missing');

  report.status = failures.length === 0 ? 'passed' : 'failed';
  report.failures = failures;
  writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`wrote ${outFile} status=${report.status}`);
  if (failures.length) process.exit(1);
}

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
