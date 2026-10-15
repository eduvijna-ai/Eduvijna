/**
 * Instructor fixture UI only — requires instructor session or performs harness login.
 */
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmulatorLoginHarness } from './lib/emulator-login-harness.mjs';
import { assertResultsScreen } from './lib/assessments-completed-list-harness.mjs';
import { performUiLogout } from './lib/ui-logout-harness.mjs';
import { loginDevApi } from './lib/dev-api-auth.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';

function isStudentHome(xml) {
  return (
    /Hello,\s*Aarya|learning overview for today|Generate Assessment|View pending quizzes/i.test(xml) &&
    !/Weak Students|Recent Assessments|class health/i.test(xml)
  );
}
async function probeInstructorCredentials() {
  const credPath = resolveDevApiCredentialsPath(repoRoot);
  const { accounts } = JSON.parse(readFileSync(credPath, 'utf8'));
  const acct = accounts.instructor;
  const session = await loginDevApi(acct.username, acct.password);
  const role = session.role || session.user?.role;
  if (!['instructor', 'admin', 'teacher'].includes(String(role))) {
    throw new Error(`instructor_credentials_not_instructor role=${role}`);
  }
  return { apiRole: role, instructorUserId: session.userId || session.user?.id };
}

const QUIZ = 'MAT_Mathematics_maths_20260827_1303';
const STUDENT = 'Aarya';
const STUDENT_ROW_ID = '70';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `instructor-fixture-ui-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
const h = createEmulatorLoginHarness();
const { adb, sleep, dumpUi, performLogin, dismissPostLoginInterstitials } = h;

function shot(n) {
  execSync(`adb -s ${h.device} exec-out screencap -p > "${join(evidenceDir, n)}"`, { shell: true, stdio: 'inherit' });
}
function scroll() {
  adb('shell input swipe 540 1500 540 650 280');
}
function tapDesc(xml, d) {
  const m = new RegExp(`content-desc="${d}"[^>]*bounds="([^"]+)"`).exec(xml);
  if (!m) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  adb(`shell input tap ${(c[1] + c[3]) / 2 | 0} ${(c[2] + c[4]) / 2 | 0}`);
  return true;
}
function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function tapClickableRowContains(xml, needle) {
  const n = escRe(needle);
  const patterns = [
    new RegExp(`content-desc="[^"]*${n}[^"]*"[^>]*clickable="true"[^>]*bounds="([^"]+)"`),
    new RegExp(`clickable="true"[^>]*content-desc="[^"]*${n}[^"]*"[^>]*bounds="([^"]+)"`),
  ];
  for (const re of patterns) {
    const m = re.exec(xml);
    if (!m) continue;
    const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
    if (!c) continue;
    adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
    return true;
  }
  return false;
}
function tapDescContains(xml, needle) {
  return tapClickableRowContains(xml, needle);
}
function tapText(xml, t) {
  const m = new RegExp(`text="${t}"[^>]*bounds="([^"]+)"`).exec(xml);
  if (!m) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  adb(`shell input tap ${(c[1] + c[3]) / 2 | 0} ${(c[2] + c[4]) / 2 | 0}`);
  return true;
}
function tapStudentRow(xml, studentId) {
  const patterns = [
    new RegExp(`resource-id="student-row-${studentId}"[^>]*clickable="true"[^>]*bounds="([^"]+)"`),
    new RegExp(`content-desc="student-row-${studentId}[^"]*"[^>]*clickable="true"[^>]*bounds="([^"]+)"`),
  ];
  for (const re of patterns) {
    const m = re.exec(xml);
    if (!m) continue;
    const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
    if (!c) continue;
    adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
    return true;
  }
  return false;
}
function tapAfterNeedle(xml, needle, link) {
  const i = xml.indexOf(needle);
  if (i < 0) return false;
  const slice = xml.slice(i, i + 8000);
  const m = new RegExp(`text="${link}[^"]*"[^>]*bounds="(\\[[^\\]]+\\]\\[[^\\]]+\\])"`).exec(slice);
  if (!m) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  adb(`shell input tap ${(c[1] + c[3]) / 2 | 0} ${(c[2] + c[4]) / 2 | 0}`);
  return true;
}

