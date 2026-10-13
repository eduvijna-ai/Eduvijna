import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  hasExactAnalyticsDrillIdentity,
  isEduvijnaAppForeground,
  isMainTabShellVisible,
  locateByLabel,
  locateByTestId,
  parseUiXml,
  readAnalyticsClassDrillHeroQuizPageState,
  readAnalyticsQuizPageMembers,
  analyticsPageMembersContainFixture,
  readAnalyticsQuizPagerState,
  shouldExecuteViewAnalyticsTap,
  verifyStudentListDestination,
  verifyWorksheetResultScreen,
  assertClassDrillInvariant,
  buildMobileQuizDiscoveryState,
  classifyFixtureDiscoveryOutcome,
  findSafeAnalyticsClassDrillScrollStart,
  findClassDrillNestedScrollViewport,
  locateAnalyticsQuizListSectionAnchor,
  deriveBoundedVerticalSwipeInRect,
  locateFixtureViewAnalyticsTap,
  locateFixtureSavedResultTap,
  classifySavedResultLocateFailure,
  buildFixtureViewportProgressSignature,
  shouldTerminateFixtureViewportSearch,
  inferQuizListRepositionDirection,
  isTapTargetWithinScrollViewport,
} from '../lib/android-journey-logic.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (name) => readFileSync(join(here, 'fixtures', name), 'utf8');

const FIXTURE = {
  quizId: 479,
  studentId: '70',
  studentName: 'Aarya',
  attemptId: 207,
  sessionId: 'a6882262-5c50-4cf5-a4a8-dc8786862916',
  classroomId: 'class_4d82c60e',
  expectedScore: 60,
  expectedEvaluatedItems: 10,
  expectedCorrect: 6,
  quizTitle: 'MAT Mathematics Worksheet',
  classLabel: 'Grade 8 A',
};

test('app detection reads XML content not path', () => {
  const pathLike = 'C:\\fake\\com.eduvijna.app.xml';
  assert.equal(isEduvijnaAppForeground(pathLike), false);
  assert.equal(isEduvijnaAppForeground(fx('app-foreground.xml')), true);
});

test('testID selection is attribute-order independent', () => {
  const nodes = parseUiXml(fx('assessments-students-control.xml'));
  const hit = locateByTestId(nodes, 'assessment-open-students-479-a6882262');
  assert.ok(hit);
  assert.equal(hit.x > 0 && hit.y > 0, true);
});

test('human label fallback locates without tap side effects', () => {
  const nodes = parseUiXml(fx('assessments-students-control.xml'));
  const hit = locateByLabel(nodes, 'View students for MAT Mathematics');
  assert.ok(hit);
});

test('locate helpers do not tap (pure functions)', () => {
  const nodes = parseUiXml(fx('assessments-students-control.xml'));
  const before = JSON.stringify(nodes);
  locateByTestId(nodes, 'assessment-open-students-479');
  locateByLabel(nodes, 'View students');
  assert.equal(before, JSON.stringify(nodes));
});

test('wrong assignment student list rejected', () => {
  const bad = verifyStudentListDestination(fx('student-list-wrong.xml'), FIXTURE);
  assert.equal(bad.pass, false);
  const good = verifyStudentListDestination(fx('student-list-correct.xml'), FIXTURE);
  assert.equal(good.pass, true);
});

test('view analytics tap is skipped when drillOpened was pre-set from button presence', () => {
  const fakeTap = { kind: 'testId', label: 'analytics-quiz-view-479-x-open' };
  const buggyDrillOpened = Boolean(fakeTap);
  assert.equal(shouldExecuteViewAnalyticsTap({ drillOpened: buggyDrillOpened, viewAnalyticsTap: fakeTap }), false);
  assert.equal(shouldExecuteViewAnalyticsTap({ drillOpened: false, viewAnalyticsTap: fakeTap }), true);
});

test('exact analytics drill identity rejects generic drill UI without marker', () => {
  const genericOnly = parseUiXml(
    '<node text="Back to Quizzes" content-desc="" bounds="[0,100][100,200]"/>' +
      '<node text="View Analytics" content-desc="" bounds="[0,300][100,400]"/>',
  );
  assert.equal(hasExactAnalyticsDrillIdentity(genericOnly, 'analytics-drill-class-class_4d82c60e'), false);
  const exact = parseUiXml(
    '<node text="" content-desc="analytics-drill-class-class_4d82c60e" bounds="[0,0][1080,120]"/>',
  );
  assert.equal(hasExactAnalyticsDrillIdentity(exact, 'analytics-drill-class-class_4d82c60e'), true);
});

