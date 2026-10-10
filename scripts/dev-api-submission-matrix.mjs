/**
 * Runs live assigned-quiz submission matrix via mobile submitAssignedQuiz service (Jest).
 * Writes redacted docs/development/e2e-fixtures/submission-matrix-redacted.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { getDevApiBase } from './lib/dev-api-auth.mjs';
import { redactDeep, redactFreeText } from './lib/trace-redact.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const out = join(repoRoot, 'docs', 'development', 'e2e-fixtures', 'submission-matrix-redacted.json');

function main() {
  const report = {
    verifiedAt: new Date().toISOString(),
    apiBase: getDevApiBase(),
    status: 'pending',
    serviceUnderTest: 'submitAssignedQuiz + quizSubmissionCheckpoint (mobile core)',
    limitations: [],
    jest: null,
  };

  if (!existsSync(credFile)) {
    report.status = 'pending_credentials';
    report.limitations.push('Missing gitignored .dev-api-credentials.local.json');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(redactDeep(report), null, 2));
    console.log(`Wrote ${out} (credentials missing)`);
    process.exit(2);
  }

  const jestRun = spawnSync('npm test -- --config jest.live.config.cjs --runInBand --forceExit', {
    cwd: repoRoot,
    env: { ...process.env, EDUVIJNA_LIVE_DEV_API: '1' },
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    shell: true,
  });

  report.jest = redactDeep({
    exitCode: jestRun.status,
    signal: jestRun.signal,
    stdoutTail: redactFreeText((jestRun.stdout || '').slice(-4000)),
    stderrTail: redactFreeText((jestRun.stderr || '').slice(-2000)),
  });
  report.status = jestRun.status === 0 ? 'passed' : 'failed';
  if (jestRun.status !== 0) {
    report.limitations.push(
      'Jest live matrix did not pass; see stdoutTail/stderrTail (redacted).',
    );
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(redactDeep(report), null, 2));
  console.log(`Wrote ${out} (status=${report.status})`);
  process.exit(jestRun.status === 0 ? 0 : 1);
}

main();
