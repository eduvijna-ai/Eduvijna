/**
 * Multi-account dev-api technical verification (redacted output only).
 * Writes docs/development/e2e-fixtures/technical-verification-redacted.json
 *
 * Credentials via env or gitignored .dev-api-credentials.local.json at repo root:
 * { "accounts": { "admin": { "username", "password" }, "instructor": {...}, "student": {...} } }
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { redactDeep } from './lib/trace-redact.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');

function loadAccounts() {
  if (process.env.EDUVIJNA_DEV_USERNAME && process.env.EDUVIJNA_DEV_PASSWORD) {
    return [
      {
        label: process.env.EDUVIJNA_DEV_ACCOUNT_LABEL || 'env',
        username: process.env.EDUVIJNA_DEV_USERNAME,
        password: process.env.EDUVIJNA_DEV_PASSWORD,
      },
    ];
  }
  if (existsSync(credFile)) {
    const parsed = JSON.parse(readFileSync(credFile, 'utf8'));
    const accounts = parsed.accounts ?? {};
    return Object.entries(accounts).map(([label, cred]) => ({
      label,
      username: cred.username,
      password: cred.password,
    }));
  }
  return [];
}

function summarizeApiBody(data) {
  if (!data || typeof data !== 'object') {
    return redactDeep(data);
  }
  if (Array.isArray(data)) {
    return { length: data.length };
  }
  if (Array.isArray(data.data)) {
    return {
      meta: redactDeep(data.meta ?? {}),
      rowCount: data.data.length,
      sampleFields: data.data.slice(0, 2).map((row) =>
        redactDeep({
          availability_status: row.availability_status,
          has_time_limit: row.has_time_limit,
          quiz_status: row.quiz_status,
          student_status: row.student_status,
          question_count: row.question_count,
        }),
      ),
    };
  }
  if (Array.isArray(data.result)) {
    return {
      success: data.success,
      check_type: data.check_type,
      rowCount: data.result.length,
      sampleFields: data.result.slice(0, 2).map((row) =>
        redactDeep({
          status: row.status,
          quiz_id: row.quiz_details?.quiz_id,
          session_id: row.quiz_details?.session_id,
          has_time_limit: row.quiz_details?.has_time_limit,
          availability: row.quiz_details?.status,
        }),
      ),
    };
  }
  return redactDeep({
    role: data.role ?? data.role_name,
    is_active: data.is_active,
    is_verified: data.is_verified,
  });
}

async function getJson(token, path) {
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
  return { status: res.status, data: summarizeApiBody(data) };
}

async function postJson(token, path, body) {
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
  return { status: res.status, data: summarizeApiBody(data) };
}

async function verifyAccount({ label, username, password }) {
  const auth = await loginDevApi(username, password);
  const block = {
    accountLabel: label,
    auth: {
      contract: 'POST /api/v1/auth/login',
      role: auth.role,
      identityConfirmed: auth.userId !== 'unknown',
    },
    checks: [],
    limitations: [],
  };

  block.checks.push({
    name: 'auth_profile',
    ...(await getJson(auth.token, '/api/v1/auth/profile')),
  });

  if (auth.role === 'student') {
    const pending = await postJson(auth.token, '/api/v1/quiz/check-record', {
      p_check_type: 'pending',
      p_student_id: auth.userId,
      p_session_id: '',
    });
    block.checks.push({ name: 'check_record_pending', ...pending });

    const completed = await postJson(auth.token, '/api/v1/quiz/check-record', {
      p_check_type: 'completed',
      p_student_id: auth.userId,
      p_session_id: '',
    });
    block.checks.push({ name: 'check_record_completed', ...completed });

    const sample =
      completed.data?.result?.[0]?.quiz_details || pending.data?.result?.[0]?.quiz_details;
    if (sample?.quiz_id && sample?.session_id) {
      block.checks.push({
        name: 'quiz_attempts_list',
        ...(await getJson(
          auth.token,
          `/api/v1/dashboard/quiz-attempts?student_id=${auth.userId}&quiz_id=${sample.quiz_id}&class_id=${sample.session_id}`,
        )),
      });
      block.checks.push({
        name: 'attended_quiz_load',
        ...(await getJson(
          auth.token,
          `/api/v1/dashboard/attended-quiz?student_id=${auth.userId}&session_id=${sample.session_id}&quiz_id=${sample.quiz_id}`,
        )),
      });
    } else {
      block.limitations.push('No sample assignment row for attempt/attended probes.');
    }
  } else if (auth.role === 'instructor' || auth.role === 'admin') {
    block.checks.push({
      name: 'teacher_dashboard_summary',
      ...(await getJson(
        auth.token,
        '/api/v1/dashboard/quizzes?view_type=summary&limit=5&offset=0',
      )),
    });
    block.checks.push({
      name: 'classrooms_list',
      ...(await getJson(auth.token, '/api/v1/dashboard/classrooms?limit=5&offset=0')),
    });
  } else {
    block.limitations.push(`Unhandled role: ${auth.role}`);
  }

  return block;
}

async function main() {
  const accounts = loadAccounts();
  if (accounts.length === 0) {
    console.error(
      'Set EDUVIJNA_DEV_USERNAME/PASSWORD or create .dev-api-credentials.local.json (gitignored).',
    );
    process.exit(2);
  }

  const report = {
    verifiedAt: new Date().toISOString(),
    apiBase: getDevApiBase(),
    accounts: [],
    submissionParityExecuted: false,
    notes: [
      'Output is redacted; no tokens, credentials, or personal profile fields.',
      'Student submission/reopen/recovery matrix requires a disposable assigned quiz (Founder E2E).',
    ],
  };

  for (const account of accounts) {
    report.accounts.push(await verifyAccount(account));
  }

  const outDir = join(repoRoot, 'docs', 'development', 'e2e-fixtures');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, 'technical-verification-redacted.json');
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`Wrote ${out} (${report.accounts.length} account(s))`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