mkdirSync(evidenceDir, { recursive: true });
const sessionProbe = await probeInstructorCredentials();
const sessionMeta = { sessionProbe };
if (process.env.ENGINEERING_SKIP_LOGOUT_SETUP === '1') {
  adb('shell pm clear com.eduvijna.app');
  sleep(2500);
} else {
  adb('shell monkey -p com.eduvijna.app -c android.intent.category.LAUNCHER 1');
  sleep(5000);
}
let xml = dumpUi();
if (dismissPostLoginInterstitials(xml)) {
  sleep(2000);
  xml = dumpUi();
}
const logout = process.env.ENGINEERING_SKIP_LOGOUT_SETUP === '1'
  ? { ok: true, alreadySignedOut: true, steps: [{ step: 'pm_clear_signed_out' }] }
  : performUiLogout({
  adb,
  sleep,
  dumpUi,
  dismissPostLoginInterstitials,
  authenticatedMarker: h.authenticatedMarker,
});
sessionMeta.logout = { ok: logout.ok, reason: logout.reason, steps: logout.steps, alreadySignedOut: logout.alreadySignedOut };
if (!logout.ok) {
  writeFileSync(
    join(evidenceDir, 'results.json'),
    JSON.stringify({ ok: false, boundary: 'instructor_logout_setup', sessionMeta, evidenceDir }, null, 2),
  );
  process.exit(1);
}
const maestroBin =
  process.env.MAESTRO_BIN ||
  join(process.env.USERPROFILE || '', '.maestro-cli', 'maestro', 'bin', 'maestro.bat');
let maestroLogin = { status: 0 };
if (process.env.ENGINEERING_SKIP_MAESTRO !== '1') {
  maestroLogin = spawnSync(
    process.execPath,
    [join(repoRoot, 'scripts', 'engineering-maestro-login-proof.mjs'), '--inplace', 'instructor'],
    { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, MAESTRO_BIN: maestroBin } },
  );
}
sessionMeta.maestroInstructor = { status: maestroLogin.status, skipped: process.env.ENGINEERING_SKIP_MAESTRO === '1' };
if (maestroLogin.status !== 0 || process.env.ENGINEERING_SKIP_MAESTRO === '1') {
  const { accounts } = JSON.parse(readFileSync(resolveDevApiCredentialsPath(repoRoot), 'utf8'));
  const login = performLogin(accounts.instructor.username, accounts.instructor.password, 'instructor');
  sessionMeta.harnessLogin = { ok: login.ok, diagnostics: login.diagnostics };
  if (!login.ok) {
    writeFileSync(
      join(evidenceDir, 'results.json'),
      JSON.stringify({ ok: false, boundary: 'instructor_harness_login', sessionMeta, evidenceDir }, null, 2),
    );
    process.exit(1);
  }
  xml = login.xml;
} else {
  sleep(4000);
  xml = dumpUi();
  if (dismissPostLoginInterstitials(xml)) sleep(2000);
  xml = dumpUi();
}
writeFileSync(join(evidenceDir, 'session.json'), JSON.stringify(sessionMeta, null, 2));

tapDesc(xml, 'Analytics');
sleep(4000);
xml = dumpUi();
shot('01-analytics.png');
let found = xml.includes(QUIZ);
for (let i = 0; i < 40 && !found; i++) {
  scroll();
  sleep(550);
  xml = dumpUi();
  found = xml.includes(QUIZ);
}
writeFileSync(join(evidenceDir, 'analytics-list.xml'), xml);
shot('02-analytics-quiz-row.png');
const rowTap = found && tapClickableRowContains(xml, QUIZ);
if (!rowTap) {
  tapDesc(xml, 'Assessments');
  sleep(4000);
  xml = dumpUi();
  found = xml.includes(QUIZ);
  for (let i = 0; i < 50 && !found; i++) {
    scroll();
    sleep(550);
    xml = dumpUi();
    found = xml.includes(QUIZ);
  }
  tapAfterNeedle(xml, QUIZ, 'Total:');
}
sleep(4000);
xml = dumpUi();
shot('03-student-list.png');
const studentTap =
  tapStudentRow(xml, STUDENT_ROW_ID) ||
  tapClickableRowContains(xml, STUDENT) ||
  tapText(xml, STUDENT);
sleep(8000);
xml = dumpUi();
writeFileSync(join(evidenceDir, 'results.xml'), xml);
shot('04-results-60-6of10.png');

const resultsAssert = assertResultsScreen(xml);
const ok = resultsAssert.pass;
const identity = {
  quiz479: /quiz-479|quiz_id=479|"479"/.test(xml),
  student70: /student-70|student_id=70/.test(xml),
  attempt207: /attempt-207|attempt_id=207/.test(xml),
  score60: /60%/.test(xml),
  evaluated6of10: /6\/10|6 of 10/i.test(xml),
};
const results = {
  ok: resultsAssert.pass && identity.quiz479 && identity.student70 && identity.attempt207,
  found,
  rowTap,
  studentTap,
  resultsAssert,
  identity,
  onResultsScreen: resultsAssert.evaluated,
  evidenceDir,
};
writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
process.exit(ok ? 0 : 1);
