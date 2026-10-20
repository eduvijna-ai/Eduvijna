/**
 * Source/API checks for submission persistence + document provider parity
 * (no device required). Redacts tokens and credentials.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { FIXTURE } from './lib/founder-fixture.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, '.stack-validation-logs', 'review-api-probes-20261018');
mkdirSync(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function jsonFetch(url, opts = {}) {
  const started = Date.now();
  const res = await fetch(url, opts);
  let body;
  try {
    body = await res.json();
  } catch {
    body = { _parse: 'non_json' };
  }
  return {
    status: res.status,
    elapsedMs: Date.now() - started,
    retryAfter: res.headers.get('retry-after'),
    message: body?.detail || body?.message || body?.error || null,
    keys: body && typeof body === 'object' ? Object.keys(body).slice(0, 16) : [],
    rowHint: Array.isArray(body?.result)
      ? body.result.length
      : Array.isArray(body?.data)
        ? body.data.length
        : Array.isArray(body?.items)
          ? body.items.length
          : null,
  };
}

async function main() {
  const credPath = resolveDevApiCredentialsPath(repoRoot);
  const cfg = JSON.parse(readFileSync(credPath, 'utf8'));
  const base = getDevApiBase();
  const student = await loginDevApi(cfg.accounts.student.username, cfg.accounts.student.password);
  await sleep(800);
  const instructor = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );

  const studentAuth = { Authorization: `Bearer ${student.token}`, 'Content-Type': 'application/json' };
  const instructorAuth = {
    Authorization: `Bearer ${instructor.token}`,
    'Content-Type': 'application/json',
  };

  const steps = [];

  steps.push({
    name: 'student_check_record_pending',
    ...(await jsonFetch(`${base}/api/v1/quiz/check-record`, {
      method: 'POST',
      headers: studentAuth,
      body: JSON.stringify({
        p_student_id: String(FIXTURE.studentId),
        p_session_id: null,
        p_check_type: 'pending',
      }),
    })),
  });
  await sleep(1200);

  steps.push({
    name: 'student_check_record_fixture_session',
    ...(await jsonFetch(`${base}/api/v1/quiz/check-record`, {
      method: 'POST',
      headers: studentAuth,
      body: JSON.stringify({
        p_student_id: String(FIXTURE.studentId),
        p_session_id: FIXTURE.sessionId,
        p_check_type: 'status',
      }),
    })),
  });
  await sleep(1200);

  const attemptQ = new URLSearchParams({
    class_id: FIXTURE.sessionId,
    student_id: FIXTURE.studentId,
  });
  steps.push({
    name: 'dashboard_quiz_attempts_session_scoped',
    ...(await jsonFetch(`${base}/api/v1/dashboard/quiz-attempts?${attemptQ}`, {
      headers: studentAuth,
    })),
  });
  await sleep(1200);

  const attendedQ = new URLSearchParams({
    student_id: FIXTURE.studentId,
    classroom_id: FIXTURE.classroomId,
    session_id: FIXTURE.sessionId,
    quiz_id: String(FIXTURE.quizId),
  });
  steps.push({
    name: 'attended_quiz_fixture',
    ...(await jsonFetch(`${base}/api/v1/dashboard/attended-quiz?${attendedQ}`, {
      headers: instructorAuth,
    })),
  });
  await sleep(1500);

  // Document / Mathpix provider probes — capture status for same instructor token (mobile-shaped).
  // Endpoints match mobile documentUploadApi + Quiz-React HandwrittenWorkspace (web contract).
  const docProbes = [
    {
      name: 'mobile_web_batch_ocr_upload_empty',
      method: 'POST',
      url: `${base}/api/v1/batch-ocr-upload`,
      body: null,
      rawBody: new FormData(),
    },
    {
      name: 'mobile_shaped_generate_strict_probe',
      method: 'POST',
      url: `${base}/api/v1/quiz/generate-strict`,
      body: { dry_run: true, source: 'probe' },
    },
    {
      name: 'mobile_shaped_assessment_multimodal_probe',
      method: 'POST',
      url: `${base}/api/v1/assessment/generate-multimodal`,
      body: { dry_run: true, source: 'probe' },
    },
    {
      name: 'mobile_shaped_generate_from_book_probe',
      method: 'POST',
      url: `${base}/api/v1/study-materials/generate-from-book`,
      body: { dry_run: true, source: 'probe' },
    },
  ];

  for (const probe of docProbes) {
    const headers = { ...instructorAuth };
    let body;
    if (probe.rawBody) {
      delete headers['Content-Type'];
      body = probe.rawBody;
    } else {
      body = JSON.stringify(probe.body);
    }
    steps.push({
      name: probe.name,
      endpoint: probe.url.replace(base, ''),
      ...(await jsonFetch(probe.url, {
        method: probe.method,
        headers,
        body,
      })),
    });
    await sleep(1500);
  }

  const report = {
    api: base,
    fixture: {
      quizId: FIXTURE.quizId,
      studentId: FIXTURE.studentId,
      attemptId: FIXTURE.attemptId,
      sessionId: FIXTURE.sessionId,
    },
    studentUserId: student.userId,
    instructorUserId: instructor.userId,
    steps,
    interpretation: {
      submissionPersistence:
        'API read-back of fixture attempt/attended-quiz only; live submit+reopen still requires OPPO.',
      mathpixProvider:
        'Probe captures mobile-shaped endpoint status/messages. Compare to successful browser Network tab for same mode before declaring backend-only.',
    },
  };

  const outPath = join(outDir, 'submission-document-live.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
