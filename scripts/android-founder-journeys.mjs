/**
 * Founder acceptance UI journeys on Android (no secrets logged).
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adbUiDump } from './lib/adb-ui-dump.mjs';
import {
  isEduvijnaAppForeground,
  locateByLabel,
  locateClickableByLabel,
  locateByTestId,
  locateByContentDesc,
  locateWithScroll,
  parseUiXml,
  readXmlContent,
  verifyStudentListDestination,
  verifyWorksheetResultScreen,
} from './lib/android-journey-logic.mjs';

import {
  FIXTURE,
  loadFixtureLabels,
  loadFixtureAnalyticsQuizPage,
  loadFixtureResultEvidenceFromCredentials,
} from './lib/founder-fixture.mjs';
import { loadFixtureTrace } from './lib/assessments-android-locate.mjs';
import {
  ENGINEERING_EXPO_WEB_URL,
  ENGINEERING_METRO_PORT,
  engineeringImplementationSha,
  buildEngineeringRunRecord,
} from './lib/engineering-runtime-target.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence', 'android-journeys');
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';
const sha = engineeringImplementationSha();

mkdirSync(evidence, { recursive: true });

function adb(cmd) {
  execSync(`adb -s ${serial} ${cmd}`, { stdio: 'ignore' });
}
function sleep(ms) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
}
function dump(name) {
  const local = join(evidence, name);
  adbUiDump(serial, local);
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
function scrollUp() {
  adb('shell input swipe 540 700 540 1500 350');
  sleep(900);
}

function scrollToTop(times = 8) {
  for (let i = 0; i < times; i++) scrollUp();
}

function scrollToBottom(times = 10) {
  for (let i = 0; i < times; i++) scrollDown();
}

/** Swipe inside the analytics nested list (between header and bottom tabs). */
function scrollAnalyticsQuizListDown() {
  adb('shell input swipe 540 1450 540 850 280');
  sleep(650);
}

function scrollAnalyticsQuizListUp() {
  adb('shell input swipe 540 850 540 1450 280');
  sleep(650);
}

function locatePaginationNext(nodes, scope = 'quiz') {
  const scopedId = `analytics-${scope}-pagination-next`;
  const byTestId = locateByTestId(nodes, scopedId) || locateByTestId(nodes, 'analytics-pagination-next');
  if (byTestId) {
    const raw = nodes.find(
      (n) =>
        (n['resource-id'] || '').includes(scopedId) ||
        (n['resource-id'] || '').includes('analytics-pagination-next'),
    );
    if (raw && raw.enabled === 'false') return null;
    return byTestId;
  }
  return (
    locateByContentDesc(nodes, /^Next page$/i, { requireClickable: true }) ||
    locateClickableByLabel(nodes, /^Next$/i, { minY: 0, pick: 'top' })
  );
}

