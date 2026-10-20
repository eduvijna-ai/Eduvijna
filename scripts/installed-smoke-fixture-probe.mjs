/**
 * Redacted dev-api fixture ownership probe for installed smoke (no password logging).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { redactDeep } from './lib/trace-redact.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const FIX = {
  quizId: 479,
  sessionId: 'a6882262-5c50-4cf5-a4a8-dc8786862916',
  studentId: '70',
  attemptId: 207,
  metrics: '60%, 6/10',
};

async function apiGet(token, path) {
  const res = await fetch(`${getDevApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _preview: text.slice(0, 120) };
  }
  return { status: res.status, data: redactDeep(data) };
}

async function apiPost(token, path, body) {
  const res = await fetch(`${getDevApiBase()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _preview: text.slice(0, 120) };
  }
  return { status: res.status, data: redactDeep(data) };
}

function pickStudentAttemptFromQuizRow(quizRow, studentId, attemptId) {
  if (!quizRow) return null;
  let attempts = quizRow.attempts;
  if (typeof attempts === 'string') {
    try {
      attempts = JSON.parse(attempts);
    } catch {
      attempts = null;
    }
  }
  if (!Array.isArray(attempts)) return null;
  return (
    attempts.find(
      (a) =>
        String(a.student_id) === String(studentId) &&
        String(a.attempt_id ?? a.id) === String(attemptId),
    ) ||
    attempts.find((a) => String(a.student_id) === String(studentId)) ||
    null
  );
}

async function main() {
  const { accounts } = JSON.parse(readFileSync(credFile, 'utf8'));
  const outDir = join(
    repoRoot,
    '.stack-validation-logs',
    'engineering-installed-smoke',
    `fixture-ownership-probe-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
  );
  mkdirSync(outDir, { recursive: true });

  const report = {
    probedAt: new Date().toISOString(),
    apiBase: getDevApiBase(),
    fixture: FIX,
    accounts: {},
  };

  const studentAcct = accounts.student;
  const studentSession = await loginDevApi(studentAcct.username, studentAcct.password);
  const studentProfile = await apiGet(studentSession.token, '/api/v1/auth/profile');
  const sid = studentSession.userId;

  report.accounts.student = {
    username: studentSession.username,
    role: studentSession.role,
    userId: sid,
    profileStatus: studentProfile.status,
    studentIdMatchesFixture70: String(sid) === String(FIX.studentId),
  };

  const completed = await apiPost(studentSession.token, '/api/v1/quiz/check-record', {
    p_check_type: 'completed',
    p_student_id: sid,
    p_session_id: '',
  });
  const rows = completed.data?.result || [];
  const exact = rows.find(
    (r) =>
      String(r?.quiz_details?.quiz_id) === String(FIX.quizId) &&
      r?.quiz_details?.session_id === FIX.sessionId,
  );
  const sessionOnly = rows.find((r) => r?.quiz_details?.session_id === FIX.sessionId);

  report.studentCompletedCheckRecord = {
    status: completed.status,
    rowCount: rows.length,
    exactQuiz479SessionMatch: Boolean(exact),
    sessionOnlyQuizId: sessionOnly?.quiz_details?.quiz_id ?? null,
  };

  const attended = await apiGet(
    studentSession.token,
    `/api/v1/dashboard/attended-quiz?student_id=${sid}&session_id=${FIX.sessionId}&quiz_id=${FIX.quizId}`,
  );
  report.studentAttendedQuiz = {
    status: attended.status,
    score: attended.data?.score ?? attended.data?.data?.score ?? null,
    correct: attended.data?.correct_answers ?? attended.data?.data?.correct_answers ?? null,
    total: attended.data?.total_questions ?? attended.data?.data?.total_questions ?? null,
  };

  const attempts = await apiGet(
    studentSession.token,
    `/api/v1/dashboard/quiz-attempts?student_id=${sid}&quiz_id=${FIX.quizId}&class_id=${FIX.sessionId}`,
  );
  report.studentQuizAttemptsList = {
    status: attempts.status,
    attemptIds: Array.isArray(attempts.data?.data)
      ? attempts.data.data.map((a) => a.attempt_id ?? a.id).filter(Boolean)
      : [],
  };

  const instructorAcct = accounts.instructor;
  const instructorSession = await loginDevApi(instructorAcct.username, instructorAcct.password);
  const instructorProfile = await apiGet(instructorSession.token, '/api/v1/auth/profile');
  report.accounts.instructor = {
    username: instructorSession.username,
    role: instructorSession.role,
    userId: instructorSession.userId,
    profileStatus: instructorProfile.status,
  };

  const quizzesRes = await fetch(
    `${getDevApiBase()}/api/v1/dashboard/quizzes?view_type=all&limit=1000&offset=0`,
    { headers: { Authorization: `Bearer ${instructorSession.token}` } },
  );
  const quizzesRaw = await quizzesRes.json();
  const arr = Array.isArray(quizzesRaw?.data) ? quizzesRaw.data : [];
  const quizRow = arr.find((q) => Number(q.quiz_id) === Number(FIX.quizId));
  const attempt = pickStudentAttemptFromQuizRow(quizRow, FIX.studentId, FIX.attemptId);

  report.instructorQuiz479 = {
    summaryStatus: quizzesRes.status,
    quizRowFound: Boolean(quizRow),
    quizTitle: quizRow?.quiz_name ?? quizRow?.topic ?? null,
    student70Attempt207: attempt
      ? {
          attempt_id: attempt.attempt_id ?? attempt.id,
          score: attempt.score,
          correct_count: attempt.correct_count ?? attempt.correct_answers,
          question_count:
            attempt.question_count ?? attempt.total_questions ?? attempt.questions_count,
        }
      : null,
  };

  report.disposition = {
    studentSmokeUsesFixture479:
      report.studentCompletedCheckRecord.exactQuiz479SessionMatch &&
      report.accounts.student.studentIdMatchesFixture70,
    instructorVerificationUses479_70_207: Boolean(report.instructorQuiz479.student70Attempt207),
  };

  writeFileSync(join(outDir, 'fixture-ownership-redacted.json'), JSON.stringify(report, null, 2));
  console.log(`Wrote ${join(outDir, 'fixture-ownership-redacted.json')}`);
  console.log(
    JSON.stringify(
      {
        studentIdMatches70: report.accounts.student.studentIdMatchesFixture70,
        student479Owned: report.studentCompletedCheckRecord.exactQuiz479SessionMatch,
        instructorAttempt: report.instructorQuiz479.student70Attempt207,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(String(err.message || err));
  process.exit(1);
});
