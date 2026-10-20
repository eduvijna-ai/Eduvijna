/**
 * Compare integration candidate vs documented release implementation baseline (b306946).
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyDiagnosticDelta,
  collectTypeScriptIdentities,
  parseEslintJsonReport,
  diffGenuineIdentities,
} from './lib/diagnostic-identities.mjs';
import { prepareWorktreeAtSha, requireWorktreeRoot, resolveMonorepoRoot } from './lib/stack-worktree-paths.mjs';

const RELEASE_BASELINE_SHA = 'b3069466f0f06057223d3ff151c595413174cf46';
const scriptRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const monorepoRoot = resolveMonorepoRoot(scriptRoot);

function git(args) {
  return execSync(`git ${args}`, { cwd: monorepoRoot, encoding: 'utf8' }).trim();
}

function runDiagnostics(repoRoot) {
  const type = spawnSync('npm run type-check', {
    cwd: repoRoot,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });
  const lint = spawnSync('npx eslint . --ext .ts,.tsx --format json', {
    cwd: repoRoot,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 40 * 1024 * 1024,
  });
  const typeOut = `${type.stdout || ''}\n${type.stderr || ''}`;
  const lintOut = `${lint.stdout || ''}`;
  return {
    ts: collectTypeScriptIdentities(typeOut),
    eslint: parseEslintJsonReport(lintOut, repoRoot),
  };
}

function ensureDetachedWorktree(path, sha) {
  if (!existsSync(join(path, 'App.tsx'))) {
    mkdirSync(dirname(path), { recursive: true });
    execSync(`git worktree add --detach "${path}" ${sha}`, { cwd: monorepoRoot, stdio: 'inherit' });
  } else {
    execSync(`git checkout --detach ${sha}`, { cwd: path, stdio: 'ignore' });
    const head = execSync('git rev-parse HEAD', { cwd: path, encoding: 'utf8' }).trim();
    if (head !== sha) {
      throw new Error(`Baseline worktree HEAD ${head} !== ${sha}`);
    }
  }
}

const integrationBranch = 'integration/mobile-founder-acceptance-20261011';
const headSha = git(`rev-parse origin/${integrationBranch}`);

prepareWorktreeAtSha(monorepoRoot, integrationBranch, headSha);
const headRoot = requireWorktreeRoot(monorepoRoot, integrationBranch);

const baselineRoot = join(monorepoRoot, '.stack-validation-logs', 'wt-release-baseline-b306946');
ensureDetachedWorktree(baselineRoot, RELEASE_BASELINE_SHA);

const head = runDiagnostics(headRoot);
const base = runDiagnostics(baselineRoot);

const tsClass = classifyDiagnosticDelta(head.ts, base.ts, 'typescript');
const eslintClass = classifyDiagnosticDelta(head.eslint, base.eslint, 'eslint');

const report = {
  generatedAt: new Date().toISOString(),
  candidate: { branch: integrationBranch, sha: headSha, diagnosticsTree: headRoot },
  releaseBaseline: {
    label: 'engineeringImplementationStamp',
    sha: RELEASE_BASELINE_SHA,
    diagnosticsTree: baselineRoot,
  },
  typescript: tsClass.counts,
  eslint: eslintClass.counts,
  tsGenuineAdded: diffGenuineIdentities(head.ts, base.ts, 'typescript'),
  eslintGenuineAdded: diffGenuineIdentities(head.eslint, base.eslint, 'eslint'),
  genuinelyIntroducedSamples: {
    ts: tsClass.genuinelyIntroduced.slice(0, 25),
    eslint: eslintClass.genuinelyIntroduced.slice(0, 25),
  },
  ambiguousSamples: {
    ts: tsClass.ambiguous.slice(0, 25),
    eslint: eslintClass.ambiguous.slice(0, 25),
  },
};

const outPath = join(
  monorepoRoot,
  '.stack-validation-logs',
  `release-baseline-diagnostics-${headSha.slice(0, 7)}-vs-${RELEASE_BASELINE_SHA.slice(0, 7)}.json`,
);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Wrote ${outPath}`);
console.log(
  `TS genuine ${tsClass.counts.genuinelyIntroduced} ambiguous ${tsClass.counts.ambiguous}; ESLint genuine ${eslintClass.counts.genuinelyIntroduced} ambiguous ${eslintClass.counts.ambiguous}`,
);