test('class drill hero exposes quiz-page state in accessibility label', () => {
  const xml =
    '<node resource-id="analytics-drill-class-class_9" content-desc="analytics-drill-class-class_9 quiz-page-3-of-5 quiz-count-25" bounds="[0,0][10,10]"/>';
  const state = readAnalyticsClassDrillHeroQuizPageState(xml, 'analytics-drill-class-class_9');
  assert.equal(state.current, 3);
  assert.equal(state.totalPages, 5);
  assert.equal(state.quizCount, 25);
});

test('quiz page members accessibility exposes paginated quiz identities', () => {
  const xml =
    '<node resource-id="analytics-quiz-page-members" content-desc="analytics-quiz-page-members page-3 474:a4f24fe6-3c02-4372-9248-e8c3267c4c05 479:a6882262-5c50-4cf5-a4a8-dc8786862916" bounds="[0,0][10,10]"/>';
  const state = readAnalyticsQuizPageMembers(xml);
  assert.equal(state.page, 3);
  assert.equal(state.members.length, 2);
  assert.equal(
    analyticsPageMembersContainFixture(state.members, {
      quizId: 479,
      sessionId: 'a6882262-5c50-4cf5-a4a8-dc8786862916',
    }),
    true,
  );
});

test('class drill hero quiz-members suffix is readable when section is off-screen', () => {
  const xml =
    '<node resource-id="analytics-drill-class-class_9" content-desc="analytics-drill-class-class_9 quiz-page-3-of-5 quiz-count-25 quiz-members-474:a4f24fe6-3c02-4372-9248-e8c3267c4c05;479:a6882262-5c50-4cf5-a4a8-dc8786862916" bounds="[0,0][10,10]"/>';
  const state = readAnalyticsQuizPageMembers(xml, 'analytics-drill-class-class_9');
  assert.equal(state.page, 3);
  assert.equal(state.source, 'hero');
  assert.equal(state.members.length, 2);
});

test('quiz pager state reads analytics-quiz-pagination-info label', () => {
  const xml =
    '<node resource-id="analytics-quiz-pagination-info" content-desc="Analytics quiz page 3 of 5" bounds="[0,0][10,10]"/>';
  const state = readAnalyticsQuizPagerState(xml);
  assert.equal(state.current, 3);
  assert.equal(state.totalPages, 5);
});

test('main tab shell requires Home Assessments and Analytics tabs', () => {
  const partial = parseUiXml(
    '<node text="Home" bounds="[0,1700][200,1900]"/>' +
      '<node text="Assessments" bounds="[200,1700][400,1900]"/>',
  );
  assert.equal(isMainTabShellVisible(partial), false);
  const full = parseUiXml(
    '<node text="Home" bounds="[0,1700][200,1900]"/>' +
      '<node text="Assessments" bounds="[200,1700][400,1900]"/>' +
      '<node text="Analytics" bounds="[400,1700][600,1900]"/>',
  );
  assert.equal(isMainTabShellVisible(full), true);
});

test('unrelated bare numbers do not pass worksheet metrics', () => {
  const bad = verifyWorksheetResultScreen(fx('result-unrelated-numbers.xml'), FIXTURE);
  assert.equal(bad.pass, false);
  assert.equal(bad.unrelatedNumberTrap, true);
  const good = verifyWorksheetResultScreen(fx('result-worksheet.xml'), FIXTURE);
  assert.equal(good.pass, true);
});

test('incomplete page traversal cannot classify Case C', () => {
  const fixtureIdentity = { quizId: 479, sessionId: FIXTURE.sessionId };
  const discovery = {
    mobilePageMemberships: [{ page: 1, members: [{ quizId: 541, sessionId: 'x' }], hero: { current: 1, totalPages: 3 } }],
    totalPages: 3,
    discoveryState: buildMobileQuizDiscoveryState(
      [{ page: 1, members: [], hero: { current: 1 } }],
      3,
    ),
  };
  assert.equal(discovery.discoveryState.discoveryComplete, false);
  const caseLabel = classifyFixtureDiscoveryOutcome(
    { found: true, apiHintPage: 3, pageMembers: [{ quizId: 479, sessionId: FIXTURE.sessionId }] },
    discovery,
    false,
    fixtureIdentity,
  );
  assert.equal(caseLabel, null);
});

