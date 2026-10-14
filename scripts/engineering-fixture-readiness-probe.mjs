/**
 * Throttled dev-api fixture readiness probe (authorized student + instructor).
 * Records redacted params, HTTP status, response shape, Retry-After.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { FIXTURE } from './lib/founder-fixture.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const THROTTLE_MS = Number(process.env.FIXTURE_PROBE_THROTTLE_MS || 3500);
const WRONG_SESSION = '00000000-0000-4000-8000-000000000099';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function shape(value) {
  if (value == null) return { kind: 'null' };
  if (Array.isArray(value)) {
    return {
      kind: 'array',
      length: value.length,
      sampleKeys: value[0] && typeof value[0] === 'object' ? Object.keys(value[0]).slice(0, 12) : [],
    };
  }
  if (typeof value === 'object') {
    return { kind: 'object', keys: Object.keys(value).slice(0, 20) };
  }
  return { kind: typeof value };
}

async function callStep(name, fn) {
  const started = Date.now();
  const result = await fn();
  await sleep(THROTTLE_MS);
  return { name, elapsedMs: Date.now() - started, ...result };
}

async function postCheck(token, body) {
  const base = getDevApiBase();
  const res = await fetch(`${base}/api/v1/quiz/check-record`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const retryAfter = res.headers.get('retry-after');
  let json;
  try {
    json = await res.json();
  } catch {
    json = { _parse: 'non_json' };
  }
  const rows = Array.isArray(json?.result) ? json.result : [];
  const fixtureInPending = rows.some(
    (r) =>
      Number(r?.quiz_details?.quiz_id) === FIXTURE.quizId &&
      String(r?.quiz_details?.session_id) === FIXTURE.sessionId,
  );
  return {
    request: body,
    status: res.status,
    retryAfter,
    check_type: json?.check_type,
    message: json?.message,
    rowCount: rows.length,
    fixture479SessionInRows: fixtureInPending,
    resultShape: shape(json?.result),
    classification:
      res.status === 429
        ? 'rate_limited'
        : res.status === 401 || res.status === 403
          ? 'unauthorized'
          : !json?.result && res.status === 200
            ? 'malformed'
            : 'ok',
  };
}

function parseRetryAfterMs(retryAfter) {
  if (!retryAfter) return null;
  const n = Number(retryAfter);
  if (Number.isFinite(n) && n >= 0) return n * 1000;
  const t = Date.parse(retryAfter);
  if (Number.isFinite(t)) return Math.max(0, t - Date.now());
  return null;
}

async function getJson(token, path) {
  const base = getDevApiBase();
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const retryAfter = res.headers.get('retry-after');
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text.slice(0, 200) };
  }
  const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
  return {
    path: path.replace(FIXTURE.studentId, '[student]'),
    status: res.status,
    retryAfter,
    shape: shape(json),
    listLength: list.length,
    attemptIds: list
      .map((r) => r.id ?? r.attempt_id)
      .filter((id) => id != null)
      .slice(0, 8),
    classification:
      res.status === 429
        ? 'rate_limited'
        : res.status === 401 || res.status === 403
          ? 'unauthorized'
          : res.status >= 500
            ? 'server_error'
            : 'ok',
  };
}

async function getAttendedQuizWithBoundedRetries(token) {
  const path = `/api/v1/dashboard/attended-quiz?student_id=${FIXTURE.studentId}&session_id=${FIXTURE.sessionId}&quiz_id=${FIXTURE.quizId}`;
  const attempts = [];
  const maxAttempts = Number(process.env.FIXTURE_ATTENDED_MAX_ATTEMPTS || 4);
  for (let i = 0; i < maxAttempts; i += 1) {
    const result = await getJson(token, path);
    attempts.push({ attempt: i + 1, ...result });
    if (result.status === 200) {
      return { ...result, name: 'student_attended_quiz_fixture', retryAttempts: attempts };
    }
    if (result.status !== 429) {
      return { ...result, name: 'student_attended_quiz_fixture', retryAttempts: attempts };
    }
    const fromHeader = parseRetryAfterMs(result.retryAfter);
    const delayMs = fromHeader ?? Math.min(30_000, 2000 * 2 ** i);
    if (i < maxAttempts - 1) await sleep(delayMs);
  }
  const last = attempts[attempts.length - 1];
  return { ...last, name: 'student_attended_quiz_fixture', retryAttempts: attempts };
}

const { accounts } = JSON.parse(readFileSync(resolveDevApiCredentialsPath(repoRoot), 'utf8'));
const student = await loginDevApi(accounts.student.username, accounts.student.password);
const instructor = await loginDevApi(accounts.instructor.username, accounts.instructor.password);

const steps = [];
steps.push(
  await callStep('student_pending_bulk_assessments_path', () =>
    postCheck(student.token, {
      p_check_type: 'pending',
      p_student_id: FIXTURE.studentId,
      p_session_id: '',
    }),
  ),
);
steps.push(
  await callStep('student_completed_bulk_empty_session', () =>
    postCheck(student.token, {
      p_check_type: 'completed',
      p_student_id: FIXTURE.studentId,
      p_session_id: '',
    }),
  ),
);
steps.push(
  await callStep('student_check_record_session', () =>
    postCheck(student.token, {
      p_student_id: FIXTURE.studentId,
      p_session_id: FIXTURE.sessionId,
    }),
  ),
);
steps.push(
  await callStep('student_check_record_status', () =>
    postCheck(student.token, {
      p_check_type: 'status',
      p_student_id: FIXTURE.studentId,
      p_session_id: FIXTURE.sessionId,
    }),
  ),
);
steps.push(
  await callStep('student_attempts_class_id_fixture_session', () =>
    getJson(
      student.token,
      `/api/v1/dashboard/quiz-attempts?student_id=${FIXTURE.studentId}&quiz_id=${FIXTURE.quizId}&class_id=${FIXTURE.sessionId}`,
    ),
  ),
);
steps.push(
  await callStep('student_attempts_class_id_wrong_session_control', () =>
    getJson(
      student.token,
      `/api/v1/dashboard/quiz-attempts?student_id=${FIXTURE.studentId}&quiz_id=${FIXTURE.quizId}&class_id=${WRONG_SESSION}`,
    ),
  ),
);
steps.push(
  await callStep('student_attended_quiz_fixture', () => getAttendedQuizWithBoundedRetries(student.token)),
);

const filterApplied =
  steps.find((s) => s.name === 'student_attempts_class_id_fixture_session')?.listLength > 0 &&
  steps.find((s) => s.name === 'student_attempts_class_id_wrong_session_control')?.listLength === 0;

const sessionScopedFixture =
  steps.find((s) => s.name === 'student_check_record_session')?.fixture479SessionInRows === true;
const attendedStep = steps.find((s) => s.name === 'student_attended_quiz_fixture');
const attendedQuizOk = attendedStep?.status === 200;
const anyRateLimited = steps.some(
  (s) =>
    s.classification === 'rate_limited' ||
    s.status === 429 ||
    (Array.isArray(s.retryAttempts) && s.retryAttempts.some((a) => a.status === 429)),
);

const readiness = {
  probedAt: new Date().toISOString(),
  apiBase: getDevApiBase(),
  fixture: {
    quizId: FIXTURE.quizId,
    studentId: FIXTURE.studentId,
    attemptId: FIXTURE.attemptId,
    sessionId: '[redacted-session-uuid]',
  },
  steps,
  disposition: {
    assessmentsUsesPendingBulkNotCompletedBulkAlone: true,
    fixtureVisibleInPendingBulk: steps[0]?.fixture479SessionInRows === true,
    fixtureVisibleInSessionScopedCheckRecord: sessionScopedFixture,
    completedBulkEmptyDoesNotProveInvisibility: steps[1]?.rowCount === 0 && sessionScopedFixture,
    classIdSessionFilterApplied: filterApplied,
    attendedQuizOk,
    anyRateLimited,
  },
  readyForInstalledUi: sessionScopedFixture && filterApplied && attendedQuizOk,
};

const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `fixture-readiness-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
mkdirSync(evidenceDir, { recursive: true });
writeFileSync(join(evidenceDir, 'fixture-readiness-redacted.json'), JSON.stringify(readiness, null, 2));
console.log(JSON.stringify({ evidenceDir, readiness: readiness.disposition, ready: readiness.readyForInstalledUi }, null, 2));
process.exit(readiness.readyForInstalledUi ? 0 : 1);
