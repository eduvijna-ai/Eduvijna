/**
 * Instructor fixture UI only — requires instructor session or performs harness login.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmulatorLoginHarness } from './lib/emulator-login-harness.mjs';

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
adb('shell monkey -p com.eduvijna.app -c android.intent.category.LAUNCHER 1');
sleep(5000);
let xml = dumpUi();
if (dismissPostLoginInterstitials(xml)) {
  sleep(2000);
  xml = dumpUi();
}
if (!h.authenticatedMarker(xml)) {
  const { accounts } = JSON.parse(readFileSync(join(repoRoot, '.dev-api-credentials.local.json'), 'utf8'));
  const acct = accounts.instructor;
  const login = performLogin(acct.username, acct.password, 'instructor');
  if (!login.ok) process.exit(1);
  xml = login.xml;
}

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

const ok = /60%/.test(xml) && /6\/10|6 of 10/i.test(xml);
const results = {
  ok,
  found,
  rowTap,
  studentTap,
  onResultsScreen: /6\/10|6 of 10/i.test(xml),
  evidenceDir,
};
writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
process.exit(ok ? 0 : 1);
