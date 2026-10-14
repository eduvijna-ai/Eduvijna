#!/usr/bin/env node
/**
 * One targeted installed closure pass: structural API probe → cooldown → UI cases (stop on first fail).
 * Does not run attended-quiz during structural probe (set FIXTURE_PROBE_ATTENDED=1 only for saved-result diagnosis).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const COOLDOWN_MS = Number(process.env.FIXTURE_UI_COOLDOWN_MS || 120_000);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runNode(script, args = [], label) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(node, [join(repoRoot, 'scripts', script), ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      FIXTURE_PROBE_ATTENDED: process.env.FIXTURE_PROBE_ATTENDED || '0',
    },
  });
  return r.status ?? 1;
}

const probeStatus = runNode('engineering-fixture-readiness-probe.mjs', [], 'structural_fixture_probe');
if (probeStatus !== 0) {
  console.error('Blocked: structural fixture/API readiness failed.');
  process.exit(probeStatus);
}

console.log(`\n=== api_ui_cooldown ${COOLDOWN_MS}ms ===`);
await sleep(COOLDOWN_MS);

const sequence = [
  ['engineering-maestro-login-proof.mjs', ['student'], 'maestro_student_login'],
  ['engineering-student-fixture-ui.mjs', [], 'student_saved_result'],
  ['engineering-instructor-fixture-ui.mjs', [], 'instructor_saved_result'],
  ['engineering-deep-link-smoke.mjs', [], 'deep_link_smoke'],
  ['engineering-notifications-route-smoke.mjs', [], 'notifications_route'],
];

for (const [script, args, label] of sequence) {
  const status = runNode(script, args, label);
  if (status !== 0) {
    console.error(`Stopped after first failure: ${label}`);
    process.exit(status);
  }
}

process.exit(0);
