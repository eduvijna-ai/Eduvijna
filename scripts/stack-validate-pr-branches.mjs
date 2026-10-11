/**
 * Isolated stack validation: detach each PR worktree at recorded origin SHA,
 * assert HEAD, run diagnostics + exports. Never uses primary checkout fallback.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { execSync } from 'node:child_process';
import {
  collectTypeScriptIdentities,
  diffIdentities,
  normalizeRelativeFilePath,
  parseEslintJsonReport,
} from './lib/diagnostic-identities.mjs';
import {
  resolveMonorepoRoot,
  resolveRemoteBranchSha,
  prepareWorktreeAtSha,
  requireWorktreeRoot,
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

function resolveBaseRef(baseBranch) {
  try {
    git(`rev-parse --verify origin/${baseBranch}`, monorepoRoot);
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

function listFilesChangedBetween(monorepoRoot, fromSha, toSha) {
  const raw = git(`diff --name-only ${fromSha}..${toSha}`, monorepoRoot);
  if (!raw) {
    return new Set();
  }
  const changedFiles = new Set();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim().replace(/\\/g, '/');
    if (!trimmed) continue;
    changedFiles.add(trimmed);
    changedFiles.add(normalizeRelativeFilePath(trimmed));
  }
  return changedFiles;
}

function identityFileInChangedSet(identity, changedFiles) {
  const rawFile = (identity.split('|')[0] ?? '').replace(/\\/g, '/');
  const normalized = normalizeRelativeFilePath(rawFile);
  return (
    changedFiles.has(rawFile) ||
    changedFiles.has(normalized) ||
    changedFiles.has(`src/${normalized}`)
  );
}

function scopeIdentitiesToChangedFiles(identities, changedFiles) {
  return identities.filter((identity) => identityFileInChangedSet(identity, changedFiles));
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
  const parseFailure =
    (type.status !== 0 && identities.ts.length === 0 && /error TS\d+:/.test(typeOut)) ||
    (lint.status !== 0 && identities.eslint.length === 0 && lintJsonOut.trim() === '');
  const toolFailure =
    type.status === null ||
    lint.status === null ||
    Boolean(type.error) ||
    Boolean(lint.error) ||
    parseFailure;
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
      tsErrorCount: countDiagnostics(typeOut, /error TS\d+:/g),
      eslintErrorCount: countDiagnostics(lintCombinedForCount, /"severity":\s*2/g),
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

function assertImmediateBaseIsAncestor(row, headSha) {
  const baseRef = resolveBaseRef(row.base);
  const immediateBaseSha = git(`rev-parse ${baseRef}`, monorepoRoot);
  const proc = spawnSync(
    'git',
    ['merge-base', '--is-ancestor', immediateBaseSha, headSha],
    { cwd: monorepoRoot },
  );
  if (proc.status !== 0) {
    throw new Error(
      `Ancestry validation failed for PR #${row.pr}: ${baseRef} (${immediateBaseSha}) is not an ancestor of ${row.branch} (${headSha})`,
    );
  }
  return { baseRef, immediateBaseSha };
}

function validateStackBranch(row, options = {}) {
  const skipExports = options.skipExports === true;
  const expectedHead = resolveRemoteBranchSha(monorepoRoot, row.branch);
  assertImmediateBaseIsAncestor(row, expectedHead);
  const { worktreeRoot, head } = prepareWorktreeAtSha(monorepoRoot, row.branch, expectedHead);

  const baseRef = resolveBaseRef(row.base);
  const immediateBaseSha = git(`rev-parse ${baseRef}`, monorepoRoot);
  const mergeBaseSha = git(`merge-base ${head} ${baseRef}`, monorepoRoot);
  const branchKey = `pr${row.pr}`;

  const headDiag = runDiagnostics(worktreeRoot);

  const baseBranchForWorktree = row.base === 'main' ? row.branch : row.base;
  const baseWorktree = requireWorktreeRoot(monorepoRoot, baseBranchForWorktree);
  prepareWorktreeAtSha(monorepoRoot, baseBranchForWorktree, immediateBaseSha);
  const immediateBaseDiag = runDiagnostics(baseWorktree);
  prepareWorktreeAtSha(monorepoRoot, row.branch, expectedHead);

  const exports = skipExports ? {} : runExports(worktreeRoot, branchKey);
  const identityDelta = diffAddedIdentities(headDiag.identities, immediateBaseDiag.identities);
  const filesChangedVsImmediateBase = listFilesChangedBetween(
    monorepoRoot,
    immediateBaseSha,
    head,
  );
  const scopedIdentitiesAdded = {
    tsAdded: scopeIdentitiesToChangedFiles(identityDelta.tsAdded, filesChangedVsImmediateBase),
    eslintAdded: scopeIdentitiesToChangedFiles(
      identityDelta.eslintAdded,
      filesChangedVsImmediateBase,
    ),
  };

  return {
    pr: row.pr,
    branch: row.branch,
    head,
    headMatchesOrigin: head === expectedHead,
    worktreeRoot,
    baseRef,
    immediateBaseSha,
    mergeBaseSha,
    diagnostics: {
      head: headDiag,
      immediateBase: immediateBaseDiag,
      tsErrorsAdded: headDiag.tsErrorCount - immediateBaseDiag.tsErrorCount,
      eslintErrorsDelta: headDiag.eslintErrorCount - immediateBaseDiag.eslintErrorCount,
      identitiesAdded: scopedIdentitiesAdded,
      identitiesAddedUnscoped: identityDelta,
      filesChangedVsImmediateBase: [...filesChangedVsImmediateBase].sort(),
      baselineDebt: headDiag.baselineDebt,
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
    prFilter = Number(onlyPr.replace(/^pr/i, ''));
  }
  return { smoke, prFilter };
}

let priorReport = null;
if (existsSync(reportPath)) {
  try {
    priorReport = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch {
    priorReport = null;
  }
}

const report = {
  validatedAt: new Date().toISOString(),
  monorepoRoot,
  checkoutMode: 'isolated_worktree_detached_at_origin_sha',
  safeguards: {
    assertHeadEqualsOriginSha: true,
    noPrimaryCheckoutFallback: true,
    failOnDiagnosticToolFailure: true,
    failOnAnyIdentityRegression: true,
    failOnBrokenStackAncestry: true,
    rejectDirtyWorktrees: true,
    regressionScope: 'identities_in_files_changed_vs_immediate_base',
  },
  supersededPriorSweep:
    priorReport?.checkoutMode !== 'isolated_worktree_detached_at_origin_sha'
      ? {
          priorValidatedAt: priorReport?.validatedAt ?? null,
          priorCheckoutMode: priorReport?.checkoutMode ?? null,
          reason: 'missing_sha_pin_and_tool_failure_gates',
        }
      : null,
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
  const targetRows = smoke ? [rows[rows.length - 1]] : rows;

  for (const row of targetRows) {
    console.log(`\n=== PR #${row.pr} ${row.branch} (pinned worktree) ===`);
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
  const toolFailures = report.branches.some((b) => b.diagnostics?.toolFailure);
  const diagnosticRegression = report.branches.some((b) => {
    const added = b.diagnostics?.identitiesAdded;
    const tsNew = added?.tsAdded?.length ?? 0;
    const eslintNew = added?.eslintAdded?.length ?? 0;
    return tsNew > 0 || eslintNew > 0;
  });
  const headMismatch = report.branches.some((b) => !b.headMatchesOrigin);

  report.status = exportFailures
    ? 'export_failures'
    : toolFailures
      ? 'diagnostic_tool_failure'
      : headMismatch
        ? 'head_sha_mismatch'
        : diagnosticRegression
          ? 'diagnostic_regression'
          : 'passed';
  report.exportStatus = exportFailures ? 'failed' : 'passed';
  report.diagnosticStatus = toolFailures
    ? 'tool_failure'
    : diagnosticRegression
      ? 'regression'
      : 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = error?.message || String(error);
  throw error;
} finally {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${reportPath} (status=${report.status})`);
  const shouldFail = report.status !== 'passed' || Boolean(report.error);
  process.exit(shouldFail ? 1 : 0);
}
