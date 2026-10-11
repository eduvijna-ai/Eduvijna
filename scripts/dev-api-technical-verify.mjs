/**
 * Founder/Cursor technical verification against dev-api (no secrets in output).
 * Writes docs/development/e2e-fixtures/technical-verification-redacted.json
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { redactDeep } from './lib/trace-redact.mjs';

const username = process.env.EDUVIJNA_DEV_USERNAME;
const password = process.env.EDUVIJNA_DEV_PASSWORD;

if (!username || !password) {
  console.error('Missing EDUVIJNA_DEV_USERNAME or EDUVIJNA_DEV_PASSWORD.');
  process.exit(2);
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
  return { status: res.status, data: redactDeep(data) };
}

async function main() {
  const auth = await loginDevApi(username, password);
  const report = {
    verifiedAt: new Date().toISOString(),
    apiBase: getDevApiBase(),
    auth: {
      contract: 'POST /api/v1/auth/login (username_or_email, password, remember_me, device_info, client_type)',
      role: auth.role,
      identityConfirmed: auth.userId !== 'unknown',
    },
    checks: [],
    limitations: [],
  };

  report.checks.push({
    name: 'profile',
    ...(await getJson(auth.token, '/api/v1/auth/profile')),
  });

  if (auth.role === 'instructor' || auth.role === 'admin') {
    report.checks.push({
      name: 'teacher_dashboard_summary',
      ...(await getJson(auth.token, '/api/v1/dashboard/quizzes?view_type=summary&limit=5&offset=0')),
    });
    report.limitations.push(
      'Account is not a student role; student check-record and attended-quiz student flows were not executed.',
    );
  } else if (auth.role === 'student') {
    const post = async (body) => {
      const res = await fetch(`${getDevApiBase()}/api/v1/quiz/check-record`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = redactDeep(await res.json().catch(() => ({})));
      return { status: res.status, data };
    };
    report.checks.push({
      name: 'check_record_pending',
      ...(await post({
        p_check_type: 'pending',
        p_student_id: auth.userId,
        p_session_id: '',
      })),
    });
  } else {
    report.limitations.push(`Unhandled role for automated matrix: ${auth.role}`);
  }

  const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'development', 'e2e-fixtures');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, 'technical-verification-redacted.json');
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`Wrote ${out}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
