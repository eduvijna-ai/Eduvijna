/**
 * Live assigned-quiz submission matrix (submitAssignedQuiz + cross-process checkpoint).
 * Writes redacted docs/development/e2e-fixtures/submission-matrix-redacted.json
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const out = join(repoRoot, 'docs', 'development', 'e2e-fixtures', 'submission-matrix-redacted.json');
const runDir = join(repoRoot, '.dev-api-submission-matrix-run');

function step(name, status, detail = {}) {
  return { name, status, ...detail };
}

function runJestPhase(phase) {
  const apiBase = getDevApiBase();
  return spawnSync(
    `npm test -- --config jest.live.config.cjs --runInBand --forceExit --testPathPattern=assignedQuizSubmission.dev-api.live`,
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        EDUVIJNA_LIVE_DEV_API: '1',
        EDUVIJNA_MATRIX_PHASE: String(phase),
        EDUVIJNA_LIVE_CHECKPOINT_DIR: runDir,
        EDUVIJNA_API_BASE: apiBase,
      },
      encoding: 'utf8',
      maxBuffer: 12 * 1024 * 1024,
      shell: true,
    },
  );
}

async function main() {
  const apiBase = getDevApiBase();
  const report = {
    verifiedAt: new Date().toISOString(),
    apiBase,
    clientApiBaseExpected: apiBase,
    status: 'pending',
    serviceUnderTest: 'submitAssignedQuiz + quizSubmissionCheckpoint (mobile core)',
    steps: [],
    limitations: [],
  };

  const fail = (message) => {
    report.status = 'failed';
    report.limitations.push(message);
  };

  if (!existsSync(credFile)) {
    report.steps.push(step('credentials', 'skipped', { reason: 'missing_cred_file' }));
    report.status = 'pending_credentials';
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(redactDeep(report), null, 2));
    process.exit(2);
  }

  let fixture = null;
  let instructorToken = null;

  try {
    mkdirSync(runDir, { recursive: true });
    rmSync(join(runDir, 'phase1.ok'), { force: true });
    rmSync(join(runDir, 'phase2.ok'), { force: true });

    const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
    report.steps.push(step('load_credentials', 'passed'));

    const instructor = await loginMatrixAccount(
      cfg.accounts.instructor.username,
      cfg.accounts.instructor.password,
    );
    const student = await loginMatrixAccount(
      cfg.accounts.student.username,
      cfg.accounts.student.password,
    );
    instructorToken = instructor.token;
    report.steps.push(step('login_accounts', 'passed', { roles: ['instructor', 'student'] }));

    const classroom = await discoverClassroomForStudent(instructor.token, student.userId, apiBase);
    fixture = await createDisposableMatrixAssignment(
      instructor.token,
      instructor.userId,
      classroom.classroomId,
      apiBase,
    );
    report.steps.push(step('create_disposable_fixture', 'passed', { topic: fixture.topic }));

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
    writeFileSync(join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    writeFileSync(join(runDir, 'async-storage.json'), '{}');

    const phase1 = runJestPhase(1);
    report.steps.push(
      step('phase1_interrupt_checkpoint', phase1.status === 0 ? 'passed' : 'failed', {
        exitCode: phase1.status,
        stdoutTail: redactFreeText((phase1.stdout || '').slice(-2500)),
        stderrTail: redactFreeText((phase1.stderr || '').slice(-1500)),
      }),
    );
    if (phase1.status !== 0 || !existsSync(join(runDir, 'phase1.ok'))) {
      fail('Phase 1 did not persist checkpoint after simulated submission interrupt.');
    } else {
      const phase2 = runJestPhase(2);
      report.steps.push(
        step('phase2_recover_and_persist', phase2.status === 0 ? 'passed' : 'failed', {
          exitCode: phase2.status,
          stdoutTail: redactFreeText((phase2.stdout || '').slice(-2500)),
          stderrTail: redactFreeText((phase2.stderr || '').slice(-1500)),
        }),
      );
      if (phase2.status !== 0 || !existsSync(join(runDir, 'phase2.ok'))) {
        fail('Phase 2 recovery or persisted-result verification failed.');
      }
    }
  } catch (error) {
    report.steps.push(step('orchestrator', 'failed', { error: redactFreeText(error?.message || String(error)) }));
    fail(error?.message || 'matrix_orchestrator_error');
  } finally {
    if (fixture && instructorToken) {
      const cleanup = await cleanupDisposableMatrixAssignment(instructorToken, fixture, apiBase);
      report.steps.push(
        step('cleanup_disposable_fixture', cleanup.ok ? 'passed' : 'failed', redactDeep(cleanup)),
      );
    } else {
      report.steps.push(step('cleanup_disposable_fixture', 'skipped', { reason: 'no_fixture' }));
    }
  }

  const anyFailed = report.steps.some((s) => s.status === 'failed');
  const anySkipped = report.steps.some((s) => s.status === 'skipped');
  if (report.status !== 'pending_credentials') {
    report.status = anyFailed ? 'failed' : anySkipped ? 'passed_with_skips' : 'passed';
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(redactDeep(report), null, 2));
  console.log(`Wrote ${out} (status=${report.status})`);
  process.exit(anyFailed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
