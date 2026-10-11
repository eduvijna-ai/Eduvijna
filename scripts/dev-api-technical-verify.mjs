/**
 * Multi-account dev-api technical verification (redacted output only).
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
          classroom_id: row.classroom_id,
          classroom_name: row.classroom_name,
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

async function fetchRaw(token, method, path, body) {
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
    data = { _preview: text.slice(0, 120) };
  }
  return { status: res.status, data };
}

function selectProbeTarget(pendingRaw, completedRaw) {
  const pick = (rows) =>
    (rows ?? []).find((row) => row.quiz_details?.quiz_id && row.quiz_details?.session_id);
  const fromCompleted = pick(completedRaw?.result);
  if (fromCompleted) {
    return {
      quiz_id: fromCompleted.quiz_details.quiz_id,
      session_id: fromCompleted.quiz_details.session_id,
      source: 'completed',
    };
  }
  const fromPending = pick(pendingRaw?.result);
  if (fromPending) {
    return {
      quiz_id: fromPending.quiz_details.quiz_id,
      session_id: fromPending.quiz_details.session_id,
      source: 'pending',
    };
  }
  return null;
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

  const profileRaw = await fetchRaw(auth.token, 'GET', '/api/v1/auth/profile');
  block.checks.push({
    name: 'auth_profile',
    status: profileRaw.status,
    data: summarizeApiBody(profileRaw.data),
  });

  if (auth.role === 'student') {
    const pendingRaw = await fetchRaw(auth.token, 'POST', '/api/v1/quiz/check-record', {
      p_check_type: 'pending',
      p_student_id: auth.userId,
      p_session_id: '',
    });
    block.checks.push({
      name: 'check_record_pending',
      status: pendingRaw.status,
      data: summarizeApiBody(pendingRaw.data),
      rowCount: pendingRaw.data?.result?.length ?? 0,
    });

    const completedRaw = await fetchRaw(auth.token, 'POST', '/api/v1/quiz/check-record', {
      p_check_type: 'completed',
      p_student_id: auth.userId,
      p_session_id: '',
    });
    block.checks.push({
      name: 'check_record_completed',
      status: completedRaw.status,
      data: summarizeApiBody(completedRaw.data),
      rowCount: completedRaw.data?.result?.length ?? 0,
    });

    const classesRaw = await fetchRaw(
      auth.token,
      'GET',
      '/api/v1/dashboard/quizzes?view_type=classes&limit=50&offset=0',
    );
    block.checks.push({
      name: 'student_classrooms_classes_view',
      status: classesRaw.status,
      data: summarizeApiBody(classesRaw.data),
    });

    const probe = selectProbeTarget(pendingRaw.data, completedRaw.data);
    if (probe) {
      block.checks.push({
        name: 'probe_target_selected',
        data: redactDeep(probe),
      });
      const attemptsRaw = await fetchRaw(
        auth.token,
        'GET',
        `/api/v1/dashboard/quiz-attempts?student_id=${auth.userId}&quiz_id=${probe.quiz_id}&class_id=${probe.session_id}`,
      );
      block.checks.push({
        name: 'quiz_attempts_list',
        status: attemptsRaw.status,
        data: summarizeApiBody(attemptsRaw.data),
        executedBecauseCheckRecordHadRows: true,
      });
      const attendedRaw = await fetchRaw(
        auth.token,
        'GET',
        `/api/v1/dashboard/attended-quiz?student_id=${auth.userId}&session_id=${probe.session_id}&quiz_id=${probe.quiz_id}`,
      );
      block.checks.push({
        name: 'attended_quiz_load',
        status: attendedRaw.status,
        data: summarizeApiBody(attendedRaw.data),
        executedBecauseCheckRecordHadRows: true,
      });
    } else {
      block.limitations.push(
        'No check-record rows with quiz_id + session_id; attempt/attended probes skipped.',
      );
    }
  } else if (auth.role === 'instructor' || auth.role === 'admin') {
    const summaryRaw = await fetchRaw(
      auth.token,
      'GET',
      '/api/v1/dashboard/quizzes?view_type=summary&limit=5&offset=0',
    );
    block.checks.push({
      name: 'teacher_dashboard_summary',
      status: summaryRaw.status,
      data: summarizeApiBody(summaryRaw.data),
    });
    const classroomsRaw = await fetchRaw(
      auth.token,
      'GET',
      '/api/v1/dashboard/quizzes?view_type=class_wise_students&limit=50&offset=0',
    );
    block.checks.push({
      name: 'classrooms_class_wise_students',
      status: classroomsRaw.status,
      data: summarizeApiBody(classroomsRaw.data),
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
      'Probe targets are chosen from raw check-record payloads before summarization.',
    ],
  };

  for (const account of accounts) {
    report.accounts.push(await verifyAccount(account));
  }

  const outDir = join(repoRoot, 'docs', 'development', 'e2e-fixtures');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, 'technical-verification-redacted.json');
  writeFileSync(out, JSON.stringify(redactDeep(report), null, 2));
  console.log(`Wrote ${out} (${report.accounts.length} account(s))`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
