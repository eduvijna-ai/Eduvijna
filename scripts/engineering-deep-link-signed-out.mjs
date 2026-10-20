#!/usr/bin/env node
/**
 * Signed-out deep link: logout precondition → URI → login gate → Maestro → fixture result.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import { createEmulatorLoginHarness } from './lib/emulator-login-harness.mjs';
import { performUiLogout, isLoginScreen, isProtectedAppShell } from './lib/ui-logout-harness.mjs';
import { assertResultsScreen } from './lib/assessments-completed-list-harness.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const SESSION = 'a6882262-5c50-4cf5-a4a8-dc8786862916';
const QUIZ_ID = '479';
const pkg = 'com.eduvijna.app';
const uri = `eduvijna://openquiz?session_id=${SESSION}&quiz_id=${QUIZ_ID}`;
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `deeplink-signed-out-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
const h = createEmulatorLoginHarness();
const { sleep, dumpUi, dismissPostLoginInterstitials, adb } = h;

function shot(name) {
  execSync(`adb -s ${h.device} exec-out screencap -p > "${join(evidenceDir, name)}"`, { shell: true, stdio: 'inherit' });
}

function startUri(cold) {
  if (cold) {
    adb(`shell am force-stop ${pkg}`);
    sleep(1200);
  }
  const shellCmd = `am start -W -a android.intent.action.VIEW -d '${uri.replace(/'/g, `'\\''`)}' ${pkg}/.MainActivity`;
  const r = spawnSync('adb', ['-s', h.device, 'shell', shellCmd], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  return `${r.stdout || ''}${r.stderr || ''}`;
}

function classifyGate(xml) {
  return {
    login: isLoginScreen(xml),
    protectedShell: isProtectedAppShell(xml),
    loading: /Validating quiz|Loading/i.test(xml),
    pendingLink:
      /Sign in to continue|log in to view|pending.*quiz|openquiz/i.test(xml) && isLoginScreen(xml),
    resultsLoose: /60%/.test(xml) && /6\/10|6 of 10/i.test(xml),
  };
}

function pollResults(maxMs = 60000) {
  const start = Date.now();
  let xml = dumpUi();
  while (Date.now() - start < maxMs) {
    const assert = assertResultsScreen(xml);
    if (assert.pass) return { xml, assert, waitedMs: Date.now() - start };
    sleep(2500);
    xml = dumpUi();
  }
  return { xml, assert: assertResultsScreen(xml), waitedMs: Date.now() - start };
}

mkdirSync(evidenceDir, { recursive: true });
const out = {
  evidenceDir,
  implementationApkSha: '8b10562',
  implementationApkSha256: '64b3efa7294e5bb83f81c759937811bbba7d9ea6607e40ddb5876f2ca801fd46',
  harnessGitHead: execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim(),
  uriShape: { session_id: SESSION, quiz_id: QUIZ_ID },
};

const logout = performUiLogout({
  adb,
  sleep,
  dumpUi,
  dismissPostLoginInterstitials,
  authenticatedMarker: h.authenticatedMarker,
});
const { xml: _logoutXml, ...logoutRedacted } = logout;
writeFileSync(join(evidenceDir, 'logout.json'), JSON.stringify(logoutRedacted, null, 2));
shot('00-after-logout.png');
out.logout = logoutRedacted;

if (!logout.ok) {
  out.boundary = 'logout_setup_failure';
  out.pass = false;
  writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
  process.exit(1);
}

adb('shell logcat -c');
const startOut = startUri(true);
writeFileSync(join(evidenceDir, 'am-start-signed-out.txt'), startOut);
sleep(5000);
let xml = dumpUi();
writeFileSync(join(evidenceDir, 'signed-out-gate-ui.xml'), xml);
shot('01-after-deeplink-gate.png');
const gate = classifyGate(xml);
const log = adb('shell logcat -d -t 300') || '';
writeFileSync(join(evidenceDir, 'logcat-deeplink-snippet.txt'), log.slice(-16000));
const pendingSignals = (log.match(/ReactNativeJS:.*(?:saving sessionId|Not authenticated|post-login|handleOpenQuiz|pending)/gi) || [])
  .slice(-12)
  .map((line) => line.replace(/session_id=[^\s'"]+/gi, 'session_id=[redacted]'));
writeFileSync(join(evidenceDir, 'pending-link-signals.txt'), pendingSignals.join('\n'));
out.linkReceipt = {
  startSnippet: startOut.trim().slice(0, 500),
  logHasOpenQuiz: /openquiz|session_id|quiz_id=479|Processing initial deep link/i.test(log),
  pendingSignals,
};
out.gate = gate;
out.gate.pass = gate.login && !gate.protectedShell && !gate.resultsLoose;

if (!out.gate.pass) {
  out.boundary = 'signed_out_gate';
  out.pass = false;
  writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
  process.exit(1);
}

const maestroBin =
  process.env.MAESTRO_BIN ||
  join(process.env.USERPROFILE || '', '.maestro-cli', 'maestro', 'bin', 'maestro.bat');
const maestroLogin = spawnSync(
  process.execPath,
  [join(repoRoot, 'scripts', 'engineering-maestro-login-proof.mjs'), 'student'],
  { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, MAESTRO_BIN: maestroBin } },
);
out.maestro = { status: maestroLogin.status };
if (maestroLogin.status !== 0) {
  out.boundary = 'maestro_after_gate';
  out.pass = false;
  writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(out, null, 2));
  process.exit(1);
}
sleep(4000);
if (dismissPostLoginInterstitials(dumpUi())) sleep(2000);

adb('shell logcat -c');
const continuation = pollResults(120000);
const postLog = adb('shell logcat -d -t 400') || '';
writeFileSync(join(evidenceDir, 'logcat-post-login-snippet.txt'), postLog.slice(-20000));
writeFileSync(join(evidenceDir, 'post-login-results-ui.xml'), continuation.xml);
shot('02-post-login-continuation.png');
out.continuation = {
  resultsAssert: continuation.assert,
  waitedMs: continuation.waitedMs,
  postLoginSignals: (postLog.match(/ReactNativeJS:.*(?:handleOpenQuiz|QuizResults|completed this quiz|No Quiz|post_login)/gi) || [])
    .slice(-15)
    .map((line) => line.replace(/session_id=[^\s'"]+/gi, 'session_id=[redacted]')),
};
out.pass = continuation.assert.pass === true;
out.boundary = out.pass ? 'pass' : 'continuation_results';
writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ pass: out.pass, boundary: out.boundary, evidenceDir }));
process.exit(out.pass ? 0 : 1);
