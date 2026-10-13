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
  collectUiTexts,
  locateByLabel,
  locateClickableByLabel,
  locateByTestId,
  locateByContentDesc,
  locateWithScroll,
  parseAssessmentsTabCounts,
  parseUiXml,
  readAssessmentsDataState,
  classifyJourneyAAssessmentsState,
  readAnalyticsDateState,
  readTextInputByTestId,
  readXmlContent,
  verifyStudentListDestination,
  verifyWorksheetResultScreen,
  isMainTabShellVisible,
  hasExactAnalyticsDrillIdentity,
  shouldExecuteViewAnalyticsTap,
} from './lib/android-journey-logic.mjs';

import {
  ANALYTICS_FIXTURE_DATE_RANGE,
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

function adbSetClipboard(text) {
  spawnSync('adb', ['-s', serial, 'shell', 'cmd', 'clipboard', 'set-text', String(text)], {
    encoding: 'utf8',
  });
}

function adbPaste() {
  adb('shell input keyevent 279');
}

function adbTypeIsoDate(isoDate) {
  adbSetClipboard(String(isoDate));
  adbPaste();
}

function resetAssessmentsListFilters(log) {
  let path = dump('a-reset-filters-0.xml');
  let nodes = parseUiXml(readXmlContent(path));
  const dateDropdown = locateClickableByLabel(nodes, /All Time|Last 7|This Week|This Month|Select Date/i, {
    minY: 0,
  });
  if (dateDropdown) {
    tapTarget(dateDropdown);
    sleep(900);
    path = dump('a-reset-filters-date-modal.xml');
    nodes = parseUiXml(readXmlContent(path));
    const allTime =
      locateClickableByLabel(nodes, /^All Time$/i, { minY: 0 }) ||
      locateByLabel(nodes, /^All Time$/i, { minY: 0 });
    if (allTime) {
      tapTarget(allTime);
      sleep(1200);
      log.steps.push({ step: 'assessments_date_filter_all_time' });
    }
  }
  path = dump('a-reset-filters-class-0.xml');
  nodes = parseUiXml(readXmlContent(path));
  const classDropdown = locateClickableByLabel(nodes, /All Classrooms|Select/i, { minY: 0 });
  if (classDropdown && !/All Classrooms/i.test(String(classDropdown.label || ''))) {
    tapTarget(classDropdown);
    sleep(900);
    path = dump('a-reset-filters-class-modal.xml');
    nodes = parseUiXml(readXmlContent(path));
    const allClass =
      locateClickableByLabel(nodes, /^All Classrooms$/i, { minY: 0 }) ||
      locateByLabel(nodes, /^All Classrooms$/i, { minY: 0 });
    if (allClass) {
      tapTarget(allClass);
      sleep(1200);
      log.steps.push({ step: 'assessments_classroom_filter_all' });
    }
  } else {
    log.steps.push({ step: 'assessments_classroom_filter_already_all' });
  }
  return dump('a-reset-filters-done.xml');
}

function clearAssessmentsSearchField(nodes, log) {
  const hit = locateByTestId(nodes, 'assessments-search-input', { minY: 0 });
  if (!hit) return false;
  tapTarget(hit);
  sleep(200);
  for (let i = 0; i < 64; i++) adb('shell input keyevent 67');
  sleep(500);
  log?.steps?.push({ step: 'assessments_search_cleared' });
  return true;
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

function locateAnalyticsDateInput(nodes, testId) {
  const byId = locateByTestId(nodes, testId);
  if (byId) return byId;
  const label =
    testId === 'analytics-date-from-input'
      ? 'Analytics date from'
      : testId === 'analytics-date-to-input'
        ? 'Analytics date to'
        : null;
  return label ? locateByContentDesc(nodes, label, { requireClickable: false }) : null;
}

function readAnalyticsDateValue(testId) {
  const path = dump(`b-date-read-${testId}.xml`);
  const nodes = parseUiXml(readXmlContent(path));
  const field = locateAnalyticsDateInput(nodes, testId);
  if (!field) return { ok: false, value: null };
  const xml = readXmlContent(path);
  const fromXml = readTextInputByTestId(xml, testId);
  if (fromXml) return { ok: true, value: fromXml };
  const node = nodes.find((n) => (n['resource-id'] || '').includes(testId));
  const text = node?.text;
  return { ok: Boolean(text), value: text ?? null };
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function assessmentsPullToRefresh() {
  adb('shell input swipe 540 450 540 1350 500');
  sleep(2500);
}

function readAnalyticsDateStateFromDump(dumpName = 'b-analytics-date-state') {
  const path = dump(`${dumpName}.xml`);
  return readAnalyticsDateState(readXmlContent(path));
}

function readAnalyticsDateInputsFromDump(dumpName = 'b-analytics-date-inputs') {
  const path = dump(`${dumpName}.xml`);
  const xml = readXmlContent(path);
  return {
    from: readTextInputByTestId(xml, 'analytics-date-from-input'),
    to: readTextInputByTestId(xml, 'analytics-date-to-input'),
  };
}

function tapNativeDatePickerConfirm(nodes) {
  return (
    locateClickableByLabel(nodes, /^OK$/i) ||
    locateClickableByLabel(nodes, /^Set$/i) ||
    locateByContentDesc(nodes, /^OK$/i, { requireClickable: true })
  );
}

function androidCalendarCellLabel(y, m, d) {
  const month = MONTH_NAMES[m - 1];
  const day = String(d).padStart(2, '0');
  return `${day} ${month} ${y}`;
}

function readAndroidPickerMonthYear(nodes) {
  const sample = nodes.find((n) => /^\d{2} [A-Za-z]+ 20\d{2}$/.test(String(n['content-desc'] || '')));
  if (!sample) return null;
  const m = String(sample['content-desc']).match(/(\d{2}) ([A-Za-z]+) (20\d{2})/);
  if (!m) return null;
  return { monthName: m[2], year: Number(m[3]) };
}

function navigateAndroidMaterialDatePicker(targetIso, log, label) {
  const [y, m, d] = targetIso.split('-').map(Number);
  const targetCellLabel = androidCalendarCellLabel(y, m, d);
  let daySelected = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    const path = dump(`b-native-picker-${label}-${attempt}.xml`);
    const nodes = parseUiXml(readXmlContent(path));
    const visible = readAndroidPickerMonthYear(nodes);
    if (visible) {
      const curIdx = MONTH_NAMES.indexOf(visible.monthName);
      const targetIdx = m - 1;
      if (visible.year > y || (visible.year === y && curIdx > targetIdx)) {
        const prev =
          locateByContentDesc(nodes, /^Previous month$/i, { requireClickable: true }) ||
          locateClickableByLabel(nodes, /Previous month/i);
        if (prev) {
          tapTarget(prev);
          sleep(450);
          continue;
        }
      } else if (visible.year < y || (visible.year === y && curIdx < targetIdx)) {
        const next =
          locateByContentDesc(nodes, /^Next month$/i, { requireClickable: true }) ||
          locateClickableByLabel(nodes, /Next month/i);
        if (next) {
          tapTarget(next);
          sleep(450);
          continue;
        }
      } else if (!daySelected) {
        const dayHit = nodes.find(
          (n) => n.clickable === 'true' && String(n['content-desc'] || '') === targetCellLabel,
        );
        if (dayHit?.boundsRect) {
          tapTarget({
            x: dayHit.boundsRect.cx,
            y: dayHit.boundsRect.cy,
            kind: 'native-day',
            label: targetCellLabel,
          });
          sleep(500);
          daySelected = true;
          continue;
        }
      }
    }
    const ok = tapNativeDatePickerConfirm(nodes);
    if (ok && daySelected) {
      tapTarget(ok);
      sleep(1200);
      log?.steps?.push({ step: 'native_date_picker_confirmed', label, targetIso });
      return { ok: true };
    }
  }
  return { ok: false, label: 'native_date_picker_failed', which: label, targetIso };
}

function setAnalyticsDateViaNativePicker(which, targetIso, log) {
  const openLabel = which === 'from' ? 'Open from date picker' : 'Open to date picker';
  const path = dump(`b-open-${which}-picker.xml`);
  const nodes = parseUiXml(readXmlContent(path));
  const open = locateByContentDesc(nodes, openLabel, { requireClickable: true });
  if (!open) {
    return { ok: false, label: 'analytics_date_picker_open_missing', which };
  }
  tapTarget(open);
  sleep(900);
  return navigateAndroidMaterialDatePicker(targetIso, log, which);
}

function fillAnalyticsDateField(testId, isoDate) {
  const path = dump(`b-date-fill-${testId}.xml`);
  const nodes = parseUiXml(readXmlContent(path));
  const field = locateAnalyticsDateInput(nodes, testId);
  if (!field) return { ok: false, expected: isoDate, actual: null, reason: 'field_missing' };
  let actual = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    tapTarget(field);
    sleep(450);
    adb('shell input keyevent 123');
    for (let i = 0; i < 24; i++) adb('shell input keyevent 67');
    sleep(150);
    adbSetClipboard(isoDate);
    sleep(200);
    adbPaste();
    sleep(500);
    adb('shell input tap 540 280');
    sleep(450);
    const readBack = readAnalyticsDateValue(testId);
    actual = readBack.value;
    if (actual === isoDate) break;
    const compact = String(isoDate).replace(/-/g, '');
    if (actual === compact) {
      actual = isoDate;
      break;
    }
  }
  return {
    ok: actual === isoDate,
    expected: isoDate,
    actual,
    reason: actual === isoDate ? null : 'analytics_date_value_mismatch',
  };
}

function waitForAnalyticsDateControls(log) {
  const result = waitFor((xml) => {
    const n = parseUiXml(xml);
    const dashboard = locateByLabel(n, /Analytics Dashboard/i, { minY: 0 }) != null;
    const from = locateAnalyticsDateInput(n, 'analytics-date-from-input') != null;
    const to = locateAnalyticsDateInput(n, 'analytics-date-to-input') != null;
    const apply =
      locateByTestId(n, 'analytics-date-apply') != null ||
      locateByContentDesc(n, 'Apply analytics date range', { requireClickable: true }) != null;
    return dashboard && from && to && apply;
  }, { dumpName: 'b-date-controls', attempts: 16, pauseMs: 1500 });
  if (!result.ok) {
    const path = dump('b-date-controls-missing.xml');
    const nodes = parseUiXml(readXmlContent(path));
    const sampleIds = nodes
      .map((n) => n['resource-id'])
      .filter(Boolean)
      .slice(0, 40);
    log.steps.push({
      step: 'analytics_date_controls_missing',
      implementationSha: sha,
      sampleTestIds: sampleIds,
      xmlPath: path,
    });
  }
  return result;
}

function ensureAnalyticsClassList(log, classTestId) {
  for (let i = 0; i < 8; i++) {
    const path = dump(`b-reset-drill-${i}.xml`);
    const n = parseUiXml(readXmlContent(path));
    if (locateByTestId(n, classTestId) != null) {
      log.steps.push({ step: 'analytics_at_class_list', attempt: i });
      return true;
    }
    if (locateByContentDesc(n, /Open class analytics:/i, { requireClickable: true }) != null) {
      log.steps.push({ step: 'analytics_at_class_list', attempt: i, via: 'class_card_desc' });
      return true;
    }
    if (locateByLabel(n, /attempt for/i) != null) {
      const drillBack =
        locateByTestId(n, 'analytics-drill-back') ||
        locateClickableByLabel(n, /^Back to Quizzes$/i, { minY: 0 }) ||
        locateClickableByLabel(n, /^All Classes$/i, { minY: 0 });
      if (drillBack) {
        log.steps.push({ step: 'analytics_leave_attempt_list', attempt: i, tap: tapTarget(drillBack) });
        tapTarget(drillBack);
        sleep(2500);
        continue;
      }
      log.steps.push({ step: 'analytics_leave_attempt_list', attempt: i, via: 'hardware_back' });
      adb('shell input keyevent 4');
      sleep(2000);
      continue;
    }
    const onDashboard =
      locateByLabel(n, /Analytics Dashboard/i) != null &&
      locateByLabel(n, /attempt for/i) == null &&
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
  const controls = waitForAnalyticsDateControls(log);
  if (!controls.ok) {
    return { ok: false, label: 'analytics_date_controls_missing' };
  }
  const from = ANALYTICS_FIXTURE_DATE_RANGE.created_from;
  const to = ANALYTICS_FIXTURE_DATE_RANGE.created_to;
  let state = readAnalyticsDateStateFromDump('b-date-state-initial');
  log.steps.push({ step: 'analytics_date_state_initial', state });
  if (state.from !== from) {
    const fromResult = setAnalyticsDateViaNativePicker('from', from, log);
    log.steps.push({ step: 'analytics_date_native_from', fromResult });
    if (!fromResult.ok) return fromResult;
    sleep(800);
    const fromInputs = readAnalyticsDateInputsFromDump('b-date-inputs-after-from');
    const fromMarker = readAnalyticsDateStateFromDump('b-date-state-after-from');
    log.steps.push({ step: 'analytics_date_after_from', inputs: fromInputs, marker: fromMarker });
    const actualFrom = fromInputs.from || fromMarker.from;
    if (actualFrom !== from) {
      return {
        ok: false,
        label: 'analytics_date_state_mismatch',
        field: 'from',
        expected: from,
        actual: actualFrom,
      };
    }
    state = { ...state, from: actualFrom };
  }
  if (state.to !== to) {
    const toResult = setAnalyticsDateViaNativePicker('to', to, log);
    log.steps.push({ step: 'analytics_date_native_to', toResult });
    if (!toResult.ok) return toResult;
    sleep(800);
    const toInputs = readAnalyticsDateInputsFromDump('b-date-inputs-after-to');
    const toMarker = readAnalyticsDateStateFromDump('b-date-state-after-to');
    log.steps.push({ step: 'analytics_date_after_to', inputs: toInputs, marker: toMarker });
    const actualTo = toInputs.to || toMarker.to;
    if (actualTo !== to) {
      return {
        ok: false,
        label: 'analytics_date_state_mismatch',
        field: 'to',
        expected: to,
        actual: actualTo,
      };
    }
    state = { ...state, to: actualTo };
  }
  log.steps.push({ step: 'analytics_date_state_ready', state });
  const path = dump('b-date-before-apply.xml');
  const nodes = parseUiXml(readXmlContent(path));
  const applyTap =
    locateByTestId(nodes, 'analytics-date-apply') ||
    locateByContentDesc(nodes, 'Apply analytics date range', { requireClickable: true });
  log.steps.push({ step: 'analytics_date_range', from, to, applyTap: Boolean(applyTap) });
  if (!applyTap) {
    return { ok: false, label: 'analytics_date_controls_missing' };
  }
  tapTarget(applyTap);
  sleep(4500);
  return { ok: true };
}

function enterAssessmentsSearch(nodes, searchQ, log) {
  const hit = locateByTestId(nodes, 'assessments-search-input', { minY: 0 });
  if (!hit) {
    log.steps.push({ step: 'search_input_missing' });
    return { ok: false, label: 'assessment_search_input_missing' };
  }
  tapTarget(hit);
  sleep(250);
  for (let i = 0; i < 64; i++) adb('shell input keyevent 67');
  sleep(150);
  adbTypeSearch(searchQ);
  sleep(1800);
  const path = dump('a-search-verify.xml');
  const actual = readTextInputByTestId(readXmlContent(path), 'assessments-search-input');
  log.steps.push({ step: 'search_filter', intended: searchQ, actual });
  if (actual !== searchQ) {
    return { ok: false, label: 'assessment_search_input_mismatch', intended: searchQ, actual };
  }
  return { ok: true, xmlPath: path };
}

function tapAssessmentsTab(nodes, tabKey) {
  const patterns =
    tabKey === 'expired'
      ? [/^Expired\s*\(\d+\)/i, /^Expired$/i]
      : tabKey === 'active'
        ? [/^Active\s*\(\d+\)/i, /^Active$/i]
        : tabKey === 'available_soon'
          ? [/^Upcoming\s*\(\d+\)/i, /^Upcoming$/i]
          : [/^All\s*\(\d+\)/i, /^All$/i];
  for (const re of patterns) {
    const hit = locateByLabel(nodes, re, { minY: 0 });
    if (hit) {
      tapTarget(hit);
      return true;
    }
  }
  return false;
}

function locateStudentsControlExact(xml, studentsTestId) {
  const n = parseUiXml(xml);
  return locateByTestId(n, studentsTestId, { pick: 'top' });
}

function buildFixtureUiReconciliation({
  apiRow,
  trace,
  labels,
  studentsTestId,
  tabSnapshots,
  searchQuery,
}) {
  return {
    quizId: FIXTURE.quizId,
    sessionId: FIXTURE.sessionId,
    apiAvailability: apiRow?.availability_status ?? trace.availability,
    apiClassroomId: apiRow?.classroom_id ?? apiRow?.class_id ?? null,
    apiQuizTitle: apiRow?.quiz_name ?? apiRow?.title ?? labels.quizTitle,
    traceSelectedTab: trace.filterStrategy?.selectedTab ?? null,
    traceSearchQuery: trace.filterStrategy?.searchQuery ?? searchQuery ?? '',
    diagnosticsOnly: {
      openStudentsLabel: labels.openStudentsLabel ?? null,
      quizTitleFragment: String(labels.quizTitle).slice(0, 12),
    },
    uiTabSnapshots: tabSnapshots,
    exactFixtureTestId: studentsTestId,
  };
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

function failJourneyB(log, verify) {
  log.pass = false;
  log.verify = verify;
  writeFileSync(join(evidence, 'journey-b.json'), JSON.stringify(log, null, 2));
  return log;
}

function assertAnalyticsDrillIdentity(log, expectedTestId, dumpName) {
  const result = waitFor(
    (xml) => hasExactAnalyticsDrillIdentity(parseUiXml(xml), expectedTestId),
    { dumpName, attempts: 16, pauseMs: 1500 },
  );
  log.steps.push({ step: 'assert_drill_identity', expected: expectedTestId, ok: result.ok });
  return result.ok;
}

async function returnToMainShell(log, { dumpNamePrefix = 'transition-main-shell' } = {}) {
  let path = dump(`${dumpNamePrefix}-0.xml`);
  let nodes = parseUiXml(readXmlContent(path));
  if (isMainTabShellVisible(nodes)) {
    log.steps.push({ step: 'return_to_main_shell', ok: true, via: 'already_visible' });
    return true;
  }
  const goDash =
    locateByContentDesc(nodes, 'Go to main dashboard', { requireClickable: true }) ||
    locateByLabel(nodes, 'Go to main dashboard', { minY: 0 });
  if (goDash) {
    log.steps.push({
      step: 'return_to_main_shell',
      via: 'go_to_main_dashboard',
      tap: tapTarget(goDash),
    });
    tapTarget(goDash);
    sleep(3500);
    path = dump(`${dumpNamePrefix}-after-dashboard.xml`);
    nodes = parseUiXml(readXmlContent(path));
    if (isMainTabShellVisible(nodes)) {
      log.steps.push({ step: 'return_to_main_shell', ok: true, via: 'after_go_dashboard' });
      return true;
    }
  }
  const waitResult = waitFor((xml) => isMainTabShellVisible(parseUiXml(xml)), {
    dumpName: `${dumpNamePrefix}-wait`,
    attempts: 8,
    pauseMs: 1500,
  });
  if (waitResult.ok) {
    log.steps.push({ step: 'return_to_main_shell', ok: true, via: 'wait_after_dashboard' });
    return true;
  }
  for (let i = 0; i < 10; i++) {
    path = dump(`${dumpNamePrefix}-back-${i}.xml`);
    nodes = parseUiXml(readXmlContent(path));
    if (isMainTabShellVisible(nodes)) {
      log.steps.push({ step: 'return_to_main_shell', ok: true, via: 'hardware_back', attempts: i });
      return true;
    }
    log.steps.push({
      step: 'return_to_main_shell_back',
      attempt: i,
      sampleLabels: collectUiTexts(nodes).slice(0, 12),
    });
    adb('shell input keyevent 4');
    sleep(1800);
  }
  log.steps.push({ step: 'journey_transition_to_main_shell_failed', ok: false });
  return false;
}

async function enterAnalyticsDashboardFromMainShell(log) {
  await dismissOverlays();
  ensureInApp();
  let path = dump('b-00-home.xml');
  let nodes = parseUiXml(readXmlContent(path));
  if (!isMainTabShellVisible(nodes)) {
    const returned = await returnToMainShell(log, { dumpNamePrefix: 'b-00-return-shell' });
    if (!returned) {
      return { ok: false, label: 'journey_transition_to_main_shell_failed' };
    }
    path = dump('b-00b-home.xml');
    nodes = parseUiXml(readXmlContent(path));
  }
  log.steps.push({ step: 'main_shell_identity', ok: isMainTabShellVisible(nodes) });
  const analyticsTab =
    locateByLabel(nodes, 'Analytics', { minY: 1200, pick: 'bottom' }) ||
    locateByLabel(nodes, 'Analytics', { pick: 'bottom' });
  if (!analyticsTab) {
    log.steps.push({ step: 'analytics_tab', tap: null });
    return { ok: false, label: 'analytics_tab_missing_from_main_shell' };
  }
  const analyticsTap = tapTarget(analyticsTab);
  log.steps.push({ step: 'analytics_tab', tap: analyticsTap });
  tapTarget(analyticsTab);
  sleep(4500);
  const hubWait = waitFor(
    (xml) => locateByLabel(parseUiXml(xml), /Analytics Dashboard/i, { minY: 0 }) != null,
    { dumpName: 'b-00-wait-analytics-hub', attempts: 12, pauseMs: 1500 },
  );
  if (!hubWait.ok) {
    return { ok: false, label: 'analytics_dashboard_missing' };
  }
  const controls = waitForAnalyticsDateControls(log);
  if (!controls.ok) {
    return { ok: false, label: 'analytics_date_controls_missing' };
  }
  return { ok: true };
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
  const { trace, allQuizzes } = await loadFixtureTrace();
  log.fixtureTrace = trace;
  if (trace.boundary !== 'ok') {
    log.pass = false;
    log.verify = { label: trace.boundary, pass: false, trace };
    writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(log, null, 2));
    return log;
  }
  const apiRow = allQuizzes.find(
    (q) =>
      Number(q.quiz_id) === FIXTURE.quizId && String(q.session_id ?? '') === String(FIXTURE.sessionId),
  );
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
  path = resetAssessmentsListFilters(log);
  clearAssessmentsSearchField(parseUiXml(readXmlContent(path)), log);
  path = dump('a-reset-search-cleared.xml');

  let assessmentsDataState = readAssessmentsDataState(readXmlContent(path));
  log.assessmentsDataState = assessmentsDataState;
  if (!assessmentsDataState.raw) {
    log.pass = false;
    log.verify = { pass: false, label: 'assessments_data_state_missing' };
    writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(log, null, 2));
    return log;
  }
  let journeyADataClassification = classifyJourneyAAssessmentsState(assessmentsDataState);
  log.journeyADataClassification = journeyADataClassification;

  if (journeyADataClassification === 'CASE_A') {
    log.steps.push({ step: 'assessments_diagnostic_refresh' });
    const beforeSource = assessmentsDataState.teacherSourceCount ?? 0;
    assessmentsPullToRefresh();
    path = dump('a-after-diagnostic-refresh.xml');
    assessmentsDataState = readAssessmentsDataState(readXmlContent(path));
    log.assessmentsDataStateAfterRefresh = assessmentsDataState;
    journeyADataClassification = classifyJourneyAAssessmentsState(assessmentsDataState);
    log.journeyADataClassification = journeyADataClassification;
    const afterSource = assessmentsDataState.teacherSourceCount ?? 0;
    if (beforeSource === 0 && afterSource > 0) {
      log.assessmentsInitialLoadStale = true;
      log.steps.push({ step: 'assessments_initial_load_stale', beforeSource, afterSource });
    }
  }

  if (journeyADataClassification !== 'CASE_OK') {
    log.pass = false;
    log.verify = {
      pass: false,
      label: `journey_a_${journeyADataClassification.toLowerCase()}`,
      classification: journeyADataClassification,
      state: assessmentsDataState,
    };
    log.fixtureUiReconciliation = buildFixtureUiReconciliation({
      apiRow,
      trace,
      labels,
      studentsTestId: trace.openStudentsTestId,
      tabSnapshots: [],
      searchQuery: trace.filterStrategy?.searchQuery || '',
    });
    writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(log, null, 2));
    return log;
  }

  const studentsTestId = trace.openStudentsTestId;
  const searchQ = trace.filterStrategy?.searchQuery || labels.searchToken || '';
  const primaryTab = trace.filterStrategy?.selectedTab ?? 'expired';
  const tabProbeOrder = [primaryTab];
  if (primaryTab !== 'all') tabProbeOrder.push('all');

  const tabSnapshots = [];
  let studentListTap = null;
  let loadMoreTaps = 0;

  const findFixtureControlOnScreen = (xmlPath) => {
    let hit = locateStudentsControlExact(readXmlContent(xmlPath), studentsTestId);
    let taps = 0;
    const maxLoadMore = trace.loadMoreTapsNeeded + 2;
    while (!hit && taps < maxLoadMore) {
      const n = parseUiXml(readXmlContent(xmlPath));
      if (!tapLoadMore(n)) break;
      taps += 1;
      loadMoreTaps += 1;
      xmlPath = dump(`a-loadmore-${loadMoreTaps}.xml`);
      hit = locateStudentsControlExact(readXmlContent(xmlPath), studentsTestId);
    }
    if (!hit) {
      const scrolled = locateWithScroll({
        dumpFn: dump,
        scrollFn: scrollDown,
        maxScrolls: 12,
        dumpNamePrefix: 'a-scroll-students',
        locateFn: (xml) => locateStudentsControlExact(xml, studentsTestId),
      });
      hit = scrolled.hit;
      if (scrolled.scrolls > 0) {
        log.steps.push({ step: 'scroll_for_students_control', scrolls: scrolled.scrolls, hit: Boolean(hit) });
      }
    }
    return hit;
  };

  for (const tabKey of tabProbeOrder) {
    nodes = parseUiXml(readXmlContent(path));
    const tabTapped = tapAssessmentsTab(nodes, tabKey);
    log.steps.push({ step: `tab_${tabKey}`, tapped: tabTapped });
    sleep(2000);
    path = dump(`a-01b-tab-${tabKey}.xml`);
    nodes = parseUiXml(readXmlContent(path));
    tabSnapshots.push({
      tab: tabKey,
      counts: parseAssessmentsTabCounts(nodes),
      exactFixtureTestIdPresent: locateStudentsControlExact(readXmlContent(path), studentsTestId) != null,
    });

    if (searchQ) {
      const searchResult = enterAssessmentsSearch(nodes, searchQ, log);
      if (!searchResult.ok) {
        log.pass = false;
        log.verify = { pass: false, ...searchResult };
        log.fixtureUiReconciliation = buildFixtureUiReconciliation({
          apiRow,
          trace,
          labels,
          studentsTestId,
          tabSnapshots,
          searchQuery: searchQ,
        });
        writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(log, null, 2));
        return log;
      }
      path = searchResult.xmlPath || path;
      nodes = parseUiXml(readXmlContent(path));
    }

    studentListTap = findFixtureControlOnScreen(path);
    if (studentListTap) break;

    if (searchQ) {
      nodes = parseUiXml(readXmlContent(path));
      if (clearAssessmentsSearchField(nodes, log)) {
        path = dump(`a-01c-cleared-search-${tabKey}.xml`);
        log.steps.push({ step: 'search_cleared_retry', tab: tabKey });
        studentListTap = findFixtureControlOnScreen(path);
        if (studentListTap) break;
      }
    }
  }

  if (!studentListTap) {
    nodes = parseUiXml(readXmlContent(path));
    tapAssessmentsTab(nodes, 'all');
    sleep(2000);
    path = dump('a-01d-all-no-search.xml');
    nodes = parseUiXml(readXmlContent(path));
    clearAssessmentsSearchField(nodes, log);
    sleep(800);
    path = dump('a-01e-all-cleared.xml');
    studentListTap = findFixtureControlOnScreen(path);
    log.steps.push({ step: 'final_all_tab_without_search', hit: Boolean(studentListTap) });
  }

  const expiredCount = tabSnapshots.find((s) => s.tab === 'expired')?.counts?.expired;
  const onAllWithFixture =
    tabSnapshots.some((s) => s.tab === 'all' && s.exactFixtureTestIdPresent) ||
    (studentListTap != null && tabProbeOrder.includes('all'));
  if (
    !studentListTap &&
    trace.availability === 'expired' &&
    expiredCount === 0 &&
    onAllWithFixture
  ) {
    log.steps.push({
      step: 'fixture_filter_count_anomaly',
      note: 'API expired but Expired tab count 0 while exact testID visible under All',
    });
  }

  log.steps.push({
    step: 'locate_students_control',
    loadMoreTaps,
    hit: Boolean(studentListTap),
    testId: studentsTestId,
    renderedInitially: trace.renderedInitially,
  });

  if (!studentListTap) {
    log.fixtureUiReconciliation = buildFixtureUiReconciliation({
      apiRow,
      trace,
      labels,
      studentsTestId,
      tabSnapshots,
      searchQuery: searchQ,
    });
    log.pass = false;
    log.verify = {
      label: trace.renderedInitially ? 'action_not_accessible' : 'beyond_rendered_page_unresolved',
      pass: false,
      trace,
      reconciliation: log.fixtureUiReconciliation,
    };
    writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(log, null, 2));
    return log;
  }

  adb('shell input keyevent 111');
  sleep(400);
  log.steps.push({
    step: 'open_student_list',
    testId: studentsTestId,
    tap: tapTarget(studentListTap),
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
  const entry = await enterAnalyticsDashboardFromMainShell(log);
  if (!entry.ok) {
    return failJourneyB(log, { label: entry.label, pass: false });
  }

  let path;
  let nodes;
  const classTestId = `analytics-class-card-${FIXTURE.classroomId}`;
  const classLabel = labels.classLabel || '4A-Mathematics';
  const classOpenDesc = classLabel ? `Open class analytics: ${classLabel}` : null;
  const locateClassCard = (xml) => {
    const n = parseUiXml(xml);
    const byTestId = locateByTestId(n, classTestId, { pick: 'top' });
    if (byTestId) return byTestId;
    if (!classOpenDesc) return null;
    const exactDesc = locateByContentDesc(n, classOpenDesc, { requireClickable: true, pick: 'top' });
    if (exactDesc) return exactDesc;
    return locateByContentDesc(n, new RegExp(`^Open class analytics: ${classLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), {
      requireClickable: true,
      pick: 'top',
    });
  };
  const classDrillId = `analytics-drill-class-${FIXTURE.classroomId}`;
  const quizDrillId = `analytics-drill-quiz-${FIXTURE.quizId}-${FIXTURE.sessionId}`;
  const tapOpenClassCardOnce = (classTap) => {
    tapTarget(classTap);
    sleep(6000);
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
  const dateApply = applyFixtureAnalyticsDateRange(log);
  if (!dateApply.ok) {
    return failJourneyB(log, { label: dateApply.label, pass: false, ...dateApply });
  }
  if (!assertAnalyticsDrillIdentity(log, 'analytics-drill-classes', 'b-after-date-apply')) {
    return failJourneyB(log, { label: 'analytics_drill_classes_after_date', pass: false });
  }
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
  const isValidClassTap = (tap) =>
    tap &&
    (tap.kind === 'testId' ||
      (tap.kind === 'contentDesc' && /^Open class analytics:/i.test(String(tap.label || ''))));
  if (classTap && !isValidClassTap(classTap)) {
    log.steps.push({ step: 'reject_ambiguous_class_tap', tap: classTap });
    classTap = null;
  }
  if (!classTap) {
    log.pass = false;
    log.verify = { label: 'analytics_class_selection', pass: false };
    writeFileSync(join(evidence, 'journey-b.json'), JSON.stringify(log, null, 2));
    return log;
  }
  log.steps.push({ step: 'open_class', tap: classTap });
  tapOpenClassCardOnce(classTap);
  const viewAnalyticsId = `analytics-quiz-view-${FIXTURE.quizId}-${FIXTURE.sessionId}-open`;
  const quizCardId = `analytics-quiz-card-${FIXTURE.quizId}-${FIXTURE.sessionId}`;
  let classDrillOk = assertAnalyticsDrillIdentity(log, classDrillId, 'b-after-class-open');
  if (!classDrillOk) {
    for (let retry = 0; retry < 3 && !classDrillOk; retry++) {
      const pathRetry = dump(`b-01-reopen-class-${retry}.xml`);
      const retryNodes = parseUiXml(readXmlContent(pathRetry));
      const stillOnClassList =
        locateByContentDesc(retryNodes, /Open class analytics:/i, { requireClickable: true }) != null ||
        locateByLabel(retryNodes, /Class Overview/i, { minY: 0 }) != null;
      if (!stillOnClassList) {
        log.steps.push({ step: 'open_class_retry_blocked', retry, reason: 'not_on_class_list' });
        break;
      }
      const retryTap = locateClassCard(readXmlContent(pathRetry));
      if (retryTap) {
        log.steps.push({ step: 'open_class_retry', retry, tap: retryTap });
        tapOpenClassCardOnce(retryTap);
        classDrillOk = assertAnalyticsDrillIdentity(log, classDrillId, `b-after-class-retry-${retry}`);
      }
    }
  }
  if (!classDrillOk) {
    return failJourneyB(log, { label: 'analytics_class_drill', pass: false, classTestId, classDrillId });
  }
  for (let s = 0; s < 2; s++) scrollDown();
  const resolveViewAnalyticsOnScreen = (xml) => {
    const n = parseUiXml(xml);
    return locateByTestId(n, viewAnalyticsId);
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
  for (let pageTry = 0; pageTry < 6 && !drillOpened; pageTry++) {
    scrollToTop(4);
    scrollToBottom(6);
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
      sleep(3000);
      drillOpened = assertAnalyticsDrillIdentity(log, quizDrillId, 'b-after-summary-row-first');
      if (drillOpened) break;
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
  if (shouldExecuteViewAnalyticsTap({ drillOpened, viewAnalyticsTap })) {
    log.steps.push({
      step: 'view_analytics',
      tap: tapTarget(viewAnalyticsTap),
      testId: viewAnalyticsId,
      expectedDrillIdentity: quizDrillId,
    });
    tapTarget(viewAnalyticsTap);
    sleep(2500);
    drillOpened = assertAnalyticsDrillIdentity(log, quizDrillId, 'b-after-view-analytics-tap');
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
        sleep(2500);
        drillOpened = assertAnalyticsDrillIdentity(log, quizDrillId, 'b-after-summary-row');
        if (drillOpened) break;
      }
      if (!tapAnalyticsPaginationNext(log, 'summary_pagination_next', pageTry, 'summary')) break;
    }
  }
  if (!drillOpened) {
    return failJourneyB(log, { label: 'analytics_view_analytics', pass: false, testId: viewAnalyticsId });
  }
  if (!assertAnalyticsDrillIdentity(log, quizDrillId, 'b-after-quiz-drill')) {
    return failJourneyB(log, { label: 'analytics_quiz_drill', pass: false, quizDrillId });
  }
  const viewResultId = `analytics-view-result-${FIXTURE.quizId}-${FIXTURE.sessionId}-${FIXTURE.studentId}-${FIXTURE.attemptId}`;
  sleep(1500);
  if (!assertAnalyticsDrillIdentity(log, quizDrillId, 'b-before-view-result')) {
    return failJourneyB(log, { label: 'analytics_quiz_drill_before_result', pass: false, quizDrillId });
  }

  for (let i = 0; i < 4; i++) scrollUp();
  const locateStudentResult = (xml) => locateByTestId(parseUiXml(xml), viewResultId);
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
  if (!viewResultTap) {
    return failJourneyB(log, { label: 'analytics_saved_result', pass: false, viewResultId });
  }
  log.steps.push({
    step: 'view_result_identity',
    quizId: FIXTURE.quizId,
    sessionId: FIXTURE.sessionId,
    classroomId: FIXTURE.classroomId,
    studentId: FIXTURE.studentId,
    attemptId: FIXTURE.attemptId,
  });
  log.steps.push({ step: 'open_saved_result', tap: tapTarget(viewResultTap), testId: viewResultId });
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
  if (which === 'all' && results.a?.pass) {
    const transitionLog = { steps: [] };
    const shellOk = await returnToMainShell(transitionLog, { dumpNamePrefix: 'ab-transition' });
    writeFileSync(
      join(evidence, 'journey-ab-transition.json'),
      JSON.stringify(transitionLog, null, 2),
    );
    if (!shellOk) {
      results.b = {
        journey: 'B_analytics_view_analytics_result',
        steps: transitionLog.steps,
        pass: false,
        verify: { label: 'journey_transition_to_main_shell_failed', pass: false, ok: false },
      };
      writeFileSync(join(evidence, 'journey-b.json'), JSON.stringify(results.b, null, 2));
      failed = true;
    }
  }
  if ((which === 'b' || which === 'all') && !results.b) {
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
