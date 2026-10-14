/**
 * PR #26 final candidate diagnostic summary (origin SHAs, multiset classifier).
 */
import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyDiagnosticDelta,
  collectTypeScriptIdentities,
  parseEslintJsonReport,
} from './lib/diagnostic-identities.mjs';
import { prepareWorktreeAtSha, requireWorktreeRoot, resolveMonorepoRoot } from './lib/stack-worktree-paths.mjs';

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
    tsErrorCount: (typeOut.match(/error TS\d+:/g) || []).length,
    eslintErrorCount: (lintOut.match(/"severity":\s*2/g) || []).length,
  };
}

const integrationBranch = 'integration/mobile-founder-acceptance-20261011';
const phase6Branch = 'feat/mobile-phase6-push-notifications';
const headSha = git(`rev-parse origin/${integrationBranch}`);
const baseSha = git(`rev-parse origin/${phase6Branch}`);

prepareWorktreeAtSha(monorepoRoot, integrationBranch, headSha);
prepareWorktreeAtSha(monorepoRoot, phase6Branch, baseSha);

const headRoot = requireWorktreeRoot(monorepoRoot, integrationBranch);
const baseRoot = requireWorktreeRoot(monorepoRoot, phase6Branch);

const head = runDiagnostics(headRoot);
const base = runDiagnostics(baseRoot);

const tsClass = classifyDiagnosticDelta(head.ts, base.ts, 'typescript');
const eslintClass = classifyDiagnosticDelta(head.eslint, base.eslint, 'eslint');

const report = {
  generatedAt: new Date().toISOString(),
  candidate: { branch: integrationBranch, sha: headSha },
  immediateBase: { branch: phase6Branch, sha: baseSha },
  rawCounts: {
    head: { tsIdentities: head.ts.length, eslintIdentities: head.eslint.length, ...head },
    base: { tsIdentities: base.ts.length, eslintIdentities: base.eslint.length, ...base },
  },
  typescript: tsClass.counts,
  eslint: eslintClass.counts,
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
  `final-candidate-diagnostics-${headSha.slice(0, 7)}.json`,
);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Wrote ${outPath}`);
console.log(
  `TS genuine ${tsClass.counts.genuinelyIntroduced} resolved ${tsClass.counts.resolved} relocated ${tsClass.counts.relocated} ambiguous ${tsClass.counts.ambiguous}`,
);
console.log(
  `ESLint genuine ${eslintClass.counts.genuinelyIntroduced} resolved ${eslintClass.counts.resolved} relocated ${eslintClass.counts.relocated} ambiguous ${eslintClass.counts.ambiguous}`,
);
