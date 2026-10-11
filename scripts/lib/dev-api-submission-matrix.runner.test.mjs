import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateMatrixReport } from './dev-api-submission-matrix-eval.mjs';
import { runSubmissionMatrixOrchestrator } from '../dev-api-submission-matrix.mjs';

const fakeAccounts = {
  instructor: { token: 't-inst', userId: 'inst-1' },
  student: { token: 't-stu', userId: 'stu-1' },
};

function writeMinimalCred(runDir) {
  const credPath = join(runDir, 'cred.json');
  writeFileSync(
    credPath,
    JSON.stringify({
      accounts: {
        instructor: { username: 'demo', password: 'demo' },
        student: { username: 'demo', password: 'demo' },
      },
    }),
  );
  return credPath;
}

test('evaluateMatrixReport fails when required step missing', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'matrix-eval-'));
  const report = {
    status: 'passed',
    steps: [{ step: 'load_credentials', status: 'passed' }],
    limitations: [],
  };
  const out = evaluateMatrixReport(report, runDir);
  assert.equal(out.status, 'failed');
  assert.ok(out.evaluationFailures.some((l) => l.startsWith('missing_required_step:')));
});

test('evaluateMatrixReport fails when phase markers absent', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'matrix-eval-'));
  const report = {
    status: 'passed',
    steps: [
      'load_credentials',
      'login_accounts',
      'create_disposable_fixture',
      'phase1_interrupt_checkpoint',
      'phase2_recover_and_persist',
    ].map((step) => ({ step, status: 'passed' })),
    limitations: [],
  };
  const out = evaluateMatrixReport(report, runDir);
  assert.equal(out.status, 'failed');
  assert.ok(out.evaluationFailures.includes('missing_marker:phase1.ok'));
});

test('evaluateMatrixReport passes with cleanup limitation only on report', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'matrix-eval-'));
  writeFileSync(join(runDir, 'phase1.ok'), '1');
  writeFileSync(join(runDir, 'phase2.ok'), '1');
  const report = {
    status: 'passed',
    steps: [
      'load_credentials',
      'login_accounts',
      'create_disposable_fixture',
      'phase1_interrupt_checkpoint',
      'phase2_recover_and_persist',
    ].map((step) => ({ step, status: 'passed' })),
    limitations: ['cleanup_not_supported_by_api'],
  };
  const out = evaluateMatrixReport(report, runDir);
  assert.equal(out.status, 'passed');
  assert.equal(out.evaluationFailures.length, 0);
});

test('orchestrator records failed login without passing overall', async () => {
  const runDir = mkdtempSync(join(tmpdir(), 'matrix-run-'));
  const credPath = join(runDir, 'cred.json');
  writeFileSync(
    credPath,
    JSON.stringify({
      accounts: {
        instructor: { username: 'bad', password: 'bad' },
        student: { username: 'bad2', password: 'bad2' },
      },
    }),
  );
  const report = await runSubmissionMatrixOrchestrator({
    credFile: credPath,
    runDir,
    skipJest: true,
    apiBase: 'https://dev-api.eduvijna.com',
  });
  assert.equal(report.status, 'failed');
  assert.ok(report.steps.some((s) => s.step === 'login_accounts' && s.status === 'failed'));
});

test('orchestrator records failed fixture creation', async () => {
  const runDir = mkdtempSync(join(tmpdir(), 'matrix-run-'));
  const credPath = writeMinimalCred(runDir);
  const report = await runSubmissionMatrixOrchestrator({
    credFile: credPath,
    runDir,
    skipJest: true,
    apiBase: 'https://dev-api.eduvijna.com',
    testHooks: {
      loginAccounts: async () => fakeAccounts,
      createFixture: async () => {
        throw new Error('fixture_create_failed');
      },
    },
  });
  assert.equal(report.status, 'failed');
  assert.ok(
    report.steps.some((s) => s.step === 'create_disposable_fixture' && s.status === 'failed'),
  );
});

test('orchestrator skipJest fails when phase markers absent', async () => {
  const runDir = mkdtempSync(join(tmpdir(), 'matrix-run-'));
  const credPath = writeMinimalCred(runDir);
  const report = await runSubmissionMatrixOrchestrator({
    credFile: credPath,
    runDir,
    skipJest: true,
    apiBase: 'https://dev-api.eduvijna.com',
    testHooks: {
      loginAccounts: async () => fakeAccounts,
      createFixture: async () => ({
        quizId: 'quiz-1',
        sessionId: 'sess-1',
        classroomId: 'class-1',
        topic: 'matrix-test',
      }),
    },
  });
  assert.equal(report.status, 'failed');
  assert.ok(report.evaluationFailures.includes('missing_marker:phase1.ok'));
  assert.ok(report.evaluationFailures.includes('missing_marker:phase2.ok'));
});

test('orchestrator preserves failed status when phase step failed', async () => {
  const runDir = mkdtempSync(join(tmpdir(), 'matrix-run-'));
  writeFileSync(join(runDir, 'phase1.ok'), '1');
  const report = {
    status: 'failed',
    steps: [
      { step: 'load_credentials', status: 'passed' },
      { step: 'login_accounts', status: 'passed' },
      { step: 'create_disposable_fixture', status: 'passed' },
      { step: 'phase1_interrupt_checkpoint', status: 'passed' },
      { step: 'phase2_recover_and_persist', status: 'failed' },
    ],
    limitations: ['phase2_recovery_or_marker_failed'],
  };
  const evaluated = evaluateMatrixReport(report, runDir);
  assert.equal(evaluated.status, 'failed');
  assert.ok(evaluated.evaluationFailures.includes('missing_marker:phase2.ok'));
});