function tapAnalyticsPaginationNext(log, stepName, pageTry, scope = 'quiz') {
  let nextTap = null;
  for (let scroll = 0; scroll < 18 && !nextTap; scroll++) {
    const path = dump(`${stepName}-page-${pageTry}-s${scroll}.xml`);
    const nodes = parseUiXml(readXmlContent(path));
    if (locateByLabel(nodes, /Page \d+ of \d+/i, { minY: 0 })) {
      nextTap = locatePaginationNext(nodes, scope);
    }
    if (!nextTap) {
      nextTap = locatePaginationNext(nodes, scope);
    }
    if (!nextTap) {
      scrollAnalyticsQuizListDown();
      scrollDown();
    }
  }
  if (!nextTap) {
    log.steps.push({ step: stepName, pageTry, paginationFound: false });
    return false;
  }
  log.steps.push({ step: stepName, pageTry, tap: tapTarget(nextTap) });
  tapTarget(nextTap);
  sleep(2200);
  return true;
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

function fillAnalyticsDateField(testId, isoDate) {
  let path = dump('b-date-field.xml');
  let nodes = parseUiXml(readXmlContent(path));
  const field = locateByTestId(nodes, testId);
  if (!field) return false;
  tapTarget(field);
  sleep(400);
  adb('shell input keyevent 123'); // move cursor end
  for (let i = 0; i < 12; i++) adb('shell input keyevent 67');
  adb(`shell input text "${String(isoDate).replace(/-/g, '\\-')}"`);
  sleep(300);
  return true;
}

function ensureAnalyticsClassList(log, classTestId) {
  for (let i = 0; i < 8; i++) {
    const path = dump(`b-reset-drill-${i}.xml`);
    const n = parseUiXml(readXmlContent(path));
    if (locateByTestId(n, classTestId) != null) {
      log.steps.push({ step: 'analytics_at_class_list', attempt: i });
      return true;
    }
    const onDashboard =
      locateByLabel(n, /Analytics Dashboard/i) != null &&
      locateByLabel(n, /attempt for/i) == null &&
      locateByLabel(n, /^All Classes$/i) == null &&
      locateByLabel(n, /^Back to Quizzes$/i) == null;
    if (onDashboard && locateByLabel(n, /quizzes ·/i) != null) {
      log.steps.push({ step: 'analytics_at_class_list', attempt: i, via: 'class_subtitle' });
      return true;
    }
    const back =
      locateByTestId(n, 'analytics-drill-back') ||
      locateClickableByLabel(n, /^All Classes$/i, { minY: 0 }) ||
      locateClickableByLabel(n, /^Back to Quizzes$/i, { minY: 0 });
    if (back) {
      log.steps.push({ step: 'analytics_drill_back', attempt: i, tap: tapTarget(back) });
      tapTarget(back);
      sleep(2200);
      continue;
    }
    const analyticsTab = locateByLabel(n, 'Analytics', { minY: 1200, pick: 'bottom' });
    if (analyticsTab) {
      log.steps.push({ step: 'analytics_tab_recover', attempt: i, tap: tapTarget(analyticsTab) });
      tapTarget(analyticsTab);
      sleep(3500);
      continue;
    }
    if (i < 2) {
      log.steps.push({ step: 'analytics_hardware_back', attempt: i });
      adb('shell input keyevent 4');
      sleep(1800);
      continue;
    }
    break;
  }
  return false;
}

function applyFixtureAnalyticsDateRange(log) {
  const from = '2026-08-01';
  const to = '2026-10-13';
  waitFor(
    (xml) => locateByTestId(parseUiXml(xml), 'analytics-date-from-input') != null,
    { dumpName: 'b-date-wait-inputs', attempts: 12, pauseMs: 1500 },
  );
  const fromOk = fillAnalyticsDateField('analytics-date-from-input', from);
  const toOk = fillAnalyticsDateField('analytics-date-to-input', to);
  const path = dump('b-date-before-apply.xml');
  const nodes = parseUiXml(readXmlContent(path));
  const applyTap =
    locateByTestId(nodes, 'analytics-date-apply') || locateByLabel(nodes, /^Apply$/i, { minY: 0 });
  log.steps.push({ step: 'analytics_date_range', from, to, fromOk, toOk, applyTap: Boolean(applyTap) });
  if (applyTap) tapTarget(applyTap);
  sleep(2500);
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

function fixtureContext(labels, evidence = {}) {
  return {
    ...FIXTURE,
    quizTitle: labels.quizTitle,
    classLabel: labels.classLabel,
    ...evidence,
  };
}

async function journeyA(labels, resultEvidence = {}) {
  const fx = fixtureContext(labels, resultEvidence);
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
    (xml) => {
      const n = parseUiXml(xml);
      if (locateByLabel(n, 'Retry loading results', { minY: 0 })) {
        tapTarget(locateByLabel(n, 'Retry', { minY: 0 }));
        return false;
      }
      return verifyWorksheetResultScreen(xml, fx).pass;
    },
    { dumpName: 'a-04-wait-result', attempts: 16, pauseMs: 2000 },
  );
  path = resultWait.xmlPath || dump('a-04-result.xml');
  screenshot('a-04-result.png');
  const verify = verifyWorksheetResultScreen(readXmlContent(path), fx);
  log.verify = { label: 'worksheet_metrics', ...verify };
  log.pass = verify.pass;
  writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(log, null, 2));
  return log;
}

