/**
 * Isolated stack validation per PR worktree: exports + TS/ESLint identity delta vs immediate base.
 * Does not checkout or mutate the primary workspace branch (Metro 8082 safe).
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { execSync } from 'node:child_process';
import {
  collectTypeScriptIdentities,
  diffIdentities,
  parseEslintJsonReport,
} from './lib/diagnostic-identities.mjs';
import {
  resolveMonorepoRoot,
  resolveWorktreeCheckout,
} from './lib/stack-worktree-paths.mjs';

const scriptRepoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const monorepoRoot = resolveMonorepoRoot(scriptRepoRoot);
const reportPath = join(
  monorepoRoot,
  'docs',
  'development',
  'e2e-fixtures',
  'stack-validation-report.json',
);

const STACK = [
  { pr: 18, branch: 'feat/mobile-assigned-quiz-phase1', base: 'main' },
  { pr: 19, branch: 'feat/mobile-phase2-student-dashboard-parity', base: 'feat/mobile-assigned-quiz-phase1' },
  { pr: 21, branch: 'feat/mobile-phase3-document-quiz-runtime', base: 'feat/mobile-phase2-student-dashboard-parity' },
  { pr: 22, branch: 'feat/mobile-phase4-role-profile-popups', base: 'feat/mobile-phase3-document-quiz-runtime' },
  { pr: 23, branch: 'feat/mobile-phase5-deep-links', base: 'feat/mobile-phase4-role-profile-popups' },
  { pr: 24, branch: 'feat/mobile-phase6-push-notifications', base: 'feat/mobile-phase5-deep-links' },
];

const PLATFORMS = ['android', 'ios', 'web'];

function git(args, cwd) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8' }).trim();
}

function resolveBaseRef(baseBranch, cwd) {
  try {
    git(`rev-parse --verify origin/${baseBranch}`, cwd);
    return `origin/${baseBranch}`;
  } catch {
    return baseBranch;
  }
}

function countDiagnostics(output, pattern) {
  const matches = output.match(pattern);
  return matches ? matches.length : 0;
}

function extractDiagnosticIdentities(typeOut, lintJsonOut, repoRoot) {
  const ts = collectTypeScriptIdentities(typeOut);
  const eslint = parseEslintJsonReport(lintJsonOut, repoRoot);
  return { ts, eslint };
}

function diffAddedIdentities(headIds, baseIds) {
  return {
    tsAdded: diffIdentities(headIds.ts, baseIds.ts),
    eslintAdded: diffIdentities(headIds.eslint, baseIds.eslint),
  };
}

function isAllowedIntroducedIdentity(identity) {
  const file = String(identity).split('|')[0] || '';
  return (
    file.includes('/__tests__/') ||
    file.includes('\\__tests__\\') ||
    file.startsWith('scripts/') ||
    file.startsWith('scripts\\')
  );
}

function filterBlockingIdentities(added) {
  return {
    tsAdded: (added?.tsAdded ?? []).filter((id) => !isAllowedIntroducedIdentity(id)),
    eslintAdded: (added?.eslintAdded ?? []).filter((id) => !isAllowedIntroducedIdentity(id)),
  };
}

function runDiagnostics(repoRoot) {
  const type = spawnSync('npm run type-check', {
    cwd: repoRoot,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  const lint = spawnSync('npx eslint . --ext .ts,.tsx --format json', {
    cwd: repoRoot,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });
  const typeOut = `${type.stdout || ''}\n${type.stderr || ''}`;
  const lintJsonOut = `${lint.stdout || ''}`;
  const lintErrOut = `${lint.stderr || ''}`;
  const lintCombinedForCount = `${lintJsonOut}\n${lintErrOut}`;
  const identities = extractDiagnosticIdentities(typeOut, lintJsonOut, repoRoot);
  const toolFailure =
    type.status === null ||
    lint.status === null ||
    type.error ||
    lint.error ||
    (type.status !== 0 && identities.ts.length === 0 && typeOut.includes('error')) ||
    (lint.status !== 0 && identities.eslint.length === 0 && lintCombinedForCount.includes('error'));
  return {
    typeCheckExit: type.status ?? 1,
    eslintExit: lint.status ?? 1,
    tsErrorCount: countDiagnostics(typeOut, /error TS\d+:/g),
    eslintErrorCount: countDiagnostics(lintCombinedForCount, /"severity":\s*2/g),
    tsOutputBytes: typeOut.length,
    eslintOutputBytes: lintJsonOut.length + lintErrOut.length,
    identities,
    baselineDebt: {
      tsIdentities: identities.ts,
      eslintIdentities: identities.eslint,
    },
    toolFailure: Boolean(toolFailure),
  };
}

function runExports(repoRoot, branchKey) {
  const exportRoot = join(repoRoot, '.stack-export-check');
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

export function validateStackBranch(row, options = {}) {
  const skipExports = options.skipExports === true;
  const cwd = resolveWorktreeCheckout(monorepoRoot, row.branch);
  execSync('git fetch origin', { cwd: monorepoRoot, stdio: 'ignore' });

  const head = git(`rev-parse origin/${row.branch}`, cwd);
  const baseRef = resolveBaseRef(row.base, cwd);
  const immediateBaseSha = git(`rev-parse ${baseRef}`, monorepoRoot);
  const mergeBaseSha = git(`merge-base ${head} ${baseRef}`, monorepoRoot);
  const branchKey = `pr${row.pr}`;

  const headDiag = runDiagnostics(cwd);
  const immediateBaseCheckout = resolveWorktreeCheckout(monorepoRoot, row.base);
  const immediateBaseDiag =
    immediateBaseCheckout === cwd && immediateBaseSha !== head
      ? runDiagnostics(immediateBaseCheckout)
      : runDiagnostics(immediateBaseCheckout);

  const exports = skipExports ? {} : runExports(cwd, branchKey);
  const identityDelta = diffAddedIdentities(headDiag.identities, immediateBaseDiag.identities);

  return {
    pr: row.pr,
    branch: row.branch,
    head,
    worktreeRoot: cwd,
    baseRef,
    immediateBaseSha,
    mergeBaseSha,
    diagnostics: {
      head: headDiag,
      immediateBase: immediateBaseDiag,
      tsErrorsAdded: headDiag.tsErrorCount - immediateBaseDiag.tsErrorCount,
      eslintErrorsDelta: headDiag.eslintErrorCount - immediateBaseDiag.eslintErrorCount,
      identitiesAdded: identityDelta,
      toolFailure: headDiag.toolFailure || immediateBaseDiag.toolFailure,
    },
    exports,
  };
}

function parseCli() {
  const args = process.argv.slice(2);
  const smoke = args.includes('--smoke');
  const onlyPr = args.find((a) => /^pr\d+$/i.test(a) || /^\d+$/.test(a));
  let prFilter = null;
  if (onlyPr) {
    const digits = onlyPr.replace(/^pr/i, '');
    prFilter = Number(digits);
  }
  return { smoke, prFilter };
}

const report = {
  validatedAt: new Date().toISOString(),
  monorepoRoot,
  checkoutMode: 'isolated_stack_worktrees',
  commands: {
    export:
      'node scripts/with-eduvijna-api-env.mjs development -- expo export --platform <android|ios|web> --output-dir <worktree>/.stack-export-check/<pr>/<platform>',
    diagnostics: 'npm run type-check && npx eslint . --ext .ts,.tsx --format json',
  },
  branches: [],
  status: 'running',
  error: null,
};

const cliOpts = parseCli();

try {
  const { smoke, prFilter } = cliOpts;
  const rows = STACK.filter((row) => (prFilter ? row.pr === prFilter : true));
  if (smoke && rows.length === 0) {
    throw new Error('Smoke mode requires a valid --smoke pr24 (or numeric PR id)');
  }
  const targetRows = smoke ? [rows[0] ?? STACK[STACK.length - 1]] : rows;

  for (const row of targetRows) {
    console.log(`\n=== PR #${row.pr} ${row.branch} (worktree) ===`);
    const entry = validateStackBranch(row, { skipExports: smoke });
    report.branches.push(entry);
    if (smoke) {
      console.log('Smoke: diagnostics only (exports skipped).');
      break;
    }
  }

  const exportFailures = report.branches.some((b) =>
    Object.values(b.exports).some((e) => e.exitCode !== 0),
  );
  const diagnosticRegression = report.branches.some((b) => {
    const blocking = filterBlockingIdentities(b.diagnostics?.identitiesAdded);
    b.diagnostics.identitiesAddedBlocking = blocking;
    return blocking.tsAdded.length > 0 || blocking.eslintAdded.length > 0;
  });
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
  const outDir = dirname(reportPath);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${reportPath} (status=${report.status})`);
  const shouldFail = cliOpts.smoke
    ? Boolean(report.error)
    : report.status !== 'passed' ||
      report.branches?.some((b) => {
        const blocking = b.diagnostics?.identitiesAddedBlocking ?? filterBlockingIdentities(b.diagnostics?.identitiesAdded);
        return blocking.tsAdded.length > 0 || blocking.eslintAdded.length > 0;
      });
  process.exit(shouldFail ? 1 : 0);
}
