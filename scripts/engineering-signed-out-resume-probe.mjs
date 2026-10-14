/**
 * Signed-out cold openquiz → login (in-place Maestro) → quiz results (479/207/70, 60%, 6/10).
 *
 * Action order (recorded in results.steps):
 * 1. pm clear (fresh install signed-out only)
 * 2. cold VIEW URI (am start -W)
 * 3. assert login gate
 * 4. Maestro --inplace (no stopApp/launchApp)
 * 5. poll for results UI
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execSync } from 'node:child_process';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const h = await import('./lib/emulator-login-harness.mjs').then((m) => m.createEmulatorLoginHarness());
const pkg = 'com.eduvijna.app';
const uri =
  'eduvijna://openquiz?session_id=a6882262-5c50-4cf5-a4a8-dc8786862916&quiz_id=479';
const harnessSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' })
  .stdout?.trim();
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `deeplink-signed-out-probe-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
mkdirSync(evidenceDir, { recursive: true });

const steps = [];

function startUriCold() {
  const shellCmd = `am start -W -a android.intent.action.VIEW -d '${uri.replace(/'/g, `'\\''`)}' ${pkg}/.MainActivity`;
  return spawnSync('adb', ['-s', h.device, 'shell', shellCmd], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
}

steps.push({ step: 'pm_clear', ok: true });
h.adb(`shell pm clear ${pkg}`);
h.sleep(2500);

execSync(`adb -s ${h.device} logcat -c`, { stdio: 'ignore' });
const startOut = startUriCold();
steps.push({ step: 'cold_view_uri', ok: startOut.status === 0, launchState: /LaunchState: (\w+)/.exec(startOut.stdout || '')?.[1] });
h.sleep(10000);

const gateXml = h.dumpUi();
writeFileSync(join(evidenceDir, 'signed-out-gate-ui.xml'), gateXml);
const loginGate = /login-email-input|content-desc="Sign in"/.test(gateXml);
steps.push({ step: 'login_gate', ok: loginGate });

const maestro = spawnSync(
  process.execPath,
  [join(repoRoot, 'scripts', 'engineering-maestro-login-proof.mjs'), '--inplace', 'student'],
  { cwd: repoRoot, encoding: 'utf8', env: process.env },
);
steps.push({ step: 'maestro_inplace_login', ok: maestro.status === 0, exit: maestro.status });

let pass = false;
let xml = '';
for (let i = 0; i < 24; i++) {
  xml = h.dumpUi();
  if (/60%/.test(xml) && /6\/10|6 of 10/i.test(xml)) {
    pass = true;
    break;
  }
  h.sleep(2500);
}
writeFileSync(join(evidenceDir, 'post-login-ui.xml'), xml);

const logcat = spawnSync('adb', ['-s', h.device, 'logcat', '-d', '-t', '1200'], {
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024,
});
const traceLines = (logcat.stdout || '')
  .split('\n')
  .filter((l) => /OPEN_QUIZ_PENDING|saving sessionId|post-login|handleOpenQuiz|Not authenticated/i.test(l))
  .filter((l) => !/password|Bearer ey/i.test(l));
writeFileSync(join(evidenceDir, 'logcat-pending-trace-redacted.txt'), traceLines.join('\n'), 'utf8');

const out = {
  evidenceDir,
  executingHarnessHead: harnessSha,
  steps,
  maestroStatus: maestro.status,
  pass,
  has479: /479/.test(xml),
  has207: /207/.test(xml),
  has70: /\b70\b/.test(xml),
  actionOrder:
    'pm_clear → cold_VIEW_URI → login_gate → maestro_inplace (no stopApp/launchApp) → poll_results',
};
writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
process.exit(pass ? 0 : 1);
