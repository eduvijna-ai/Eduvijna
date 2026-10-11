import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  isEduvijnaAppForeground,
  locateByLabel,
  locateByTestId,
  parseUiXml,
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

test('unrelated bare numbers do not pass worksheet metrics', () => {
  const bad = verifyWorksheetResultScreen(fx('result-unrelated-numbers.xml'), FIXTURE);
  assert.equal(bad.pass, false);
  assert.equal(bad.unrelatedNumberTrap, true);
  const good = verifyWorksheetResultScreen(fx('result-worksheet.xml'), FIXTURE);
  assert.equal(good.pass, true);
});
