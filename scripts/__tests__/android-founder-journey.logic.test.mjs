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
