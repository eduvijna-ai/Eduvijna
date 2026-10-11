/**
 * Live assigned-quiz submission matrix (submitAssignedQuiz + cross-process checkpoint).
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { getDevApiBase } from './lib/dev-api-auth.mjs';
import { redactDeep, redactFreeText } from './lib/trace-redact.mjs';
import {
  cleanupDisposableMatrixAssignment,
  createDisposableMatrixAssignment,
  discoverClassroomForStudent,
  loginMatrixAccount,
} from './lib/dev-api-disposable-assignment.mjs';
import { evaluateMatrixReport } from './lib/dev-api-submission-matrix-eval.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const out = join(repoRoot, 'docs', 'development', 'e2e-fixtures', 'submission-matrix-redacted.json');
const runDir = join(repoRoot, '.dev-api-submission-matrix-run');

function step(stepId, status, detail = {}) {
  return { step: stepId, status, ...detail };
}

export function runJestPhase(phase, options = {}) {
  const apiBase = options.apiBase ?? getDevApiBase();
  const runDirectory = options.runDir ?? runDir;
  const liveFlag = options.liveFlag ?? '1';
  const testPattern =
    options.testPattern ?? 'assignedQuizSubmission.dev-api.live';

  return spawnSync(
    `npm test -- --config jest.live.config.cjs --runInBand --forceExit --testPathPattern=${testPattern}`,
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        EDUVIJNA_LIVE_DEV_API: liveFlag,
        EDUVIJNA_MATRIX_PHASE: String(phase),
        EDUVIJNA_LIVE_CHECKPOINT_DIR: runDirectory,
        EDUVIJNA_API_BASE: apiBase,
      },
      encoding: 'utf8',
      maxBuffer: 12 * 1024 * 1024,
      shell: true,
    },
  );
}

export async function runSubmissionMatrixOrchestrator(options = {}) {
  const apiBase = options.apiBase ?? getDevApiBase();
  const runDirectory = options.runDir ?? runDir;
  const credPath = options.credFile ?? credFile;
  const skipJest = options.skipJest === true;
  const injectFixture = options.injectFixture ?? null;
  const testHooks = options.testHooks ?? null;

  const report = {
    verifiedAt: new Date().toISOString(),
    apiBase,
    clientApiBaseExpected: apiBase,
    status: 'pending',
    serviceUnderTest: 'submitAssignedQuiz + quizSubmissionCheckpoint (mobile core)',
    steps: [],
    limitations: [],
    comparisons: null,
  };

  const markFailed = (message) => {
    report.status = 'failed';
    if (message) report.limitations.push(message);
  };

  if (!existsSync(credPath)) {
    report.steps.push(step('load_credentials', 'skipped', { reason: 'missing_cred_file' }));
    report.status = 'pending_credentials';
    return report;
  }

  let fixture = null;
  let instructorToken = null;

  try {
    mkdirSync(runDirectory, { recursive: true });
    rmSync(join(runDirectory, 'phase1.ok'), { force: true });
    rmSync(join(runDirectory, 'phase2.ok'), { force: true });
    rmSync(join(runDirectory, 'phase2-comparisons.json'), { force: true });

    const cfg = JSON.parse(readFileSync(credPath, 'utf8'));
    report.steps.push(step('load_credentials', 'passed'));

    let instructor;
    let student;
    try {
      if (testHooks?.loginAccounts) {
        ({ instructor, student } = await testHooks.loginAccounts(cfg));
      } else {
        instructor = await loginMatrixAccount(
          cfg.accounts.instructor.username,
          cfg.accounts.instructor.password,
        );
        student = await loginMatrixAccount(
          cfg.accounts.student.username,
          cfg.accounts.student.password,
        );
      }
    } catch (error) {
      report.steps.push(step('login_accounts', 'failed', { error: redactFreeText(error?.message) }));
      markFailed('login_accounts_failed');
      return report;
    }
    instructorToken = instructor.token;
    report.steps.push(step('login_accounts', 'passed', { roles: ['instructor', 'student'] }));

    try {
      if (testHooks?.createFixture) {
        fixture = await testHooks.createFixture({ instructor, student, apiBase });
      } else if (typeof injectFixture === 'function') {
        fixture = await injectFixture({ instructor, student, apiBase });
      } else if (injectFixture) {
        fixture = injectFixture;
      } else {
        const classroom = await discoverClassroomForStudent(instructor.token, student.userId, apiBase);
        fixture = await createDisposableMatrixAssignment(
          instructor.token,
          instructor.userId,
          classroom.classroomId,
          apiBase,
        );
      }
      report.steps.push(step('create_disposable_fixture', 'passed', { topic: fixture.topic }));
    } catch (error) {
      report.steps.push(step('create_disposable_fixture', 'failed', { error: redactFreeText(error?.message) }));
      markFailed('create_disposable_fixture_failed');
      return report;
    }

    const manifest = {
      apiBase,
      studentId: student.userId,
      studentToken: student.token,
      instructorToken: instructor.token,
      quizId: fixture.quizId,
      sessionId: fixture.sessionId,
      classroomId: fixture.classroomId,
      topic: fixture.topic,
      selectedAnswer: '4',
    };
    writeFileSync(join(runDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2));
    writeFileSync(join(runDirectory, 'async-storage.json'), '{}');

    if (!skipJest) {
      const phase1 = runJestPhase(1, { apiBase, runDir: runDirectory });
      const phase1Passed = phase1.status === 0 && existsSync(join(runDirectory, 'phase1.ok'));
      report.steps.push(
        step('phase1_interrupt_checkpoint', phase1Passed ? 'passed' : 'failed', {
          exitCode: phase1.status,
          stdoutTail: redactFreeText((phase1.stdout || '').slice(-2500)),
          stderrTail: redactFreeText((phase1.stderr || '').slice(-1500)),
        }),
      );
      if (!phase1Passed) {
        markFailed('phase1_interrupt_or_marker_failed');
      } else {
        const phase2 = runJestPhase(2, { apiBase, runDir: runDirectory });
        const phase2Passed = phase2.status === 0 && existsSync(join(runDirectory, 'phase2.ok'));
        report.steps.push(
          step('phase2_recover_and_persist', phase2Passed ? 'passed' : 'failed', {
            exitCode: phase2.status,
            stdoutTail: redactFreeText((phase2.stdout || '').slice(-2500)),
            stderrTail: redactFreeText((phase2.stderr || '').slice(-1500)),
          }),
        );
        if (!phase2Passed) {
          markFailed('phase2_recovery_or_marker_failed');
        }
      }
    }
  } catch (error) {
    report.steps.push(step('orchestrator', 'failed', { error: redactFreeText(error?.message || String(error)) }));
    markFailed(error?.message || 'matrix_orchestrator_error');
  } finally {
    const cleanup = await cleanupDisposableMatrixAssignment(instructorToken, fixture);
    report.steps.push(step('cleanup_disposable_fixture', 'skipped', redactDeep(cleanup)));
    if (cleanup.limitation) {
      report.limitations.push(cleanup.limitation);
    }
    const comparisonsPath = join(runDirectory, 'phase2-comparisons.json');
    if (existsSync(comparisonsPath)) {
      try {
        report.comparisons = redactDeep(JSON.parse(readFileSync(comparisonsPath, 'utf8')));
      } catch {
        report.limitations.push('phase2_comparisons_unreadable');
      }
    }
  }

  const evaluated = evaluateMatrixReport(report, runDirectory);
  if (report.status !== 'pending_credentials') {
    if (report.status === 'failed') {
      report.evaluationFailures = evaluated.evaluationFailures;
    } else {
      report.status = evaluated.status;
      report.evaluationFailures = evaluated.evaluationFailures;
    }
  }
  return report;
}

async function main() {
  const skipJest = process.argv.includes('--skip-jest');
  const report = await runSubmissionMatrixOrchestrator({ skipJest });
  report.executionMode = skipJest
    ? 'orchestrator_only_no_jest_phases'
    : 'orchestrator_with_jest_phase1_phase2';
  report.commandLine =
    skipJest
      ? 'node scripts/dev-api-submission-matrix.mjs --skip-jest'
      : 'node scripts/dev-api-submission-matrix.mjs';
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(redactDeep(report), null, 2));
  console.log(`Wrote ${out} (status=${report.status}, mode=${report.executionMode})`);
  process.exit(report.status === 'passed' ? 0 : 1);
}

const isMain =
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
