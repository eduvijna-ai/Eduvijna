/**
 * Isolated stack validation: dev exports + TS/ESLint delta vs immediate merge base.
 * Uses detached checkouts in the primary repo (correct App/node_modules resolution).
 * Does not start Metro or attach to port 8082.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { execSync } from 'node:child_process';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const exportRoot = join(repoRoot, '.stack-export-check');
const reportPath = join(repoRoot, 'docs', 'development', 'e2e-fixtures', 'stack-validation-report.json');

const STACK = [
  { pr: 18, branch: 'feat/mobile-assigned-quiz-phase1', base: 'main' },
  { pr: 19, branch: 'feat/mobile-phase2-student-dashboard-parity', base: 'feat/mobile-assigned-quiz-phase1' },
  { pr: 21, branch: 'feat/mobile-phase3-document-quiz-runtime', base: 'feat/mobile-phase2-student-dashboard-parity' },
  { pr: 22, branch: 'feat/mobile-phase4-role-profile-popups', base: 'feat/mobile-phase3-document-quiz-runtime' },
  { pr: 23, branch: 'feat/mobile-phase5-deep-links', base: 'feat/mobile-phase4-role-profile-popups' },
  { pr: 24, branch: 'feat/mobile-phase6-push-notifications', base: 'feat/mobile-phase5-deep-links' },
];

const PLATFORMS = ['android', 'ios', 'web'];

function git(args, cwd = repoRoot) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8' }).trim();
}

function resolveBaseRef(baseBranch) {
  try {
    git(`rev-parse --verify origin/${baseBranch}`);
    return `origin/${baseBranch}`;
  } catch {
    return baseBranch;
  }
}

function captureRestorePoint() {
  const sha = git('rev-parse HEAD');
  let branch = null;
  try {
    branch = git('symbolic-ref --short HEAD');
  } catch {
    // detached HEAD
  }
  return { sha, branch };
}

function restoreRepo(point) {
  if (point.branch) {
    execSync(`git checkout "${point.branch}"`, { cwd: repoRoot, stdio: 'ignore' });
    return;
  }
  execSync(`git checkout --detach "${point.sha}"`, { cwd: repoRoot, stdio: 'ignore' });
}

function checkoutDetached(ref) {
  execSync(`git checkout --detach "${ref}"`, { cwd: repoRoot, stdio: 'ignore' });
}

function countDiagnostics(output, pattern) {
  const matches = output.match(pattern);
  return matches ? matches.length : 0;
}

function runDiagnostics() {
  const type = spawnSync('npm run type-check', {
    cwd: repoRoot,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  const lint = spawnSync('npm run lint', {
    cwd: repoRoot,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });
  const typeOut = `${type.stdout || ''}\n${type.stderr || ''}`;
  const lintOut = `${lint.stdout || ''}\n${lint.stderr || ''}`;
  return {
    typeCheckExit: type.status ?? 1,
    eslintExit: lint.status ?? 1,
    tsErrorCount: countDiagnostics(typeOut, /error TS\d+:/g),
    eslintErrorCount: countDiagnostics(lintOut, /\berror\b/gi),
    tsOutputBytes: typeOut.length,
    eslintOutputBytes: lintOut.length,
  };
}

function runExports(branchKey) {
  const results = {};
  for (const platform of PLATFORMS) {
    const outDir = join(exportRoot, branchKey, platform);
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(dirname(outDir), { recursive: true });
    const cmd = `node scripts/with-eduvijna-api-env.mjs development -- expo export --platform ${platform} --output-dir "${outDir}"`;
    const started = Date.now();
    const proc = spawnSync(cmd, {
      cwd: repoRoot,
      shell: true,
      encoding: 'utf8',
      maxBuffer: 24 * 1024 * 1024,
      env: { ...process.env, CI: '1' },
    });
    results[platform] = {
      exitCode: proc.status ?? 1,
      durationMs: Date.now() - started,
      outputDir: outDir,
      stdoutTail: (proc.stdout || '').slice(-800),
      stderrTail: (proc.stderr || '').slice(-800),
    };
  }
  return results;
}

const report = {
  validatedAt: new Date().toISOString(),
  exportRoot,
  checkoutMode: 'primary_repo_detached',
  commands: {
    export:
      'node scripts/with-eduvijna-api-env.mjs development -- expo export --platform <android|ios|web> --output-dir .stack-export-check/<branch>/<platform>',
    diagnostics: 'npm run type-check && npm run lint',
  },
  branches: [],
  status: 'running',
  error: null,
};

const restorePoint = captureRestorePoint();

try {
  execSync('git fetch origin', { cwd: repoRoot, stdio: 'ignore' });

  for (const row of STACK) {
    const head = git(`rev-parse origin/${row.branch}`);
    const baseRef = resolveBaseRef(row.base);
    const baseSha = git(`merge-base ${head} ${baseRef}`);
    const branchKey = `pr${row.pr}`;

    console.log(`\n=== PR #${row.pr} ${row.branch} @ ${head.slice(0, 12)} ===`);

    checkoutDetached(head);
    const headDiag = runDiagnostics();

    checkoutDetached(baseSha);
    const baseDiag = runDiagnostics();

    checkoutDetached(head);
    const exports = runExports(branchKey);

    report.branches.push({
      pr: row.pr,
      branch: row.branch,
      head,
      baseRef,
      baseSha,
      diagnostics: {
        head: headDiag,
        base: baseDiag,
        tsErrorsAdded: headDiag.tsErrorCount - baseDiag.tsErrorCount,
        eslintErrorsDelta: headDiag.eslintErrorCount - baseDiag.eslintErrorCount,
      },
      exports,
    });
  }

  const exportFailures = report.branches.some((b) =>
    Object.values(b.exports).some((e) => e.exitCode !== 0),
  );
  const diagnosticRegression = report.branches.some(
    (b) =>
      (b.diagnostics?.tsErrorsAdded ?? 0) > 0 ||
      (b.diagnostics?.eslintErrorsDelta ?? 0) > 0 ||
      (b.diagnostics?.head?.typeCheckExit ?? 0) !== 0 ||
      (b.diagnostics?.head?.eslintExit ?? 0) !== 0,
  );
  report.status = exportFailures
    ? 'export_failures'
    : diagnosticRegression
      ? 'diagnostic_regression'
      : 'passed';
  report.exportStatus = exportFailures ? 'failed' : 'passed';
  report.diagnosticStatus = diagnosticRegression ? 'regression' : 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = error?.message || String(error);
  throw error;
} finally {
  restoreRepo(restorePoint);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${reportPath} (status=${report.status})`);
  const shouldFail =
    report.status !== 'passed' ||
    report.branches?.some((b) => (b.diagnostics?.tsErrorsAdded ?? 0) > 0);
  process.exit(shouldFail ? 1 : 0);
}
