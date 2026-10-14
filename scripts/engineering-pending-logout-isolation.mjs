/**
 * Persisted openquiz: explicit logout must clear storage so a plain relaunch does not replay.
 * Does not repeat the full signed-out cold URI → login → results probe.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createEmulatorLoginHarness } from './lib/emulator-login-harness.mjs';
import { performUiLogout } from './lib/ui-logout-harness.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const h = createEmulatorLoginHarness();
const pkg = 'com.eduvijna.app';
const uri =
  'eduvijna://openquiz?session_id=a6882262-5c50-4cf5-a4a8-dc8786862916&quiz_id=479';
const harnessSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' })
  .stdout?.trim();

const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `pending-logout-isolation-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
mkdirSync(evidenceDir, { recursive: true });

const steps = [];

function coldUri() {
  const shellCmd = `am start -W -a android.intent.action.VIEW -d '${uri.replace(/'/g, `'\\''`)}' ${pkg}/.MainActivity`;
  return spawnSync('adb', ['-s', h.device, 'shell', shellCmd], { encoding: 'utf8' });
}

function isLoginGate(xml) {
  return /login-email-input|content-desc="Sign in"/.test(xml);
}

function isResults(xml) {
  return /60%/.test(xml) && /6\/10|6 of 10/i.test(xml);
}

// Seed pending via signed-out cold link + inplace login (minimal path).
h.adb(`shell pm clear ${pkg}`);
h.sleep(2500);
coldUri();
h.sleep(8000);
let xml = h.dumpUi();
writeFileSync(join(evidenceDir, '01-signed-out-gate.xml'), xml);
steps.push({ step: 'cold_uri_signed_out', loginGate: isLoginGate(xml) });

const maestro = spawnSync(
  process.execPath,
  [join(repoRoot, 'scripts', 'engineering-maestro-login-proof.mjs'), '--inplace', 'student'],
  { cwd: repoRoot, encoding: 'utf8', env: process.env },
);
steps.push({ step: 'maestro_inplace_student', ok: maestro.status === 0 });

let seededResults = false;
for (let i = 0; i < 20; i++) {
  xml = h.dumpUi();
  if (isResults(xml)) {
    seededResults = true;
    break;
  }
  if (/rate-limiting requests/i.test(xml)) {
    h.adb('shell input tap 540 1200');
    h.sleep(2000);
  }
  h.sleep(3000);
}
writeFileSync(join(evidenceDir, '02-after-seed.xml'), xml);
steps.push({ step: 'seeded_results', ok: seededResults });

const logout = performUiLogout({
  adb: h.adb,
  sleep: h.sleep,
  dumpUi: h.dumpUi,
  dismissPostLoginInterstitials: h.dismissPostLoginInterstitials,
  authenticatedMarker: h.authenticatedMarker,
});
writeFileSync(join(evidenceDir, '03-after-logout.xml'), h.dumpUi());
steps.push({ step: 'ui_logout', ok: logout.ok, reason: logout.reason });

h.adb(`shell am force-stop ${pkg}`);
h.sleep(1500);
h.adb(`shell monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
h.sleep(8000);
xml = h.dumpUi();
writeFileSync(join(evidenceDir, '04-plain-relaunch-no-uri.xml'), xml);
const noReplay = isLoginGate(xml) && !isResults(xml);
steps.push({ step: 'plain_relaunch_no_replay', ok: noReplay });

const pass = seededResults && logout.ok && noReplay;
const results = {
  pass,
  harnessSha,
  steps,
  evidenceDir,
  note:
    'Maestro stopApp/launchApp drops in-memory pending; AsyncStorage survives process stop but must clear on logout.',
};
writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
process.exit(pass ? 0 : 1);
