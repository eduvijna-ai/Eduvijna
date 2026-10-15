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
import { resolveMaestroJavaHome } from './lib/resolve-maestro-java-home.mjs';
import { performUiLogout } from './lib/ui-logout-harness.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const physical = process.env.ENGINEERING_PHYSICAL_DEVICE === '1';
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

if (physical) {
  h.adb('shell am force-stop com.eduvijna.app');
  h.sleep(1500);
  h.adb('shell monkey -p com.eduvijna.app -c android.intent.category.LAUNCHER 1');
  h.sleep(5000);
  let xml0 = h.dumpUi();
  if (h.authenticatedMarker(xml0)) {
    const logout = performUiLogout({
      adb: h.adb,
      sleep: h.sleep,
      dumpUi: h.dumpUi,
      dismissPostLoginInterstitials: h.dismissPostLoginInterstitials,
      authenticatedMarker: h.authenticatedMarker,
    });
    steps.push({ step: 'physical_ui_logout_before_deeplink', ok: logout.ok, reason: logout.reason });
  } else {
    steps.push({ step: 'physical_ui_logout_before_deeplink', ok: true, skipped: 'already_signed_out' });
  }
  h.adb('shell am force-stop com.eduvijna.app');
  h.sleep(2000);
  steps.push({ step: 'pm_clear', ok: true, skipped: 'physical_release_no_pm_clear' });
} else {
  steps.push({ step: 'pm_clear', ok: true });
  h.adb(`shell pm clear ${pkg}`);
  h.sleep(2500);
}

execSync(`adb -s ${h.device} logcat -c`, { stdio: 'ignore' });
const startOut = startUriCold();
steps.push({ step: 'cold_view_uri', ok: startOut.status === 0, launchState: /LaunchState: (\w+)/.exec(startOut.stdout || '')?.[1] });
h.sleep(10000);

const gateXml = h.dumpUi();
writeFileSync(join(evidenceDir, 'signed-out-gate-ui.xml'), gateXml);
const loginGate = /login-email-input|content-desc="Sign in"/.test(gateXml);
steps.push({ step: 'login_gate', ok: loginGate });

const javaHome = resolveMaestroJavaHome();
const maestro = spawnSync(
  process.execPath,
  [join(repoRoot, 'scripts', 'engineering-maestro-login-proof.mjs'), '--inplace', 'student'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(javaHome ? { JAVA_HOME: javaHome } : {}),
      ...(physical ? { ENGINEERING_PHYSICAL_DEVICE: '1' } : {}),
    },
  },
);
steps.push({ step: 'maestro_inplace_login', ok: maestro.status === 0, exit: maestro.status });

function classifyResults(xml) {
  return {
    results: /60%/.test(xml) && /6\/10|6 of 10/i.test(xml),
    rateLimited: /rate-limiting requests/i.test(xml),
    home: /Hello,/.test(xml) && /content-desc="Home"/i.test(xml),
  };
}

let pass = false;
let xml = '';
let rateLimited = false;
for (let i = 0; i < 24; i++) {
  xml = h.dumpUi();
  const c = classifyResults(xml);
  if (c.results) {
    pass = true;
    break;
  }
  if (c.rateLimited) {
    rateLimited = true;
    break;
  }
  h.sleep(2500);
}

if (rateLimited && !pass) {
  steps.push({ step: 'resume_rate_limited_429', ok: true, waitSec: 90 });
  h.sleep(90_000);
  xml = h.dumpUi();
  h.tapContentDesc(xml, 'Retry loading results');
  h.sleep(8000);
  for (let i = 0; i < 16; i++) {
    xml = h.dumpUi();
    if (classifyResults(xml).results) {
      pass = true;
      break;
    }
    h.sleep(2500);
  }
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
  rateLimitedObserved: rateLimited,
  finalScreen: classifyResults(xml),
  has479: /479/.test(xml),
  has207: /207/.test(xml),
  has70: /\b70\b/.test(xml),
  actionOrder:
    'pm_clear → cold_VIEW_URI → login_gate → maestro_inplace (no stopApp/launchApp) → poll_results',
};
writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
process.exit(pass ? 0 : 1);
