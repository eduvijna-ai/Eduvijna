/**
 * Complete installed smoke: instructor fixture UI, student result, deep links.
 * Login via desktop SendKeys harness when login screen detected.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmulatorLoginHarness } from './lib/emulator-login-harness.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const pkg = 'com.eduvijna.app';
const FIX = {
  quizTitle: 'MAT_Mathematics_maths_20260827_1303',
  quizId: 479,
  sessionId: 'a6882262-5c50-4cf5-a4a8-dc8786862916',
  studentName: 'Aarya',
  studentUser: 'demo_aarya',
};

const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `complete-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);

const h = createEmulatorLoginHarness();
const { adb, sleep, dumpUi, performLogin, tapTestId, tapContentDesc, authenticatedMarker } = h;

function shot(name) {
  execSync(`adb -s ${h.device} exec-out screencap -p > "${join(evidenceDir, name)}"`, {
    stdio: 'inherit',
    shell: true,
  });
}

function scrollDown() {
  adb('shell input swipe 540 1500 540 650 280');
}

function tapTextAfterNeedle(xml, needle, linkText) {
  const idx = xml.indexOf(needle);
  if (idx < 0) return false;
  const slice = xml.slice(idx, idx + 8000);
  const re = new RegExp(`text="${linkText}[^"]*"[^>]*bounds="(\\[[^\\]]+\\]\\[[^\\]]+\\])"`);
  const m = re.exec(slice);
  if (!m) return false;
  const b = m[1];
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(b);
  if (!c) return false;
  adb(`shell input tap ${Math.floor((+c[1] + +c[3]) / 2)} ${Math.floor((+c[2] + +c[4]) / 2)}`);
  return true;
}

function ensureRoleLogin(role) {
  const { accounts } = JSON.parse(readFileSync(credFile, 'utf8'));
  const acct = accounts[role];
  let xml = dumpUi();
  if (h.dismissPostLoginInterstitials(xml)) {
    sleep(2500);
    xml = dumpUi();
  }
  if (authenticatedMarker(xml)) return { ok: true, xml, via: 'session' };
  adb(`shell monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
  sleep(5000);
  const res = performLogin(acct.username, acct.password, role);
  return { ok: res.ok, xml: res.xml, via: 'harness', diagnostics: res.diagnostics };
}

function startDeepLink(encodedUri, cold) {
  if (cold) {
    adb(`shell am force-stop ${pkg}`);
    sleep(1200);
  }
  adb(`shell am start -a android.intent.action.VIEW -d "${encodedUri}" -n ${pkg}/.MainActivity`);
}

mkdirSync(evidenceDir, { recursive: true });
const results = { evidenceDir, steps: [], at: new Date().toISOString() };

// --- Instructor fixture UI ---
let login = ensureRoleLogin('instructor');
writeFileSync(join(evidenceDir, 'instructor-login-ui.xml'), login.xml);
shot('instructor-00-post-login.png');
results.steps.push({ step: 'instructor_login', ok: login.ok, via: login.via });

if (!login.ok) {
  writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
  process.exit(1);
}

let xml = login.xml;
tapContentDesc(xml, 'Assessments') || tapTestId(xml, 'Assessments');
sleep(4000);
xml = dumpUi();
let found = xml.includes(FIX.quizTitle);
for (let i = 0; i < 45 && !found; i++) {
  scrollDown();
  sleep(650);
  xml = dumpUi();
  found = xml.includes(FIX.quizTitle);
}
writeFileSync(join(evidenceDir, 'instructor-assessments-ui.xml'), xml);
shot('instructor-01-assessments-quiz479.png');
const statsTap = found && tapTextAfterNeedle(xml, FIX.quizTitle, 'Total:');
sleep(4000);
xml = dumpUi();
writeFileSync(join(evidenceDir, 'instructor-student-list-ui.xml'), xml);
shot('instructor-02-student-list.png');
function tapText(xml, text) {
  const re = new RegExp(`text="${text}"[^>]*bounds="([^"]+)"`, 'i');
  const m = re.exec(xml);
  if (!m) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  if (!c) return false;
  adb(`shell input tap ${Math.floor((+c[1] + +c[3]) / 2)} ${Math.floor((+c[2] + +c[4]) / 2)}`);
  return true;
}
const studentTap = tapText(xml, FIX.studentName);
if (studentTap) sleep(5000);
xml = dumpUi();
writeFileSync(join(evidenceDir, 'instructor-results-ui.xml'), xml);
shot('instructor-03-results-60-6of10.png');
const instructorUiOk =
  found && statsTap && /60%/.test(xml) && (/6\/10|6 of 10/i.test(xml) || /6\s*\/\s*10/.test(xml));
results.steps.push({
  step: 'instructor_fixture_479_70_207_ui',
  ok: instructorUiOk,
  quizRowFound: found,
  statsTap,
  scoreMarkers: /60%/.test(xml),
});

// --- Deep links (instructor session still active — sign in student for student deep link tests) ---
const encoded =
  `eduvijna://openquiz?session_id=${FIX.sessionId}%26quiz_id=${FIX.quizId}`;
startDeepLink(encoded, false);
sleep(6000);
xml = dumpUi();
writeFileSync(join(evidenceDir, 'deeplink-warm-instructor-ui.xml'), xml);
shot('deeplink-warm-instructor.png');
results.deepLinkWarmInstructor = {
  encodedUriRedacted: 'eduvijna://openquiz?session_id=[redacted]%26quiz_id=479',
  actual: {
    login: /login-email-input/.test(xml),
    results: /60%|6\/10|Results/i.test(xml),
    preview: /Quiz Preview/i.test(xml),
    notFound: /No Quiz Available/i.test(xml),
  },
};

// Logout for student deep link / student UI
adb('shell input tap 999 140');
sleep(2000);
xml = dumpUi();
tapTestId(xml, 'Logout') || tapContentDesc(xml, 'Logout');
sleep(1000);
xml = dumpUi();
const btn = /resource-id="android:id\/button1"[^>]*bounds="([^"]+)"/.exec(xml);
if (btn) {
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(btn[1]);
  adb(`shell input tap ${Math.floor((+c[1] + +c[3]) / 2)} ${Math.floor((+c[2] + +c[4]) / 2)}`);
}
sleep(3000);

login = ensureRoleLogin('student');
results.steps.push({ step: 'student_login', ok: login.ok, via: login.via });
xml = login.xml;
shot('student-00-post-login.png');

const encodedPlain = `eduvijna://openquiz?session_id=${FIX.sessionId}%26quiz_id=${FIX.quizId}`;
startDeepLink(encodedPlain, false);
sleep(7000);
xml = dumpUi();
writeFileSync(join(evidenceDir, 'deeplink-warm-student-ui.xml'), xml);
shot('deeplink-warm-student.png');
const warmStudent = {
  results: /60%|6\/10|View Results|Quiz Results/i.test(xml),
  preview: /Quiz Preview/i.test(xml),
  taking: /QuizTaking|Question/i.test(xml),
  login: /login-email-input/.test(xml),
};
results.deepLinkWarmStudent = { actual: warmStudent, pass: warmStudent.results };

adb(`shell am force-stop ${pkg}`);
sleep(1000);
adb(`shell monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
sleep(5000);
startDeepLink(encodedPlain, false);
sleep(8000);
xml = dumpUi();
writeFileSync(join(evidenceDir, 'deeplink-cold-persisted-ui.xml'), xml);
shot('deeplink-cold-persisted.png');
results.deepLinkColdPersisted = {
  actual: {
    login: /login-email-input/.test(xml),
    results: /60%|6\/10/i.test(xml),
  },
};

// Student assessments → View Results on fixture title
tapContentDesc(xml, 'Assessments');
sleep(3500);
xml = dumpUi();
tapContentDesc(xml, 'Completed') || tapTestId(xml, 'Completed');
sleep(2500);
found = false;
for (let i = 0; i < 20 && !found; i++) {
  xml = dumpUi();
  found = xml.includes(FIX.quizTitle);
  if (!found) scrollDown();
  sleep(600);
}
const viewResults = found && tapTextAfterNeedle(xml, FIX.quizTitle, 'View Results');
sleep(5000);
xml = dumpUi();
writeFileSync(join(evidenceDir, 'student-results-ui.xml'), xml);
shot('student-results.png');
const studentUiOk =
  found && viewResults && /60%/.test(xml) && (/6\/10|6 of 10/i.test(xml));
results.steps.push({ step: 'student_fixture_result_ui', ok: studentUiOk, viewResults, found });

// Notifications route
tapContentDesc(xml, 'Home');
sleep(2000);
adb('shell input tap 884 140');
sleep(2500);
xml = dumpUi();
writeFileSync(join(evidenceDir, 'notifications-ui.xml'), xml);
shot('notifications.png');
const notifRoute = /Notifications|No notifications|Mark all/i.test(xml);
results.steps.push({ step: 'notifications_screen_route', ok: notifRoute });

results.pass = results.steps.every((s) => s.ok);
writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
process.exit(results.pass ? 0 : 1);
