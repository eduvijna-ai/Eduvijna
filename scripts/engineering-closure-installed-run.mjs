#!/usr/bin/env node
/**
 * Single closure installed pass @ harness HEAD (reuses verified APK 8b10562).
 * No attended-quiz preflight. Stops dependent result steps on 429; continues notifications when allowed.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { verifyEngineeringStudentSession } from './lib/verify-engineering-student-session.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `closure-installed-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
mkdirSync(evidenceDir, { recursive: true });

const report = {
  harnessGitHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout?.trim(),
  implementationSourceSha: '8b10562ff019fc7e883f9d9890629e4a037fa433',
  apkSha256: '64b3efa7294e5bb83f81c759937811bbba7d9ea6607e40ddb5876f2ca801fd46',
  apiSession: null,
  steps: [],
};

function run(script, args = [], envExtra = {}) {
  const r = spawnSync(node, [join(repoRoot, 'scripts', script), ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ENGINEERING_APK_IMPLEMENTATION_SHA: '8b10562',
      ENGINEERING_APK_SHA256: report.apkSha256,
      FIXTURE_PROBE_ATTENDED: '0',
      ...envExtra,
    },
  });
  return r.status ?? 1;
}

try {
  report.apiSession = await verifyEngineeringStudentSession();
} catch (e) {
  report.apiSession = { error: String(e.message || e) };
  writeFileSync(join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2));
  process.exit(1);
}

const maestroStatus = run('engineering-maestro-login-proof.mjs', ['student'], {
  DEV_API_CREDENTIALS_FILE: process.env.DEV_API_CREDENTIALS_FILE,
});
report.steps.push({ name: 'maestro_student_login', status: maestroStatus });
if (maestroStatus !== 0) {
  writeFileSync(join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2));
  process.exit(maestroStatus);
}

const studentStatus = run('engineering-student-fixture-ui.mjs', [], {
  ENGINEERING_SKIP_MAESTRO_LOGIN: '1',
});
report.steps.push({ name: 'student_saved_result', status: studentStatus });

function latestStudentResults() {
  const root = join(repoRoot, '.stack-validation-logs', 'engineering-installed-smoke');
  const dirs = readdirSync(root)
    .filter((d) => d.startsWith('student-fixture-ui-'))
    .map((d) => ({ d, m: statSync(join(root, d)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (!dirs[0]) return null;
  return JSON.parse(readFileSync(join(root, dirs[0].d, 'results.json'), 'utf8'));
}

const studentResults = latestStudentResults();
const rateLimited = studentResults?.resultsAssert?.rateLimited === true;
report.studentResults = studentResults
  ? { boundary: studentResults.boundary, resultsAssert: studentResults.resultsAssert }
  : null;
report.studentRateLimited = rateLimited;

if (studentStatus !== 0 && !rateLimited) {
  report.stoppedAt = 'student_saved_result';
  writeFileSync(join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2));
  process.exit(studentStatus);
}

if (!rateLimited) {
  const instructorStatus = run('engineering-instructor-fixture-ui.mjs', []);
  report.steps.push({ name: 'instructor_saved_result', status: instructorStatus });
  if (instructorStatus !== 0) {
    report.stoppedAt = 'instructor_saved_result';
    writeFileSync(join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2));
    process.exit(instructorStatus);
  }

  const deepStatus = run('engineering-deep-link-smoke.mjs', [], {
    ENGINEERING_SKIP_MAESTRO_LOGIN: '1',
  });
  report.steps.push({ name: 'deep_link_smoke', status: deepStatus });
  if (deepStatus !== 0) {
    report.stoppedAt = 'deep_link_smoke';
    writeFileSync(join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2));
    process.exit(deepStatus);
  }
} else {
  report.skippedDueToRateLimit = ['instructor_saved_result', 'deep_link_smoke'];
}

const notifStatus = run('engineering-notifications-route-smoke.mjs', []);
report.steps.push({ name: 'notifications_route', status: notifStatus });

report.pass = report.steps.every((s) => s.status === 0);
writeFileSync(join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
