/**
 * Student fixture result UI — harness login if needed.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import { createEmulatorLoginHarness } from './lib/emulator-login-harness.mjs';

const QUIZ = 'MAT_Mathematics_maths_20260827_1303';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `student-fixture-ui-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
const h = createEmulatorLoginHarness();
const { adb, sleep, dumpUi, performLogin, dismissPostLoginInterstitials, tapContentDesc } = h;

function shot(n) {
  execSync(`adb -s ${h.device} exec-out screencap -p > "${join(evidenceDir, n)}"`, { shell: true, stdio: 'inherit' });
}
function scroll() {
  adb('shell input swipe 540 1500 540 650 280');
}
function tapText(xml, t) {
  const m = new RegExp(`text="${t}"[^>]*bounds="([^"]+)"`, 'i').exec(xml);
  if (!m) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
  return true;
}
function tapAfterNeedle(xml, needle, link) {
  const i = xml.indexOf(needle);
  if (i < 0) return false;
  const slice = xml.slice(i, i + 9000);
  const m = new RegExp(`text="${link}[^"]*"[^>]*bounds="(\\[[^\\]]+\\]\\[[^\\]]+\\])"`).exec(slice);
  if (!m) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
  return true;
}

mkdirSync(evidenceDir, { recursive: true });
let xml = dumpUi();
const skipMaestro =
  process.env.ENGINEERING_SKIP_MAESTRO_LOGIN === '1' || h.authenticatedMarker(xml);
if (!skipMaestro) {
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
  xml = dumpUi();
}
if (dismissPostLoginInterstitials(xml)) {
  sleep(2000);
  xml = dumpUi();
}
shot('00-home.png');
tapContentDesc(xml, 'Assessments');
sleep(4000);
xml = dumpUi();
tapContentDesc(xml, 'Completed') || tapText(xml, 'Completed');
sleep(3000);
xml = dumpUi();
shot('01-completed-tab.png');
let found = xml.includes(QUIZ);
for (let i = 0; i < 35 && !found; i++) {
  scroll();
  sleep(550);
  xml = dumpUi();
  found = xml.includes(QUIZ);
}
writeFileSync(join(evidenceDir, 'assessments.xml'), xml);
shot('02-quiz-row.png');
const inlineOk =
  found &&
  /quiz-result-summary/.test(xml) &&
  /attempt-207/.test(xml) &&
  /60%/.test(xml) &&
  /6\/10|6 of 10/i.test(xml);
let viewTap = false;
if (found && !inlineOk) {
  viewTap =
    tapAfterNeedle(xml, QUIZ, 'Results') ||
    tapAfterNeedle(xml, QUIZ, 'View Results') ||
    tapText(xml, 'Results');
  sleep(8000);
  xml = dumpUi();
}
writeFileSync(join(evidenceDir, 'results.xml'), xml);
shot('03-results-60-6of10.png');
const fullOk = /60%/.test(xml) && /6\/10|6 of 10/i.test(xml);
const ok = found && (inlineOk || (viewTap && fullOk));
const results = { ok, found, inlineOk, viewTap, fullOk, evidenceDir };
writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
process.exit(ok ? 0 : 1);
