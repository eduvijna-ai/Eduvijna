/**
 * Reconcile check-record callers: probe, completed UI path, deep-link quiz fetch.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const SESSION = 'a6882262-5c50-4cf5-a4a8-dc8786862916';
const STUDENT = '70';

const { accounts } = JSON.parse(readFileSync(join(repoRoot, '.dev-api-credentials.local.json'), 'utf8'));
const student = await loginDevApi(accounts.student.username, accounts.student.password);
const base = getDevApiBase();

async function postCheck(body) {
  const res = await fetch(`${base}/api/v1/quiz/check-record`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${student.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return {
    request: body,
    status: res.status,
    rowCount: Array.isArray(json.result) ? json.result.length : json.result,
    check_type: json.check_type,
    message: json.message,
  };
}

async function getQuiz(sessionId) {
  const res = await fetch(`${base}/api/v1/quiz?session_id=${sessionId}&skip_auth=true`, {
    headers: { Authorization: `Bearer ${student.token}` },
  });
  const json = await res.json();
  return {
    status: res.status,
    success: json.success,
    hasQuizData: Boolean(json.quiz_data),
    message: json.message,
  };
}

const out = {
  probedAt: new Date().toISOString(),
  failingProbeCompletedEmptySession: await postCheck({
    p_check_type: 'completed',
    p_student_id: STUDENT,
    p_session_id: '',
  }),
  workingUiPendingBulk: await postCheck({
    p_check_type: 'pending',
    p_student_id: STUDENT,
    p_session_id: '',
  }),
  documentedSessionRecord: await postCheck({
    p_student_id: STUDENT,
    p_session_id: SESSION,
  }),
  documentedSessionStatus: await postCheck({
    p_check_type: 'status',
    p_student_id: STUDENT,
    p_session_id: SESSION,
  }),
  deepLinkQuizFetch: await getQuiz(SESSION),
  whyStudentUiPasses:
    'Assessments Completed tab loads pending-scope check-record rows; client classifies completed assignments (checkRecordRowEffectiveStatus) and hydrates metrics — not the empty completed bulk call with empty session_id.',
};

const dir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `check-record-callers-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'callers-redacted.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