test('Case C requires full discovery and fixture absent on every page', () => {
  const fixtureIdentity = { quizId: 479, sessionId: FIXTURE.sessionId };
  const memberships = [
    { page: 1, members: [{ quizId: 541, sessionId: 'a' }], hero: { current: 1, totalPages: 3 } },
    { page: 2, members: [{ quizId: 540, sessionId: 'b' }], hero: { current: 2, totalPages: 3 } },
    { page: 3, members: [{ quizId: 538, sessionId: 'c' }], hero: { current: 3, totalPages: 3 } },
  ];
  const discovery = {
    mobilePageMemberships: memberships,
    totalPages: 3,
    discoveryState: buildMobileQuizDiscoveryState(memberships, 3),
  };
  assert.equal(discovery.discoveryState.discoveryComplete, true);
  assert.equal(
    classifyFixtureDiscoveryOutcome({ found: true, apiHintPage: 3, pageMembers: [fixtureIdentity] }, discovery, false, fixtureIdentity),
    'C',
  );
});

test('unexpected quiz drill before fixture tap fails class drill invariant', () => {
  const classDrill = 'analytics-drill-class-class_4d82c60e';
  const xml =
    '<node resource-id="analytics-drill-quiz-531-1f380dcc-917c-4894-90b6-71877cfdde56" content-desc="analytics-drill-quiz-531-1f380dcc-917c-4894-90b6-71877cfdde56 classroom-class_4d82c60e" bounds="[0,221][1080,427]"/>';
  const result = assertClassDrillInvariant(xml, classDrill, { actionAttempted: 'quiz_pagination_probe_down' });
  assert.equal(result.ok, false);
  assert.equal(result.label, 'analytics_navigation_drift_during_quiz_discovery');
  assert.match(String(result.observedDrillIdentity), /analytics-drill-quiz-531/);
});

test('class drill invariant holds on exact class drill marker', () => {
  const classDrill = 'analytics-drill-class-class_4d82c60e';
  const xml =
    `<node resource-id="${classDrill}" content-desc="${classDrill} quiz-page-1-of-3 quiz-count-28" bounds="[0,221][1080,427]"/>` +
    '<node text="Card body" clickable="false" bounds="[120,900][400,940]"/>';
  const result = assertClassDrillInvariant(xml, classDrill, { actionAttempted: 'safe_scroll' });
  assert.equal(result.ok, true);
  const nodes = parseUiXml(xml);
  const safe = findSafeAnalyticsClassDrillScrollStart(nodes);
  assert.ok(safe);
  assert.equal(safe.clickableOverlapAtStart, false);
});

test('nested scroll viewport is derived from scrollable class drill list', () => {
  const xml =
    '<node class="android.widget.ScrollView" scrollable="true" bounds="[0,721][1080,1700]"/>' +
    '<node class="android.widget.ScrollView" scrollable="false" bounds="[0,0][1080,500]"/>';
  const rect = findClassDrillNestedScrollViewport(parseUiXml(xml));
  assert.equal(rect?.y1, 721);
  assert.equal(rect?.y2, 1700);
});

test('clipped quiz section infers upward reposition when summary is visible', () => {
  const xml =
    '<node resource-id="analytics-class-quiz-list-section" bounds="[42,2400][1038,2500]"/>' +
    '<node text="Open quiz summary for DEV_MATRIX" bounds="[42,1200][900,1280]"/>';
  const scrollRect = { x1: 0, y1: 721, x2: 1080, y2: 1700, cx: 540, cy: 1210 };
  const progress = buildFixtureViewportProgressSignature(
    parseUiXml(xml),
    'analytics-quiz-view-479-a6882262-5c50-4cf5-a4a8-dc8786862916-open',
    'analytics-quiz-card-479-a6882262-5c50-4cf5-a4a8-dc8786862916',
    scrollRect,
  );
  assert.equal(progress.anchorInViewport, false);
  assert.equal(progress.seesQuizSummarySection, true);
  assert.equal(inferQuizListRepositionDirection(progress), 'up');
});

test('missing scroll viewport anchor terminates with bounded no-progress label', () => {
  const terminate = shouldTerminateFixtureViewportSearch({
    noProgressStreak: 3,
    attempt: 2,
    maxAttempts: 14,
  });
  assert.equal(terminate.terminate, true);
  assert.equal(terminate.label, 'analytics_fixture_viewport_no_progress');
});

