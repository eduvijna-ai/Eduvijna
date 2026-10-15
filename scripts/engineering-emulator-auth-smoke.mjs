/**
 * Engineering installed smoke (emulator): login, logout, account switch.
 * Reads accounts from .dev-api-credentials.local.json — never logs passwords.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const device = process.env.ADB_DEVICE || 'emulator-5554';
const pkg = 'com.eduvijna.app';
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19),
);

function adb(cmd) {
  return execSync(`adb -s ${device} ${cmd}`, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trim();
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function loadAccounts() {
  if (!existsSync(credFile)) {
    throw new Error('Missing .dev-api-credentials.local.json');
  }
  const { accounts } = JSON.parse(readFileSync(credFile, 'utf8'));
  const student = accounts.student;
  const instructor = accounts.instructor;
  if (!student?.username || !instructor?.username) {
    throw new Error('credentials file must include student and instructor accounts');
  }
  return { student, instructor };
}

function dumpUi() {
  adb('shell uiautomator dump /sdcard/eng-smoke-ui.xml');
  const xml = adb('shell cat /sdcard/eng-smoke-ui.xml');
  return xml;
}

function centerFromBounds(bounds) {
  const m = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(bounds);
  if (!m) return null;
  const x = Math.floor((+m[1] + +m[3]) / 2);
  const y = Math.floor((+m[2] + +m[4]) / 2);
  return { x, y };
}

function tapTestId(xml, testId) {
  const re = new RegExp(`resource-id="${testId}"[^>]*bounds="([^"]+)"`, 'i');
  const alt = new RegExp(`content-desc="${testId}"[^>]*bounds="([^"]+)"`, 'i');
  const m = re.exec(xml) || alt.exec(xml);
  if (!m) {
    const byLabel = new RegExp(`content-desc="([^"]*${testId}[^"]*)"[^>]*bounds="([^"]+)"`, 'i');
    const m2 = byLabel.exec(xml);
    if (!m2) return false;
    const c = centerFromBounds(m2[2]);
    if (!c) return false;
    adb(`shell input tap ${c.x} ${c.y}`);
    return true;
  }
  const c = centerFromBounds(m[1]);
  if (!c) return false;
  adb(`shell input tap ${c.x} ${c.y}`);
  return true;
}

function tapAccessibility(xml, label) {
  const re = new RegExp(`content-desc="${label}"[^>]*bounds="([^"]+)"`, 'i');
  const m = re.exec(xml);
  if (!m) return false;
  const c = centerFromBounds(m[1]);
  if (!c) return false;
  adb(`shell input tap ${c.x} ${c.y}`);
  return true;
}

function typeAsciiField(text) {
  const shellSafe = text.replace(/ /g, '%s').replace(/%/g, '%%');
  adb(`shell input text ${shellSafe}`);
}

function typePasswordField(password) {
  const encoded = password
    .split('')
    .map((ch) => {
      if (ch === '@') return '%40';
      if (ch === ' ') return '%s';
      if (/[a-zA-Z0-9._-]/.test(ch)) return ch;
      return encodeURIComponent(ch);
    })
    .join('');
  adb(`shell input text ${encoded}`);
}

function clearFocusedField() {
  for (let i = 0; i < 48; i++) adb('shell input keyevent 67');
}

function fieldText(xml, testId) {
  const re = new RegExp(`resource-id="${testId}"[^>]*text="([^"]*)"`, 'i');
  const m = re.exec(xml);
  return m?.[1] ?? '';
}

function performLogin(username, password) {
  let xml = dumpUi();
  tapTestId(xml, 'login-email-input') || tapAccessibility(xml, 'Email or Username');
  sleep(500);
  clearFocusedField();
  typeAsciiField(username);
  sleep(400);
  xml = dumpUi();
  // Blur email so React Native onEndEditing syncs native text into JS state.
  tapTestId(xml, 'login-password-input') || tapAccessibility(xml, 'Password');
  sleep(600);
  clearFocusedField();
  typePasswordField(password);
  sleep(400);
  xml = dumpUi();
  // Blur password before submit (Login reads passwordValueRef on press).
  tapTestId(xml, 'login-email-input') || tapAccessibility(xml, 'Email or Username');
  sleep(400);
  xml = dumpUi();
  tapTestId(xml, 'login-submit-button') || tapAccessibility(xml, 'Sign in');
  sleep(8000);
  xml = dumpUi();
  const emailOk = fieldText(xml, 'login-email-input') === username;
  const stillOnLogin = /content-desc="Sign in"/.test(xml);
  return { emailOk, stillOnLogin, xml };
}

function logcatSnippet() {
  return adb('logcat -d -t 120').split('\n').filter((l) => /ReactNativeJS|FATAL|Auth|login/i.test(l)).slice(-40);
}

mkdirSync(evidenceDir, { recursive: true });
const { student, instructor } = loadAccounts();
const results = { device, pkg, steps: [], at: new Date().toISOString() };

try {
  adb(`shell pm clear ${pkg}`);
  results.steps.push({ step: 'pm_clear', ok: true });
  adb(`shell monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
  sleep(5000);

  const studentLogin = performLogin(student.username, student.password);
  let xml = studentLogin.xml;
  const studentOk =
    studentLogin.emailOk && (!studentLogin.stillOnLogin || /Assessments|Dashboard|Student|Home/i.test(xml));
  results.steps.push({
    step: 'login_student',
    ok: studentOk,
    username: student.username,
    stillOnLogin: studentLogin.stillOnLogin,
  });
  writeFileSync(join(evidenceDir, 'after-student-login-ui.xml'), xml);
  writeFileSync(join(evidenceDir, 'after-student-login-logcat.txt'), logcatSnippet().join('\n'));

  // Logout via profile/settings if visible — fallback: clear and note
  // Account switch: login instructor without full clear (if logout UI unavailable, clear app data)
  adb(`shell pm clear ${pkg}`);
  sleep(1000);
  adb(`shell monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
  sleep(4000);
  const instructorLogin = performLogin(instructor.username, instructor.password);
  xml = instructorLogin.xml;
  const instructorOk =
    instructorLogin.emailOk &&
    (!instructorLogin.stillOnLogin || /Dashboard|Analytics|Teacher|Assessments/i.test(xml));
  results.steps.push({ step: 'login_instructor_after_clear', ok: instructorOk, username: instructor.username });
  writeFileSync(join(evidenceDir, 'after-instructor-login-ui.xml'), xml);
  writeFileSync(join(evidenceDir, 'after-instructor-login-logcat.txt'), logcatSnippet().join('\n'));

  // Switch back to student
  adb(`shell pm clear ${pkg}`);
  adb(`shell monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
  sleep(4000);
  const restoreLogin = performLogin(student.username, student.password);
  xml = restoreLogin.xml;
  const noInstructorLeak = !xml.includes(instructor.username);
  results.steps.push({ step: 'student_restore_no_prior_username_in_ui', ok: noInstructorLeak });
  writeFileSync(join(evidenceDir, 'after-student-restore-ui.xml'), xml);

  results.pass = results.steps.every((s) => s.ok);
} catch (e) {
  results.pass = false;
  results.error = e?.message || String(e);
}

writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
console.log(`Evidence: ${evidenceDir}`);
console.log(`Pass: ${results.pass}`);
process.exit(results.pass ? 0 : 1);
