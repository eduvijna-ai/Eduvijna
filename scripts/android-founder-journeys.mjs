/**
 * Founder acceptance UI journeys on Android (no secrets logged).
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findTapTarget, parseUiTexts } from './lib/android-ui-parse.mjs';
import { FIXTURE, loadFixtureLabels } from './lib/founder-fixture.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence', 'android-journeys');
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';
const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout.trim();

mkdirSync(evidence, { recursive: true });

function adb(cmd) {
  execSync(`adb -s ${serial} ${cmd}`, { stdio: 'ignore' });
}
function sleep(ms) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
}
function dump(name) {
  const local = join(evidence, name);
  execSync(`adb -s ${serial} shell uiautomator dump /sdcard/ui.xml`, { stdio: 'ignore' });
  execSync(`adb -s ${serial} pull /sdcard/ui.xml "${local.replace(/\\/g, '/')}"`, { stdio: 'ignore' });
  return local;
}
function tap(x, y) {
  adb(`shell input tap ${x} ${y}`);
}
function scrollDown() {
  adb('shell input swipe 540 1500 540 700 350');
  sleep(900);
}
function tapLabel(xml, pattern, minY = 0) {
  const s = readFileSync(xml, 'utf8');
  const re = new RegExp(
    `(?:text|content-desc)="([^"]*${pattern}[^"]*)"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
    'gi',
  );
  let best = null;
  for (const m of s.matchAll(re)) {
    const y = Number(m[3]);
    if (y < minY) continue;
    const cand = {
      label: m[1],
      x: Math.floor((Number(m[2]) + Number(m[4])) / 2),
      y: Math.floor((Number(m[3]) + Number(m[5])) / 2),
    };
    if (!best || cand.y > best.y) best = cand;
  }
  if (best) tap(best.x, best.y);
  return best;
}
function tapLabelScroll(pattern, minY = 0, maxScrolls = 14) {
  for (let i = 0; i < maxScrolls; i++) {
    const xml = dump(`scroll-${pattern.slice(0, 8)}-${i}.xml`);
    const hit = tapLabel(xml, pattern, minY);
    if (hit) return { hit, scrolls: i };
    scrollDown();
  }
  return { hit: null, scrolls: maxScrolls };
}
function screenshot(name) {
  const local = join(evidence, name);
  execSync(`adb -s ${serial} exec-out screencap -p > "${local.replace(/\\/g, '/')}"`, { stdio: 'ignore' });
  return name;
}
function assertTexts(xml, patterns, label) {
  const texts = parseUiTexts(xml);
  const hits = patterns.filter((p) => texts.some((t) => p.test(t)));
  return { label, pass: hits.length === patterns.length, hits: hits.map(String), sample: texts.slice(0, 25) };
}

async function dismissOverlays() {
  execSync(`node "${join(repoRoot, 'scripts/android-dismiss-overlays.mjs')}"`, { stdio: 'ignore' });
}
function ensureInApp() {
  let xml = dump('nav-check.xml');
  if (!xml.includes('com.eduvijna.app')) {
    execSync(`node "${join(repoRoot, 'scripts/android-bootstrap-dev-client.mjs')}" instructor`, {
      stdio: 'ignore',
    });
    execSync(`node "${join(repoRoot, 'scripts/android-dismiss-overlays.mjs')}"`, { stdio: 'ignore' });
    return;
  }
  for (let i = 0; i < 3; i++) {
    const texts = parseUiTexts(xml);
    if (texts.some((t) => /Generate Assessment|Demo School|Assessments/i.test(t))) {
      tapLabel(xml, 'Home', 1500);
      sleep(1500);
      return;
    }
    adb('shell input keyevent 4');
    sleep(700);
    xml = dump(`nav-back-${i}.xml`);
    if (!xml.includes('com.eduvijna.app')) break;
  }
}

async function journeyA(quizTitle, searchToken) {
  const log = { journey: 'A_assessments_students_result', steps: [] };
  await dismissOverlays();
  ensureInApp();
  let xml = dump('a-00-home.xml');
  log.steps.push({ step: 'home', tap: tapLabel(xml, 'Assessments', 1500) });
  sleep(3000);
  xml = dump('a-01-assessments.xml');
  log.steps.push({
    step: 'tab_all_or_expired',
    tap: tapLabel(xml, 'Expired \\(9\\)', 0) || tapLabel(xml, 'Expired', 0),
  });
  sleep(2500);
  xml = dump('a-01b-assessments-tab.xml');
  const openQuiz = tapLabelScroll(searchToken, 0);
  log.steps.push({ step: 'locate_quiz', ...openQuiz });
  sleep(1500);
  xml = dump('a-02-quiz-card.xml');
  if (!openQuiz.hit || !String(openQuiz.hit.label || '').includes(searchToken.slice(0, 8))) {
    log.pass = false;
    log.verify = { label: 'fixture_quiz_not_found', pass: false };
    writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(log, null, 2));
    return log;
  }
  xml = dump('a-02b-quiz-card.xml');
  const minY = Math.max(0, openQuiz.hit.y - 80);
  const studentRowTap =
    tapLabel(xml, 'Completed: 1', minY) ||
    tapLabel(xml, 'Completed:', minY) ||
    tapLabel(xml, 'Total:', minY);
  if (!studentRowTap) {
    tap(openQuiz.hit.x, openQuiz.hit.y + 220);
    log.steps.push({ step: 'open_student_list', tap: { label: 'offset_below_title', x: openQuiz.hit.x, y: openQuiz.hit.y + 220 } });
  } else {
    log.steps.push({ step: 'open_student_list', tap: studentRowTap });
  }
  sleep(4000);
  xml = dump('a-03-student-list.xml');
  log.steps.push({
    step: 'aarya',
    tap: tapLabel(xml, '60', 0) || tapLabel(xml, FIXTURE.studentName, 0),
  });
  sleep(5000);
  xml = dump('a-04-result.xml');
  screenshot('a-04-result.png');
  const verify = assertTexts(xml, [/60\s*%|60%/, /10/, /6/], 'worksheet_metrics');
  log.verify = verify;
  log.pass = verify.pass;
  writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(log, null, 2));
  return log;
}

async function journeyB(quizTitle) {
  const log = { journey: 'B_analytics_view_analytics_result', steps: [] };
  await dismissOverlays();
  let xml = dump('b-00-home.xml');
  log.steps.push({ step: 'analytics_tab', tap: tapLabel(xml, 'Analytics', 1500) });
  sleep(3500);
  xml = dump('b-01-analytics.xml');
  log.steps.push({ step: 'classes', tap: tapLabel(xml, 'Classes', 0) });
  sleep(3000);
  xml = dump('b-02-classes.xml');
  log.steps.push({ step: 'quiz', tap: tapLabel(xml, quizTitle.slice(0, 20), 0) });
  sleep(3000);
  xml = dump('b-03-quiz.xml');
  log.steps.push({ step: 'view_analytics', tap: tapLabel(xml, 'View Analytics', 0) });
  sleep(4000);
  xml = dump('b-04-drill.xml');
  log.steps.push({ step: 'aarya', tap: tapLabel(xml, FIXTURE.studentName, 0) });
  sleep(5000);
  xml = dump('b-05-result.xml');
  screenshot('b-05-result.png');
  const verify = assertTexts(xml, [/60\s*%|60%/, /10/, /6/], 'worksheet_metrics');
  log.verify = verify;
  log.pass = verify.pass;
  writeFileSync(join(evidence, 'journey-b.json'), JSON.stringify(log, null, 2));
  return log;
}

async function main() {
  const which = process.argv[2] || 'all';
  const { quizTitle, searchToken, availability } = await loadFixtureLabels();
  const meta = { sha, quizTitleRedacted: quizTitle.slice(0, 8) + '…', fixtureQuizId: FIXTURE.quizId };
  writeFileSync(
    join(evidence, 'meta.json'),
    JSON.stringify({ ...meta, availability, searchTokenRedacted: `${searchToken.slice(0, 6)}…` }, null, 2),
  );
  const results = {};
  if (which === 'a' || which === 'all') results.a = await journeyA(quizTitle, searchToken);
  if (which === 'b' || which === 'all') results.b = await journeyB(quizTitle);
  console.log(JSON.stringify({ sha, results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { pass: v.pass }])) }));
}

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