test('fixture view analytics requires visible bounds inside scroll viewport', () => {
  const scrollRect = { x1: 0, y1: 721, x2: 1080, y2: 1700, cx: 540, cy: 1210 };
  const xml =
    '<node class="android.widget.ScrollView" scrollable="true" bounds="[0,721][1080,1700]"/>' +
    '<node resource-id="analytics-quiz-view-479-a6882262-5c50-4cf5-a4a8-dc8786862916-open" clickable="true" bounds="[89,964][999,1078]"/>';
  const nodes = parseUiXml(xml);
  const inView = locateFixtureViewAnalyticsTap(
    nodes,
    'analytics-quiz-view-479-a6882262-5c50-4cf5-a4a8-dc8786862916-open',
    scrollRect,
  );
  assert.ok(inView);
  assert.equal(isTapTargetWithinScrollViewport(inView, scrollRect), true);
  const clippedXml =
    '<node class="android.widget.ScrollView" scrollable="true" bounds="[0,721][1080,1700]"/>' +
    '<node resource-id="analytics-quiz-view-479-a6882262-5c50-4cf5-a4a8-dc8786862916-open" clickable="true" bounds="[89,2400][999,2500]"/>';
  assert.equal(
    locateFixtureViewAnalyticsTap(
      parseUiXml(clippedXml),
      'analytics-quiz-view-479-a6882262-5c50-4cf5-a4a8-dc8786862916-open',
      scrollRect,
    ),
    null,
  );
  const swipeUp = deriveBoundedVerticalSwipeInRect(scrollRect, 'up');
  assert.ok(swipeUp.startY < swipeUp.endY);
  const swipeDown = deriveBoundedVerticalSwipeInRect(scrollRect, 'down');
  assert.ok(swipeDown.startY > swipeDown.endY);
});

test('saved result locate failure classifies clipped student attempt row', () => {
  const scrollRect = { x1: 0, y1: 721, x2: 1080, y2: 1700, cx: 540, cy: 1210 };
  const viewResultId =
    'analytics-view-result-479-a6882262-5c50-4cf5-a4a8-dc8786862916-70-207';
  const studentAttemptId = 'analytics-student-attempt-70-207';
  const clippedXml =
    '<node class="android.widget.ScrollView" scrollable="true" bounds="[0,721][1080,1700]"/>' +
    `<node resource-id="${studentAttemptId}" bounds="[42,721][1038,735]"/>`;
  const clipped = classifySavedResultLocateFailure(
    parseUiXml(clippedXml),
    viewResultId,
    studentAttemptId,
    scrollRect,
  );
  assert.equal(clipped.reason, 'view_result_row_clipped_in_main_scroll');
  const fullXml =
    '<node class="android.widget.ScrollView" scrollable="true" bounds="[0,721][1080,1700]"/>' +
    `<node resource-id="${studentAttemptId}" bounds="[42,900][1038,1200]"/>` +
    `<node resource-id="${viewResultId}" clickable="true" bounds="[89,1100][999,1180]"/>`;
  const nodes = parseUiXml(fullXml);
  assert.ok(locateFixtureSavedResultTap(nodes, viewResultId, scrollRect));
  const offscreenXml =
    '<node class="android.widget.ScrollView" scrollable="true" bounds="[0,721][1080,1700]"/>' +
    `<node resource-id="${studentAttemptId}" bounds="[42,900][1038,1200]"/>` +
    `<node resource-id="${viewResultId}" clickable="true" bounds="[89,1680][999,1750]"/>`;
  assert.equal(
    classifySavedResultLocateFailure(
      parseUiXml(offscreenXml),
      viewResultId,
      studentAttemptId,
      scrollRect,
    ).reason,
    'view_result_cta_offscreen_in_scroll_viewport',
  );
});

test('unexpected quiz drill still fails class drill invariant during viewport search', () => {
  const classDrill = 'analytics-drill-class-class_4d82c60e';
  const xml =
    '<node resource-id="analytics-drill-quiz-531-abc" content-desc="analytics-drill-quiz-531-abc" bounds="[0,221][1080,427]"/>';
  const result = assertClassDrillInvariant(xml, classDrill, {
    actionAttempted: 'fixture_quiz_section_reposition',
  });
  assert.equal(result.label, 'analytics_navigation_drift_during_quiz_discovery');
});

test('safe scroll start avoids View Analytics clickable bounds', () => {
  const xml =
    '<node resource-id="analytics-drill-class-class_4d82c60e" content-desc="analytics-drill-class-class_4d82c60e quiz-page-1-of-3" bounds="[0,221][1080,427]"/>' +
    '<node resource-id="analytics-quiz-view-531-abc-open" clickable="true" bounds="[89,1500][999,1610]"/>' +
    '<node text="HIGHEST" clickable="false" bounds="[255,1200][368,1250]"/>';
  const safe = findSafeAnalyticsClassDrillScrollStart(parseUiXml(xml));
  assert.ok(safe);
  assert.equal(safe.y < 1500 || safe.y > 1610, true);
});
