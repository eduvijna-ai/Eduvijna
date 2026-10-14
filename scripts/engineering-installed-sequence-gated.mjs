#!/usr/bin/env node
/**
 * Run installed checks only after fixture-readiness probe passes.
 * Stops at first failing case.
 */
import { execSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;

function run(script, label) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(node, [join(repoRoot, 'scripts', script)], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'inherit',
    env: process.env,
  });
  return r.status ?? 1;
}

const probeStatus = run('engineering-fixture-readiness-probe.mjs', 'fixture_readiness');
if (probeStatus !== 0) {
  console.error('Blocked: fixture/API readiness failed — skipping installed UI sequence.');
  process.exit(probeStatus);
}
const cooldownMs = Number(process.env.FIXTURE_UI_COOLDOWN_MS || 0);
if (cooldownMs > 0) {
  console.log(`\n=== api_ui_cooldown ${cooldownMs}ms ===`);
  execSync(`"${process.execPath}" -e "setTimeout(function(){}, ${cooldownMs})"`, { stdio: 'inherit' });
}

const sequence = [
  ['engineering-maestro-login-proof.mjs', 'student', 'maestro_student_login'],
  ['engineering-deep-link-smoke.mjs', null, 'deep_link_smoke'],
];

for (const [script, arg, label] of sequence) {
  const args = arg ? [join(repoRoot, 'scripts', script), arg] : [join(repoRoot, 'scripts', script)];
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(node, args, { cwd: repoRoot, stdio: 'inherit', env: process.env });
  if ((r.status ?? 1) !== 0) {
    console.error(`Stopped after first failure: ${label}`);
    process.exit(r.status ?? 1);
  }
}

process.exit(0);