async function journeyB(labels, resultEvidence = {}, quizPageHint = null) {
  const fx = fixtureContext(labels, resultEvidence);
  const log = { journey: 'B_analytics_view_analytics_result', steps: [] };
  await dismissOverlays();
  ensureInApp();

  let path = dump('b-00-home.xml');
  let nodes = parseUiXml(readXmlContent(path));
  const homeTap = locateByLabel(nodes, 'Home', { minY: 0, pick: 'bottom' });
  if (homeTap) {
    log.steps.push({ step: 'home_tab', tap: tapTarget(homeTap) });
    sleep(1500);
  }
  path = dump('b-00b-home.xml');
  nodes = parseUiXml(readXmlContent(path));
  log.steps.push({
    step: 'analytics_tab',
    tap: tapTarget(locateByLabel(nodes, 'Analytics', { minY: 0, pick: 'bottom' })),
  });
  sleep(4500);
  waitFor(
    (xml) => locateByLabel(parseUiXml(xml), /Analytics Dashboard/i, { minY: 0 }) != null,
    { dumpName: 'b-00-wait-analytics-hub', attempts: 12, pauseMs: 1500 },
  );

  const classTestId = `analytics-class-card-${FIXTURE.classroomId}`;
  const classLabel = labels.classLabel || '4A-Mathematics';
  const classOpenDesc = classLabel ? `Open class analytics: ${classLabel}` : null;
  const locateClassCard = (xml) => {
    const n = parseUiXml(xml);
    return (
      (classOpenDesc
        ? locateByContentDesc(n, classOpenDesc, { requireClickable: true, pick: 'top' })
        : null) ||
      locateByTestId(n, classTestId, { pick: 'top' }) ||
      locateClickableByLabel(n, classLabel, { minY: 0, minHeight: 80 }) ||
      locateByLabel(n, classLabel, { minY: 0 })
    );
  };
  waitFor(
    (xml) => {
      const n = parseUiXml(xml);
      return (
        locateByLabel(n, /Class Overview/i) != null ||
        locateByLabel(n, /Analytics Dashboard/i) != null ||
        locateClassCard(xml) != null
      );
    },
    { dumpName: 'b-00-wait-hub', attempts: 12, pauseMs: 1500 },
  );
  applyFixtureAnalyticsDateRange(log);
  if (!ensureAnalyticsClassList(log, classTestId)) {
    log.steps.push({ step: 'analytics_class_list_reset', ok: false });
  }
  waitFor(
    (xml) => locateClassCard(xml) != null || locateByTestId(parseUiXml(xml), classTestId) != null,
    { dumpName: 'b-00-wait-after-dates', attempts: 10, pauseMs: 1500 },
  );
  const classWait = waitFor(
    (xml) => locateClassCard(xml) != null,
    { dumpName: 'b-01-wait-analytics', attempts: 15 },
  );
  path = classWait.xmlPath || dump('b-01-analytics.xml');
  let classTap = locateClassCard(readXmlContent(path));
  let classScrolls = 0;
  for (let pageTry = 0; pageTry < 6 && !classTap; pageTry++) {
    const scrolledClass = locateWithScroll({
      dumpFn: dump,
      scrollFn: scrollDown,
      maxScrolls: pageTry === 0 ? 12 : 6,
      dumpNamePrefix: `b-01-scroll-class-p${pageTry}`,
      locateFn: locateClassCard,
    });
    classTap = scrolledClass.hit;
    classScrolls += scrolledClass.scrolls;
    if (classTap) break;
    path = dump(`b-01-class-page-${pageTry}.xml`);
    nodes = parseUiXml(readXmlContent(path));
    const nextClassPage =
      locateByTestId(nodes, 'analytics-class-pagination-next') ||
      locateByTestId(nodes, 'analytics-pagination-next') ||
      locateByLabel(nodes, /^Next$/i, { minY: 0, pick: 'top' });
    if (!nextClassPage) break;
    log.steps.push({ step: 'class_pagination_next', pageTry, tap: tapTarget(nextClassPage) });
    tapTarget(nextClassPage);
    sleep(2000);
  }
  if (classScrolls > 0) {
    log.steps.push({ step: 'class_scroll', scrolls: classScrolls });
  }
  log.steps.push({ step: 'open_class', tap: tapTarget(classTap) });
  if (!classTap) {
    log.pass = false;
    log.verify = { label: 'analytics_class_selection', pass: false };
    writeFileSync(join(evidence, 'journey-b.json'), JSON.stringify(log, null, 2));
    return log;
  }
  sleep(4500);
  const viewAnalyticsId = `analytics-quiz-view-${FIXTURE.quizId}-${FIXTURE.sessionId}-open`;
  const quizCardId = `analytics-quiz-card-${FIXTURE.quizId}-${FIXTURE.sessionId}`;
  const classDrillReady = waitFor(
    (xml) => {
      const n = parseUiXml(xml);
      return (
        locateByLabel(n, /Quizzes in this Class/i, { minY: 0 }) != null ||
        locateByTestId(n, quizCardId) != null ||
        locateByTestId(n, viewAnalyticsId) != null ||
        locateByLabel(n, /Performance Summary/i, { minY: 0 }) != null
      );
    },
    { dumpName: 'b-01-wait-class-drill', attempts: 20, pauseMs: 2000 },
  );
  log.steps.push({ step: 'class_drill_ready', ok: Boolean(classDrillReady.xmlPath) });
  for (let s = 0; s < 6; s++) scrollDown();
  const titleNeedle = labels.quizTitle ? String(labels.quizTitle).slice(0, 28) : '';
  const fixtureViewDesc = labels.quizTitle
    ? `View analytics for ${labels.quizTitle}`
    : `View analytics for`;
  const resolveViewAnalyticsOnScreen = (xml) => {
    const n = parseUiXml(xml);
    const byTestId = locateByTestId(n, viewAnalyticsId);
    if (byTestId) return byTestId;
    const byDesc = locateByContentDesc(n, fixtureViewDesc, { requireClickable: true });
    if (byDesc) return byDesc;
    if (!titleNeedle || !locateByLabel(n, titleNeedle, { minY: 0 })) return null;
    return locateClickableByLabel(n, 'View Analytics', { minY: 0, minHeight: 36, pick: 'bottom' });
  };
  if (quizPageHint?.found) {
    log.steps.push({
      step: 'fixture_quiz_page_hint',
      page: quizPageHint.page,
      index: quizPageHint.index,
      total: quizPageHint.total,
    });
    const targetPageLabel = `Analytics quiz page ${quizPageHint.page} of ${quizPageHint.totalPages}`;
    for (let seek = 0; seek < quizPageHint.totalPages + 2; seek++) {
      for (let s = 0; s < 12; s++) scrollAnalyticsQuizListDown();
      const path = dump(`b-02-page-seek-${seek}.xml`);
      const nodes = parseUiXml(readXmlContent(path));
      const onPage =
        locateByContentDesc(nodes, targetPageLabel) ||
        locateByLabel(nodes, new RegExp(`Page ${quizPageHint.page} of ${quizPageHint.totalPages}`, 'i'), {
          minY: 0,
        });
      if (onPage) {
        log.steps.push({ step: 'quiz_page_reached', seek, targetPageLabel });
        break;
      }
      if (!tapAnalyticsPaginationNext(log, 'quiz_pagination_seek', seek)) break;
      for (let s = 0; s < 8; s++) scrollAnalyticsQuizListUp();
    }
    sleep(600);
  }
  const summaryRowId = `analytics-summary-row-${FIXTURE.quizId}-${FIXTURE.sessionId}`;
  let drillOpened = false;
  for (let pageTry = 0; pageTry < 12 && !drillOpened; pageTry++) {
    scrollToTop(4);
    scrollToBottom(8);
    const scrolledSummary = locateWithScroll({
      dumpFn: dump,
      scrollFn: () => {
        scrollAnalyticsQuizListDown();
        scrollDown();
      },
      maxScrolls: 14,
      dumpNamePrefix: `b-02-summary-first-p${pageTry}`,
      locateFn: (xml) => locateByTestId(parseUiXml(xml), summaryRowId),
    });
    if (scrolledSummary.hit) {
      log.steps.push({ step: 'open_quiz_drill', via: 'summary_row_first', tap: tapTarget(scrolledSummary.hit) });
      tapTarget(scrolledSummary.hit);
      drillOpened = true;
      sleep(3000);
      break;
    }
    if (!tapAnalyticsPaginationNext(log, 'summary_pagination_first', pageTry, 'summary')) {
      tapAnalyticsPaginationNext(log, 'quiz_pagination_first', pageTry, 'quiz');
    }
  }

  let viewAnalyticsTap = null;
  let quizScrolls = 0;
  for (let pageTry = 0; !drillOpened && pageTry < 8 && !viewAnalyticsTap; pageTry++) {
    scrollToTop(4);
    const scrolled = locateWithScroll({
      dumpFn: dump,
      scrollFn: scrollAnalyticsQuizListDown,
      maxScrolls: 10,
      dumpNamePrefix: `b-02-scroll-quiz-p${pageTry}`,
      locateFn: resolveViewAnalyticsOnScreen,
    });
    quizScrolls += scrolled.scrolls;
    if (scrolled.xmlPath) {
      viewAnalyticsTap = resolveViewAnalyticsOnScreen(readXmlContent(scrolled.xmlPath));
    }
    if (viewAnalyticsTap) break;
    if (!tapAnalyticsPaginationNext(log, 'quiz_pagination_next', pageTry)) break;
  }
  if (quizScrolls > 0) {
    log.steps.push({ step: 'quiz_scroll', scrolls: quizScrolls });
  }
  if (!drillOpened) {
    drillOpened = Boolean(viewAnalyticsTap);
  }
  if (viewAnalyticsTap && !drillOpened) {
    log.steps.push({
      step: 'view_analytics',
      tap: tapTarget(viewAnalyticsTap),
      testId: viewAnalyticsId,
    });
    tapTarget(viewAnalyticsTap);
    drillOpened = true;
    sleep(2500);
  } else if (!drillOpened) {
    for (let pageTry = 0; pageTry < 10 && !drillOpened; pageTry++) {
      scrollToTop(4);
      const scrolledSummary = locateWithScroll({
        dumpFn: dump,
        scrollFn: scrollAnalyticsQuizListDown,
        maxScrolls: 12,
        dumpNamePrefix: `b-02-summary-scroll-p${pageTry}`,
        locateFn: (xml) => locateByTestId(parseUiXml(xml), summaryRowId),
      });
      if (scrolledSummary.hit) {
        log.steps.push({ step: 'open_quiz_drill', via: 'summary_row', tap: tapTarget(scrolledSummary.hit) });
        tapTarget(scrolledSummary.hit);
        drillOpened = true;
        sleep(2500);
        break;
      }
      if (!tapAnalyticsPaginationNext(log, 'summary_pagination_next', pageTry, 'summary')) break;
    }
  }
  if (!drillOpened) {
    log.pass = false;
    log.verify = { label: 'analytics_view_analytics', pass: false, testId: viewAnalyticsId };
    writeFileSync(join(evidence, 'journey-b.json'), JSON.stringify(log, null, 2));
    return log;
  }
  const viewResultId = `analytics-view-result-${FIXTURE.studentId}-${FIXTURE.attemptId}`;
  sleep(2500);
  const studentAttemptCardId = `analytics-student-attempt-${FIXTURE.studentId}-${FIXTURE.attemptId}`;
  const drillReady = waitFor(
    (xml) => {
      const n = parseUiXml(xml);
      return (
        locateByLabel(n, /Back to Quizzes/i) != null ||
        locateByLabel(n, /Student Attempts/i) != null ||
        locateByTestId(n, viewResultId) != null ||
        locateByTestId(n, studentAttemptCardId) != null ||
        locateByLabel(n, new RegExp(FIXTURE.studentName, 'i')) != null
      );
    },
    { dumpName: 'b-03-wait-drill', attempts: 12, pauseMs: 1500 },
  );
  log.steps.push({ step: 'quiz_drill_ready', ok: Boolean(drillReady.xmlPath) });
  if (!drillReady.xmlPath) {
    path = dump('b-03-drill-miss.xml');
    nodes = parseUiXml(readXmlContent(path));
    const retryTap =
      locateClickableByLabel(nodes, 'View Analytics', { minY: 0, minHeight: 36 }) ||
      locateByLabel(nodes, 'View Analytics', { minY: 0 });
    if (retryTap) {
      log.steps.push({ step: 'view_analytics_retry', tap: tapTarget(retryTap) });
      tapTarget(retryTap);
      sleep(3500);
    }
  }

  for (let i = 0; i < 4; i++) scrollUp();
  const locateStudentResult = (xml) => {
    const n = parseUiXml(xml);
    return (
      locateByTestId(n, viewResultId) ||
      locateClickableByLabel(n, 'View Details', { minY: 0, minHeight: 32 }) ||
      locateByLabel(n, /View saved result/i, { minY: 0 })
    );
  };
  path = dump('b-04-drill.xml');
  nodes = parseUiXml(readXmlContent(path));
  let viewResultTap = locateStudentResult(readXmlContent(path));
  if (!viewResultTap) {
    const scrolledStudent = locateWithScroll({
      dumpFn: dump,
      scrollFn: scrollDown,
      maxScrolls: 10,
      dumpNamePrefix: 'b-04-scroll-student',
      locateFn: locateStudentResult,
    });
    viewResultTap = scrolledStudent.hit;
    log.steps.push({ step: 'student_scroll', scrolls: scrolledStudent.scrolls });
  }
  if (!viewResultTap) {
    for (let pageTry = 0; pageTry < 4 && !viewResultTap; pageTry++) {
      path = dump(`b-04-attempt-page-${pageTry}.xml`);
      nodes = parseUiXml(readXmlContent(path));
      viewResultTap = locateStudentResult(readXmlContent(path));
      if (viewResultTap) break;
      const nextTap =
        locateByTestId(nodes, 'analytics-attempt-pagination-next') ||
        locateByTestId(nodes, 'analytics-pagination-next') ||
        locateByLabel(nodes, /^Next$/i, { minY: 0, pick: 'top' });
      if (!nextTap) break;
      log.steps.push({ step: 'attempt_pagination_next', pageTry, tap: tapTarget(nextTap) });
      tapTarget(nextTap);
      sleep(2000);
    }
  }
  log.steps.push({ step: 'open_saved_result', tap: tapTarget(viewResultTap), testId: viewResultId });
  if (!viewResultTap) {
    log.pass = false;
    log.verify = { label: 'analytics_saved_result', pass: false };
    writeFileSync(join(evidence, 'journey-b.json'), JSON.stringify(log, null, 2));
    return log;
  }
  sleep(4500);

  const resultWait = waitFor(
    (xml) => {
      const n = parseUiXml(xml);
      if (locateByLabel(n, 'Retry loading results', { minY: 0 })) {
        tapTarget(locateByLabel(n, 'Retry', { minY: 0 }));
        return false;
      }
      return verifyWorksheetResultScreen(xml, fx).pass;
    },
    { dumpName: 'b-05-wait-result', attempts: 16, pauseMs: 2000 },
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
  const runRecord = await buildEngineeringRunRecord({ accountRole: 'instructor' });
  const bundleProbe = runRecord.bundleProbe;
  const intendedSha = sha;
  const loadedSha = bundleProbe.loadedBuildSha;
  if (!bundleProbe.pass || loadedSha !== intendedSha) {
    console.error(
      JSON.stringify({
        error: 'engineering_bundle_not_verified',
        intendedImplementationSha: intendedSha,
        loadedImplementationSha: loadedSha,
        bundleProbe,
      }),
    );
    process.exit(2);
  }
  writeFileSync(
    join(evidence, 'meta.json'),
    JSON.stringify(
      {
        ...runRecord,
        fixtureQuizId: FIXTURE.quizId,
        fixtureClassroomId: FIXTURE.classroomId,
        fixtureSessionId: FIXTURE.sessionId,
        fixtureStudentId: FIXTURE.studentId,
        fixtureAttemptId: FIXTURE.attemptId,
        quizTitleRedacted: `${labels.quizTitle.slice(0, 10)}…`,
        availability: labels.availability,
        supersededRuns: {
          note: 'Runs at 0472b67 / d87d724 before this record are historical only.',
        },
      },
      null,
      2,
    ),
  );

  const coldLaunch = process.argv.includes('--cold') || process.env.COLD_LAUNCH === '1';
  if (coldLaunch) {
    adb('shell am force-stop com.eduvijna.app');
    sleep(2500);
    execSync(`node "${join(repoRoot, 'scripts/android-bootstrap-dev-client.mjs')}" instructor`, {
      stdio: 'inherit',
    });
    sleep(3000);
  }

  let resultEvidence = {};
  try {
    resultEvidence = await loadFixtureResultEvidenceFromCredentials();
  } catch {
    resultEvidence = {
      identityLabel: `quiz-${FIXTURE.quizId} attempt-${FIXTURE.attemptId} student-${FIXTURE.studentId}`,
    };
  }

  const results = {};
  let failed = false;
  if (which === 'a' || which === 'all') {
    results.a = await journeyA(labels, resultEvidence);
    if (!results.a.pass) failed = true;
  }
  if (which === 'b' || which === 'all') {
    const quizPageHint = await loadFixtureAnalyticsQuizPage();
    results.b = await journeyB(labels, resultEvidence, quizPageHint);
    if (!results.b.pass) failed = true;
  }
  console.log(
    JSON.stringify({
      runnerGitHeadSha: sha,
      loadedBuildSha: bundleProbe.loadedBuildSha,
      runAt: runRecord.runAt,
      results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { pass: v.pass }])),
    }),
  );
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
