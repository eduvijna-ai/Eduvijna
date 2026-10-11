/**
 * Read-only dev-api trace capture (record inspection — no quiz submission).
 *
 * Usage:
 *   EDUVIJNA_DEV_USERNAME=demo_samatha EDUVIJNA_DEV_PASSWORD=... node scripts/compare-assigned-quiz-dev-api.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLoginPayload, getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { redactDeep } from './lib/trace-redact.mjs';

const username = process.env.EDUVIJNA_DEV_USERNAME;
const password = process.env.EDUVIJNA_DEV_PASSWORD;

if (!username || !password) {
  console.error('Set EDUVIJNA_DEV_USERNAME and EDUVIJNA_DEV_PASSWORD (not printed).');
  process.exit(1);
}

async function parseResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _preview: String(text).slice(0, 200) };
  }
  return { status: res.status, data };
}

async function apiGet(token, path) {
  const res = await fetch(`${getDevApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { status, data } = await parseResponse(res);
  return { status, data, evidence: redactDeep(data) };
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
  const { status, data } = await parseResponse(res);
  return { status, data, evidence: redactDeep(data) };
}

function traceStep(_name, result) {
  return {
    status: result.status,
    data: result.evidence,
  };
}

async function main() {
  const session = await loginDevApi(username, password);
  const traces = {
    probedAt: new Date().toISOString(),
    apiBase: getDevApiBase(),
    mode: 'read_only_record_inspection',
    submissionParityExecuted: false,
    auth: {
      loginContract: 'POST /api/v1/auth/login',
      payloadFields: Object.keys(buildLoginPayload('x', 'y')),
      role: session.role,
      identityConfirmed: session.userId !== 'unknown',
    },
    quizReactParityNotes: {
      attemptClassIdEqualsSessionId: true,
      submissionClassroomIdEqualsSessionId: true,
      order: ['GET quiz-attempts', 'PUT quiz-attempts/{id}', 'POST quiz-submissions'],
    },
    steps: [],
  };

  const profile = await apiGet(session.token, '/api/v1/auth/profile');
  traces.steps.push(traceStep('auth_profile', profile));

  const studentIdForCheck = session.role === 'student' ? session.userId : session.userId;
  const checkBody = {
    p_check_type: 'pending',
    p_student_id: studentIdForCheck,
    p_session_id: '',
  };

  if (session.role !== 'student') {
    traces.steps.push({
      name: 'check-record pending',
      skipped: true,
      reason: `role=${session.role} may not use student check-record; student-only checks not executed`,
    });
    traces.steps.push({
      name: 'check-record completed',
      skipped: true,
      reason: 'student-only',
    });
  } else {
    const pending = await apiPost(session.token, '/api/v1/quiz/check-record', {
      ...checkBody,
      p_check_type: 'pending',
    });
    traces.steps.push(traceStep('check-record pending', pending));

    const completed = await apiPost(session.token, '/api/v1/quiz/check-record', {
      ...checkBody,
      p_check_type: 'completed',
    });
    traces.steps.push(traceStep('check-record completed', completed));

    const sampleRow = completed.data?.result?.[0] || pending.data?.result?.[0];
    const sample = sampleRow?.quiz_details
      ? {
          quiz_id: sampleRow.quiz_details.quiz_id,
          session_id: sampleRow.quiz_details.session_id,
        }
      : null;

    if (sample?.quiz_id && sample?.session_id) {
      const attempts = await apiGet(
        session.token,
        `/api/v1/dashboard/quiz-attempts?student_id=${studentIdForCheck}&quiz_id=${sample.quiz_id}&class_id=${sample.session_id}`,
      );
      traces.steps.push({ name: 'quiz-attempts list', operation: 'GET', ...traceStep('quiz-attempts list', attempts) });

      const attended = await apiGet(
        session.token,
        `/api/v1/dashboard/attended-quiz?student_id=${studentIdForCheck}&session_id=${sample.session_id}&quiz_id=${sample.quiz_id}`,
      );
      traces.steps.push({ name: 'attended-quiz load', operation: 'GET', ...traceStep('attended-quiz load', attended) });
    }
  }

  const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'development', 'e2e-fixtures');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, 'mobile-quiz-react-parity-traces.json');
  writeFileSync(out, JSON.stringify(traces, null, 2));
  console.log(`Wrote redacted trace to ${out} (role=${session.role})`);
}

main().catch((err) => {
  console.error(String(err.message || err));
  process.exit(1);
});
