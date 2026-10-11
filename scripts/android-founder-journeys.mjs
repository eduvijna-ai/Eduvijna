/**
 * Founder acceptance UI journeys on Android (no secrets logged).
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isEduvijnaAppForeground,
  locateByLabel,
  locateByTestId,
  locateWithScroll,
  parseUiXml,
  readXmlContent,
  verifyStudentListDestination,
  verifyWorksheetResultScreen,
} from './lib/android-journey-logic.mjs';

import { FIXTURE, loadFixtureLabels } from './lib/founder-fixture.mjs';
import { loadFixtureTrace } from './lib/assessments-android-locate.mjs';

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
function tapTarget(target) {
  if (!target) return null;
  adb(`shell input tap ${target.x} ${target.y}`);
  return target;
}
function scrollDown() {
  adb('shell input swipe 540 1500 540 700 350');
  sleep(900);
}

function adbTypeSearch(text) {
  const safe = String(text).replace(/ /g, '%s');
  adb(`shell input text "${safe.replace(/"/g, '\\"')}"`);
}

function tapLoadMore(nodes) {
  const hit = locateByTestId(nodes, 'assessments-load-more');
  if (hit) {
    tapTarget(hit);
    sleep(1200);
    return true;
  }
  const label = locateByLabel(nodes, 'Load More', { minY: 0 });
  if (label) {
    tapTarget(label);
    sleep(1200);
    return true;
  }
  return false;
}

function tapSearchField(nodes) {
  const hit =
    locateByTestId(nodes, 'assessments-search-input') ||
    locateByLabel(nodes, 'Search assessments', { minY: 0 });
  if (!hit) return false;
  tapTarget(hit);
  sleep(200);
  return true;
}
function waitFor(predicate, { attempts = 12, pauseMs = 1200, dumpName = 'wait' } = {}) {
  for (let i = 0; i < attempts; i++) {
    const path = dump(`${dumpName}-${i}.xml`);
    const xml = readXmlContent(path);
    if (predicate(xml, path)) return { ok: true, xmlPath: path, xml };
    sleep(pauseMs);
  }
  return { ok: false, xmlPath: null, xml: null };
}
function screenshot(name) {
  const local = join(evidence, name);
  execSync(`adb -s ${serial} exec-out screencap -p > "${local.replace(/\\/g, '/')}"`, { stdio: 'ignore' });
  return name;
}

async function dismissOverlays() {
  execSync(`node "${join(repoRoot, 'scripts/android-dismiss-overlays.mjs')}"`, { stdio: 'ignore' });
}

function shellReady(xml) {
  if (!isEduvijnaAppForeground(xml)) return false;
  const nodes = parseUiXml(xml);
  return (
    locateByLabel(nodes, 'Assessments', { minY: 0 }) != null ||
    locateByLabel(nodes, 'Analytics', { minY: 0 }) != null ||
    nodes.some((n) => /Generate Assessment|Demo School/i.test(`${n.text || ''} ${n['content-desc'] || ''}`))
  );
}

function ensureInApp() {
  let ready = waitFor(shellReady, { attempts: 4, pauseMs: 800, dumpName: 'nav-initial' });
  if (!ready.ok) {
    execSync(`node "${join(repoRoot, 'scripts/android-bootstrap-dev-client.mjs')}" instructor`, {
      stdio: 'inherit',
    });
    execSync(`node "${join(repoRoot, 'scripts/android-dismiss-overlays.mjs')}"`, { stdio: 'ignore' });
    ready = waitFor(shellReady, { attempts: 20, pauseMs: 1500, dumpName: 'nav-after-bootstrap' });
  }
  if (!ready.ok) {
    throw new Error('eduvijna_shell_not_ready');
  }
  for (let i = 0; i < 3; i++) {
    const xml = ready.xml;
    const nodes = parseUiXml(xml);
    const home = locateByLabel(nodes, 'Home', { minY: 0, pick: 'bottom' });
    const inShell = shellReady(xml);
    if (inShell && home) {
      tapTarget(home);
      sleep(1200);
      ready = waitFor(shellReady, { attempts: 6, pauseMs: 1000, dumpName: `nav-home-${i}` });
      if (ready.ok) return;
    }
    adb('shell input keyevent 4');
    sleep(700);
    ready = waitFor(shellReady, { attempts: 3, pauseMs: 700, dumpName: `nav-back-${i}` });
    if (!ready.ok) break;
  }
}

function fixtureContext(labels) {
  return {
    ...FIXTURE,
    quizTitle: labels.quizTitle,
    classLabel: labels.classLabel,
  };
}

async function journeyA(labels) {
  const fx = fixtureContext(labels);
  const log = { journey: 'A_assessments_students_result', steps: [] };
  const { trace } = await loadFixtureTrace();
  log.fixtureTrace = trace;
  if (trace.boundary !== 'ok') {
    log.pass = false;
    log.verify = { label: trace.boundary, pass: false, trace };
    writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(log, null, 2));
    return log;
  }
  await dismissOverlays();
  ensureInApp();

  let path = dump('a-00-home.xml');
  let nodes = parseUiXml(readXmlContent(path));
  log.steps.push({
    step: 'home',
    tap: tapTarget(locateByLabel(nodes, 'Assessments', { minY: 0, pick: 'bottom' })),
  });
  sleep(2500);

  const tabWait = waitFor((xml) => {
    const n = parseUiXml(xml);
    return (
      locateByTestId(n, 'assessments-search-input', { minY: 0 }) != null ||
      locateByLabel(n, 'Expired', { minY: 0 }) != null ||
      locateByLabel(n, 'All', { minY: 0 }) != null
    );
  }, { dumpName: 'a-01-wait-assessments', attempts: 20 });
  path = tabWait.xmlPath || dump('a-01-assessments.xml');
  nodes = parseUiXml(readXmlContent(path));
  const tabKey = trace.filterStrategy?.selectedTab ?? 'expired';
  const tabTap =
    tabKey === 'expired'
      ? locateByLabel(nodes, /Expired\s*\(\d+\)/i, { minY: 0 }) || locateByLabel(nodes, /Expired/i, { minY: 0 })
      : tabKey === 'active'
        ? locateByLabel(nodes, /Active\s*\(\d+\)/i, { minY: 0 }) || locateByLabel(nodes, /Active/i, { minY: 0 })
        : locateByLabel(nodes, /All\s*\(\d+\)/i, { minY: 0 }) || locateByLabel(nodes, 'All', { minY: 0 });
  if (tabTap) {
    log.steps.push({ step: `tab_${tabKey}`, tap: tapTarget(tabTap) });
    sleep(2000);
    path = dump('a-01b-assessments-tab.xml');
    nodes = parseUiXml(readXmlContent(path));
  } else {
    log.steps.push({ step: `tab_${tabKey}_skipped`, reason: 'tab_not_found_use_search' });
  }

  const searchQ = trace.filterStrategy?.searchQuery || labels.searchToken || '';
  if (searchQ && tapSearchField(nodes)) {
    for (let i = 0; i < 48; i++) adb('shell input keyevent 67');
    adbTypeSearch(searchQ);
    sleep(1800);
    log.steps.push({ step: 'search_filter', tokenLength: searchQ.length });
    path = dump('a-01c-after-search.xml');
    nodes = parseUiXml(readXmlContent(path));
  }

  const studentsTestId = trace.openStudentsTestId;
  const openStudentsLabel = labels.openStudentsLabel;
  const locateStudentsControl = (xml) => {
    const n = parseUiXml(xml);
    return (
      locateByTestId(n, studentsTestId, { pick: 'top' }) ||
      (openStudentsLabel ? locateByLabel(n, openStudentsLabel, { minY: 0, pick: 'top' }) : null) ||
      locateByLabel(n, String(labels.quizTitle).slice(0, 12), { minY: 0, pick: 'top' })
    );
  };

  let studentListTap = locateStudentsControl(readXmlContent(path));
  let loadMoreTaps = 0;
  const maxLoadMore = trace.loadMoreTapsNeeded + 2;
  while (!studentListTap && loadMoreTaps < maxLoadMore) {
    path = dump(`a-loadmore-${loadMoreTaps}.xml`);
    nodes = parseUiXml(readXmlContent(path));
    studentListTap = locateStudentsControl(readXmlContent(path));
    if (studentListTap) break;
    if (!tapLoadMore(nodes)) break;
    loadMoreTaps += 1;
  }

  if (!studentListTap) {
    const scrolled = locateWithScroll({
      dumpFn: dump,
      scrollFn: scrollDown,
      maxScrolls: 12,
      dumpNamePrefix: 'a-scroll-students',
      locateFn: (xml) => locateStudentsControl(xml),
    });
    studentListTap = scrolled.hit;
    log.steps.push({ step: 'scroll_for_students_control', scrolls: scrolled.scrolls, hit: Boolean(scrolled.hit) });
  }
  log.steps.push({
    step: 'locate_students_control',
    loadMoreTaps,
    hit: studentListTap,
    testId: studentsTestId,
    renderedInitially: trace.renderedInitially,
  });

  if (!studentListTap) {
    log.pass = false;
    log.verify = {
      label: trace.renderedInitially ? 'action_not_accessible' : 'beyond_rendered_page_unresolved',
      pass: false,
      trace,
    };
    writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(log, null, 2));
    return log;
  }

  adb('shell input keyevent 111');
  sleep(400);
  const labelTap =
    openStudentsLabel && locateByLabel(parseUiXml(readXmlContent(path)), openStudentsLabel, { minY: 0, pick: 'top' });
  log.steps.push({
    step: 'open_student_list',
    tap: tapTarget(labelTap || studentListTap),
    usedAccessibilityLabel: Boolean(labelTap),
  });
  sleep(4500);

  const listWait = waitFor(
    (xml) => verifyStudentListDestination(xml, fx).pass,
    { dumpName: 'a-03-wait-student-list', attempts: 10 },
  );
  path = listWait.xmlPath || dump('a-03-student-list.xml');
  const listDest = verifyStudentListDestination(readXmlContent(path), fx);
  log.steps.push({ step: 'verify_student_list_destination', ...listDest });
  if (!listDest.pass) {
    log.pass = false;
    log.verify = { label: 'wrong_assignment_student_list', pass: false, ...listDest };
    writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(log, null, 2));
    return log;
  }

  nodes = parseUiXml(readXmlContent(path));
  const studentTap =
    locateByTestId(nodes, `student-row-${fx.studentId}`) ||
    locateByLabel(nodes, fx.studentName, { minY: 0 });
  log.steps.push({ step: 'open_student', tap: tapTarget(studentTap) });
  sleep(4500);

  const resultWait = waitFor(
    (xml) => verifyWorksheetResultScreen(xml, fx).pass,
    { dumpName: 'a-04-wait-result', attempts: 12 },
  );
  path = resultWait.xmlPath || dump('a-04-result.xml');
  screenshot('a-04-result.png');
  const verify = verifyWorksheetResultScreen(readXmlContent(path), fx);
  log.verify = { label: 'worksheet_metrics', ...verify };
  log.pass = verify.pass;
  writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(log, null, 2));
  return log;
}

async function journeyB(labels) {
  const fx = fixtureContext(labels);
  const log = { journey: 'B_analytics_view_analytics_result', steps: [] };
  await dismissOverlays();
  ensureInApp();

  let path = dump('b-00-home.xml');
  let nodes = parseUiXml(readXmlContent(path));
  log.steps.push({
    step: 'analytics_tab',
    tap: tapTarget(locateByLabel(nodes, 'Analytics', { minY: 0, pick: 'bottom' })),
  });
  sleep(3000);

  path = dump('b-01-analytics.xml');
  nodes = parseUiXml(readXmlContent(path));
  const classTap =
    (labels.classLabel && locateByLabel(nodes, labels.classLabel, { minY: 0 })) ||
    locateByLabel(nodes, '4A-Mathematics', { minY: 0 });
  log.steps.push({ step: 'open_class', tap: tapTarget(classTap) });
  sleep(2500);

  path = dump('b-02-class-quizzes.xml');
  nodes = parseUiXml(readXmlContent(path));
  const quizNeedle = labels.searchToken || labels.quizTitle.slice(0, 16);
  let quizTap = locateByLabel(nodes, quizNeedle, { minY: 0 });
  if (!quizTap) {
    const scrolled = locateWithScroll({
      dumpFn: dump,
      scrollFn: scrollDown,
      maxScrolls: 8,
      dumpNamePrefix: 'b-02-scroll-quiz',
      locateFn: (xml) => {
        const n = parseUiXml(xml);
        return locateByLabel(n, quizNeedle, { minY: 0 });
      },
    });
    quizTap = scrolled.hit;
  }
  log.steps.push({
    step: 'quiz',
    tap: tapTarget(quizTap),
  });
  sleep(2500);

  path = dump('b-03-quiz.xml');
  nodes = parseUiXml(readXmlContent(path));
  log.steps.push({ step: 'view_analytics', tap: tapTarget(locateByLabel(nodes, 'View Analytics', { minY: 0 })) });
  sleep(3500);

  path = dump('b-04-drill.xml');
  nodes = parseUiXml(readXmlContent(path));
  log.steps.push({ step: 'open_student', tap: tapTarget(locateByLabel(nodes, fx.studentName, { minY: 0 })) });
  sleep(4500);

  const resultWait = waitFor(
    (xml) => verifyWorksheetResultScreen(xml, fx).pass,
    { dumpName: 'b-05-wait-result', attempts: 12 },
  );
  path = resultWait.xmlPath || dump('b-05-result.xml');
  screenshot('b-05-result.png');
  const verify = verifyWorksheetResultScreen(readXmlContent(path), fx);
  log.verify = { label: 'worksheet_metrics', ...verify };
  log.pass = verify.pass;
  writeFileSync(join(evidence, 'journey-b.json'), JSON.stringify(log, null, 2));
  return log;
}

async function main() {
  const which = process.argv[2] || 'all';
  const labels = await loadFixtureLabels();
  const meta = {
    sha,
    fixtureQuizId: FIXTURE.quizId,
    fixtureSessionRedacted: `${FIXTURE.sessionId.slice(0, 8)}…`,
    quizTitleRedacted: `${labels.quizTitle.slice(0, 10)}…`,
  };
  writeFileSync(join(evidence, 'meta.json'), JSON.stringify({ ...meta, availability: labels.availability }, null, 2));

  const results = {};
  let failed = false;
  if (which === 'a' || which === 'all') {
    results.a = await journeyA(labels);
    if (!results.a.pass) failed = true;
  }
  if (which === 'b' || which === 'all') {
    results.b = await journeyB(labels);
    if (!results.b.pass) failed = true;
  }
  console.log(
    JSON.stringify({
      sha,
      results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { pass: v.pass }])),
    }),
  );
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
