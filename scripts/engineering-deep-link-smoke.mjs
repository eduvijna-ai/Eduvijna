/**
 * Deep link smoke: verify URI params and post-navigation UI (no %26-as-ampersand bug).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import { createEmulatorLoginHarness } from './lib/emulator-login-harness.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const SESSION = 'a6882262-5c50-4cf5-a4a8-dc8786862916';
const QUIZ_ID = '479';
const pkg = 'com.eduvijna.app';
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `deeplink-smoke-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
const h = createEmulatorLoginHarness();
const { sleep, dumpUi, performLogin, dismissPostLoginInterstitials, authenticatedMarker } = h;

function startUri(uri, cold) {
  if (cold) {
    h.adb(`shell am force-stop ${pkg}`);
    sleep(1200);
  }
  const shellCmd = `am start -W -a android.intent.action.VIEW -d '${uri.replace(/'/g, `'\\''`)}' ${pkg}/.MainActivity`;
  const r = spawnSync('adb', ['-s', h.device, 'shell', shellCmd], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  return `${r.stdout || ''}${r.stderr || ''}`;
}
function shot(name) {
  execSync(`adb -s ${h.device} exec-out screencap -p > "${join(evidenceDir, name)}"`, { shell: true, stdio: 'inherit' });
}
function classify(xml) {
  return {
    login: /login-email-input|content-desc="Sign in"/.test(xml),
    loading: /Validating quiz/i.test(xml),
    results: /60%/.test(xml) && /6\/10|6 of 10/i.test(xml),
    resultsLoose: /Quiz Results|View Results|Score/i.test(xml) && /60%/.test(xml),
    preview: /Quiz Preview/i.test(xml),
    notFound: /No Quiz Available/i.test(xml),
    taking: /Question \d|QuizTaking/i.test(xml),
  };
}
function pollUi(maxMs, stepMs, predicate) {
  const start = Date.now();
  let xml = dumpUi();
  while (Date.now() - start < maxMs) {
    const c = classify(xml);
    if (predicate(c, xml)) return { xml, actual: c, waitedMs: Date.now() - start };
    sleep(stepMs);
    xml = dumpUi();
  }
  return { xml, actual: classify(xml), waitedMs: Date.now() - start };
}
function tapText(xml, text) {
  const m = new RegExp(`text="${text}"[^>]*bounds="([^"]+)"`, 'i').exec(xml);
  if (!m) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  h.adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
  return true;
}
function logoutIfNeeded() {
  h.adb('shell input tap 63 140');
  sleep(2000);
  let xml = dumpUi();
  h.tapContentDesc(xml, 'Logout') || tapText(xml, 'Logout');
  sleep(1000);
  xml = dumpUi();
  const btn = /resource-id="android:id\/button1"[^>]*bounds="([^"]+)"/.exec(xml);
  if (btn) {
    const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(btn[1]);
    h.adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
  }
  sleep(3000);
}

mkdirSync(evidenceDir, { recursive: true });
let xml = '';
const maestroBin =
  process.env.MAESTRO_BIN ||
  join(process.env.USERPROFILE || '', '.maestro-cli', 'maestro', 'bin', 'maestro.bat');
const maestroLogin = spawnSync(
  process.execPath,
  [join(repoRoot, 'scripts', 'engineering-maestro-login-proof.mjs'), 'student'],
  { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, MAESTRO_BIN: maestroBin } },
);
if (maestroLogin.status !== 0) process.exit(1);
sleep(3000);
let bootXml = dumpUi();
if (dismissPostLoginInterstitials(bootXml)) {
  sleep(2000);
  bootXml = dumpUi();
}

const uri = `eduvijna://openquiz?session_id=${SESSION}&quiz_id=${QUIZ_ID}`;
const badUri = `eduvijna://openquiz?session_id=${SESSION}%26quiz_id=${QUIZ_ID}`;

const out = { evidenceDir, uriShape: { session_id: SESSION, quiz_id: QUIZ_ID }, cases: [] };

h.tapContentDesc(bootXml, 'Home');
sleep(2500);

// Intent line from am start should show both query keys
h.adb('shell logcat -c');
const startOut = startUri(uri, false);
writeFileSync(join(evidenceDir, 'am-start-good.txt'), startOut);
const log = h.adb('shell logcat -d -t 200') || '';
writeFileSync(join(evidenceDir, 'logcat-snippet.txt'), log.slice(-12000));
const intentHasBoth =
  /quiz_id=479/.test(startOut + log) && /session_id=/.test(startOut + log) && !/session_id=.*%26quiz_id/.test(startOut);

const warmPoll = pollUi(45000, 2000, (c) => c.results || c.resultsLoose || c.notFound);
writeFileSync(join(evidenceDir, 'warm-signed-in-ui.xml'), warmPoll.xml);
writeFileSync(
  join(evidenceDir, 'warm-poll-meta.json'),
  JSON.stringify({ waitedMs: warmPoll.waitedMs, actual: warmPoll.actual }, null, 2),
);
shot('warm-signed-in.png');
out.cases.push({
  case: 'warm_signed_in_student',
  intentHasDistinctParams: intentHasBoth,
  startSnippet: startOut.trim().slice(0, 400),
  actual: warmPoll.actual,
  pass: warmPoll.actual.results || warmPoll.actual.resultsLoose,
});

// Cold + persisted session
h.adb(`shell am force-stop ${pkg}`);
sleep(1000);
h.adb(`shell monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
sleep(5000);
startUri(uri, false);
const coldPoll = pollUi(60000, 2500, (c) => c.results || c.resultsLoose || c.notFound || c.login);
writeFileSync(join(evidenceDir, 'cold-persisted-ui.xml'), coldPoll.xml);
shot('cold-persisted.png');
const cold = coldPoll.actual;
out.cases.push({
  case: 'cold_persisted_session',
  actual: cold,
  pass: cold.results || cold.resultsLoose,
});

// Signed out → login gate then continuation (manual re-login via harness)
logoutIfNeeded();
h.adb('shell logcat -c');
startUri(uri, true);
sleep(4000);
xml = dumpUi();
const signedOutGate = classify(xml);
writeFileSync(join(evidenceDir, 'signed-out-gate-ui.xml'), xml);
shot('signed-out-gate.png');
let postLogin = signedOutGate;
if (signedOutGate.login) {
  const maestroBin =
    process.env.MAESTRO_BIN ||
    join(process.env.USERPROFILE || '', '.maestro-cli', 'maestro', 'bin', 'maestro.bat');
  const maestroLogin = spawnSync(
    process.execPath,
    [join(repoRoot, 'scripts', 'engineering-maestro-login-proof.mjs'), 'student'],
    { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, MAESTRO_BIN: maestroBin } },
  );
  if (maestroLogin.status !== 0) {
    postLogin = { login: true, results: false, resultsLoose: false, notFound: false };
  } else {
    sleep(3000);
    const afterLoginPoll = pollUi(45000, 2000, (c) => c.results || c.resultsLoose);
    xml = afterLoginPoll.xml;
    writeFileSync(join(evidenceDir, 'signed-out-post-login-ui.xml'), xml);
    shot('signed-out-post-login.png');
    postLogin = afterLoginPoll.actual;
  }
}
out.cases.push({
  case: 'signed_out_then_login',
  gateOnly: signedOutGate.login && !signedOutGate.results,
  actualAfterGate: signedOutGate,
  actualAfterLogin: postLogin,
  pass: postLogin.results || postLogin.resultsLoose,
});

// Bad encoding control
startUri(badUri, true);
sleep(5000);
xml = dumpUi();
out.cases.push({
  case: 'bad_uri_percent26_encoding',
  actual: classify(xml),
  note: 'Expect missing quiz_id param if platform treats %26 literally',
});

out.pass = out.cases.filter((c) => c.case !== 'bad_uri_percent26_encoding').every((c) => c.pass);
writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(out.pass ? 0 : 1);
