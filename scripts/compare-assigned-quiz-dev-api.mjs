/**
 * Optional dev-api trace capture for mobile vs reference parity doc.
 * Usage: EDUVIJNA_DEV_USERNAME=... EDUVIJNA_DEV_PASSWORD=... node scripts/compare-assigned-quiz-dev-api.mjs
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.EDUVIJNA_API_BASE || 'https://dev-api.eduvijna.com';
const username = process.env.EDUVIJNA_DEV_USERNAME;
const password = process.env.EDUVIJNA_DEV_PASSWORD;

if (!username || !password) {
  console.error('Set EDUVIJNA_DEV_USERNAME and EDUVIJNA_DEV_PASSWORD to capture live traces.');
  process.exit(1);
}

async function login() {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`login ${res.status}`);
  const body = await res.json();
  const token = body.access_token || body.token;
  if (!token) throw new Error('no access token in login response');
  return { token, userId: String(body.user?.id ?? body.user_id ?? '') };
}

async function apiGet(token, path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text.slice(0, 500);
  }
  return { status: res.status, data };
}

async function apiPost(token, path, body) {
  const res = await fetch(`${API}${path}`, {
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
    data = text.slice(0, 500);
  }
  return { status: res.status, data };
}

async function main() {
  const { token, userId } = await login();
  const traces = { probedAt: new Date().toISOString(), apiBase: API, userId, steps: [] };

  const pending = await apiPost(token, '/api/v1/quiz/check-record', {
    p_check_type: 'pending',
    p_student_id: userId,
    p_session_id: '',
  });
  traces.steps.push({ name: 'check-record pending', ...pending });

  const completed = await apiPost(token, '/api/v1/quiz/check-record', {
    p_check_type: 'completed',
    p_student_id: userId,
    p_session_id: '',
  });
  traces.steps.push({ name: 'check-record completed', ...completed });

  const sampleRow =
    completed.data?.result?.[0] || pending.data?.result?.[0];
  const sample = sampleRow?.quiz_details
    ? {
        quiz_id: sampleRow.quiz_details.quiz_id,
        session_id: sampleRow.quiz_details.session_id,
      }
    : sampleRow;
  if (sample?.quiz_id && sample?.session_id) {
    const attempts = await apiGet(
      token,
      `/api/v1/dashboard/quiz-attempts?student_id=${userId}&quiz_id=${sample.quiz_id}&class_id=${sample.session_id}`,
    );
    traces.steps.push({ name: 'quiz-attempts', quizId: sample.quiz_id, sessionId: sample.session_id, ...attempts });

    const attended = await apiGet(
      token,
      `/api/v1/dashboard/attended-quiz?student_id=${userId}&session_id=${sample.session_id}&quiz_id=${sample.quiz_id}`,
    );
    traces.steps.push({ name: 'attended-quiz', ...attended });
  }

  const out = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'docs',
    'development',
    'e2e-fixtures',
    'mobile-quiz-react-parity-traces.json',
  );
  writeFileSync(out, JSON.stringify(traces, null, 2));
  console.log('Wrote', out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
