import { copyFileSync, existsSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { execSync } from 'node:child_process';
import { STACK_VALIDATOR_REVISION } from './stack-validator-revision.mjs';

export { STACK_VALIDATOR_REVISION };

export function resolveMonorepoRoot(scriptsRepoRoot) {
  if (scriptsRepoRoot.includes('.stack-worktrees')) {
    return join(scriptsRepoRoot, '..', '..');
  }
  return scriptsRepoRoot;
}

export function worktreeFolderForBranch(branch) {
  return branch.replace('/', '_');
}

export function requireWorktreeRoot(monorepoRoot, branch) {
  const folder = worktreeFolderForBranch(branch);
  const worktreeRoot = join(monorepoRoot, '.stack-worktrees', folder);
  if (!existsSync(join(worktreeRoot, 'App.tsx')) || !existsSync(join(worktreeRoot, 'package.json'))) {
    throw new Error(
      `Missing isolated worktree for branch ${branch}. Expected ${worktreeRoot} (no primary fallback).`,
    );
  }
  return worktreeRoot;
}

/**
 * Expo's default AppEntry resolves ../../App from node_modules/expo (monorepo root when node_modules is shared).
 * Each worktree must use package.json main "index.js" importing ./App from the worktree root.
 */
function sharedNodeModulesWithMonorepo(worktreeRoot, monorepoRoot) {
  const nm = join(worktreeRoot, 'node_modules');
  if (!existsSync(nm)) {
    return false;
  }
  try {
    const worktreeNm = realpathSync(nm);
    const monorepoNm = realpathSync(join(monorepoRoot, 'node_modules'));
    return worktreeNm.toLowerCase() === monorepoNm.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Shared node_modules junctions break Babel/Metro project roots (babel.config __dirname vs git root).
 * Install dependencies inside the worktree when the junction points at the monorepo root.
 */
export function ensureWorktreeOwnNodeModules(worktreeRoot, monorepoRoot, expectedSha) {
  const marker = join(worktreeRoot, '.stack-worktree-npm-ci.sha');
  if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === expectedSha) {
    return;
  }
  if (sharedNodeModulesWithMonorepo(worktreeRoot, monorepoRoot)) {
    const nm = join(worktreeRoot, 'node_modules');
    rmSync(nm, { recursive: true, force: true });
  }
  runWorktreeNpmCi(worktreeRoot);
  writeFileSync(marker, expectedSha, 'utf8');
}

export function runWorktreeNpmCi(worktreeRoot) {
  const cmd = process.env.STACK_WORKTREE_NPM_CI_CMD || 'npm ci';
  execSync(cmd, { cwd: worktreeRoot, stdio: 'inherit' });
}

/**
 * Worktrees with shared node_modules need local index.js + package.json main "index.js".
 * Returns disclosure metadata when a repair was applied (not an untouched-source pass).
 */
export function repairWorktreeExpoEntry(worktreeRoot, monorepoRoot) {
  const disclosures = [];
  const indexPath = join(worktreeRoot, 'index.js');
  const templateIndex = join(monorepoRoot, 'index.js');
  if (!existsSync(indexPath) && existsSync(templateIndex)) {
    copyFileSync(templateIndex, indexPath);
    disclosures.push('copied_index_js_from_monorepo_root');
  }
  const pkgPath = join(worktreeRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const previousMain = pkg.main;
  if (pkg.main !== 'index.js') {
    pkg.main = 'index.js';
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    disclosures.push(`package_json_main_was_${previousMain ?? 'unset'}`);
  }
  if (!existsSync(indexPath)) {
    throw new Error(`Worktree ${worktreeRoot} is missing index.js Expo entry after repair`);
  }
  return { repaired: disclosures.length > 0, disclosures };
}

export function assertWorktreeExpoEntry(worktreeRoot, monorepoRoot) {
  repairWorktreeExpoEntry(worktreeRoot, monorepoRoot);
}

export function fetchOrigin(monorepoRoot) {
  execSync('git fetch origin', { cwd: monorepoRoot, stdio: 'ignore' });
}

export function resolveRemoteBranchSha(monorepoRoot, branch) {
  fetchOrigin(monorepoRoot);
  return execSync(`git rev-parse origin/${branch}`, {
    cwd: monorepoRoot,
    encoding: 'utf8',
  }).trim();
}

/**
 * Detach worktree at exact SHA and assert HEAD matches before diagnostics/exports.
 */
const ALLOWED_UNTRACKED_PREFIXES = ['.stack-export-check/', '.stack-worktree-npm-ci.sha'];
const ALLOWED_UNTRACKED_FILES = new Set(['index.js']);

function normalizeRealPath(dir) {
  try {
    return realpathSync(dir);
  } catch {
    return dir;
  }
}

/**
 * Only isolated matrix worktrees under .stack-worktrees may be reset/repaired.
 */
export function assertOwnedStackValidationWorktree(monorepoRoot, worktreeRoot) {
  const mono = normalizeRealPath(monorepoRoot);
  const wt = normalizeRealPath(worktreeRoot);
  if (wt.toLowerCase() === mono.toLowerCase()) {
    throw new Error(
      `Refusing worktree prep on primary monorepo checkout (${worktreeRoot}). Use .stack-worktrees/* only.`,
    );
  }
  const stackRoot = normalizeRealPath(join(monorepoRoot, '.stack-worktrees'));
  const prefix = stackRoot.endsWith(sep) ? stackRoot : `${stackRoot}${sep}`;
  if (!wt.toLowerCase().startsWith(prefix.toLowerCase())) {
    throw new Error(
      `Refusing worktree prep outside .stack-worktrees: ${worktreeRoot} (monorepo ${mono})`,
    );
  }
  const list = execSync('git worktree list --porcelain', { cwd: monorepoRoot, encoding: 'utf8' });
  const blocks = list.split('\n\n').filter(Boolean);
  const registered = blocks.some((block) => {
    const m = /^worktree (.+)$/m.exec(block);
    if (!m) return false;
    const listed = normalizeRealPath(m[1].trim());
    return listed.toLowerCase() === wt.toLowerCase();
  });
  if (!registered) {
    throw new Error(`Worktree path is not a registered git worktree: ${worktreeRoot}`);
  }
}

function isTrackedAtHead(worktreeRoot, relativePath) {
  try {
    execSync(`git cat-file -e HEAD:${relativePath}`, { cwd: worktreeRoot, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function isRunnerGeneratedExpoIndexJs(worktreeRoot, monorepoRoot, indexPath) {
  const templateIndex = join(monorepoRoot, 'index.js');
  if (!existsSync(indexPath) || !existsSync(templateIndex)) {
    return false;
  }
  try {
    return readFileSync(indexPath, 'utf8') === readFileSync(templateIndex, 'utf8');
  } catch {
    return false;
  }
}

function classifyPreCheckoutDirtyState(worktreeRoot, monorepoRoot) {
  const status = execSync('git status --porcelain', { cwd: worktreeRoot, encoding: 'utf8' });
  const unexpected = [];
  const repairArtifacts = [];
  const indexPath = join(worktreeRoot, 'index.js');
  for (const line of status.split('\n')) {
    if (!line.trim()) continue;
    const code = line.slice(0, 2);
    const path = line.slice(3).trim().replace(/\\/g, '/');
    if (code === '??' && path === 'index.js') {
      if (isRunnerGeneratedExpoIndexJs(worktreeRoot, monorepoRoot, indexPath)) {
        repairArtifacts.push(`untracked:${path}`);
      } else {
        unexpected.push(`untracked_non_runner_index:${path}`);
      }
      continue;
    }
    if (code === '??') {
      const allowed =
        ALLOWED_UNTRACKED_FILES.has(path) ||
        ALLOWED_UNTRACKED_PREFIXES.some((prefix) => path.startsWith(prefix));
      if (allowed) {
        repairArtifacts.push(`untracked:${path}`);
      } else {
        unexpected.push(`untracked:${path}`);
      }
      continue;
    }
    if (path === 'package.json' && (code === ' M' || code === 'M ' || code === 'MM')) {
      repairArtifacts.push('dirty:package.json');
      continue;
    }
    if (path === 'index.js' && (code.includes('D') || code.includes('M'))) {
      repairArtifacts.push(`dirty:${path}`);
      continue;
    }
    unexpected.push(`dirty:${path}`);
  }
  return { unexpected, repairArtifacts };
}

export function restoreWorktreeExpoEntryOverrides(worktreeRoot, monorepoRoot, repairDisclosures) {
  if (!repairDisclosures?.length) {
    return { restored: false, disclosures: [] };
  }
  assertOwnedStackValidationWorktree(monorepoRoot, worktreeRoot);
  const restored = [];
  try {
    execSync('git checkout -- package.json index.js', { cwd: worktreeRoot, stdio: 'ignore' });
    restored.push('restored_package_json_and_index_from_head');
  } catch {
    restored.push('package_json_index_restore_failed');
  }
  const indexPath = join(worktreeRoot, 'index.js');
  if (
    repairDisclosures.includes('copied_index_js_from_monorepo_root') &&
    existsSync(indexPath) &&
    isRunnerGeneratedExpoIndexJs(worktreeRoot, monorepoRoot, indexPath)
  ) {
    rmSync(indexPath, { force: true });
    restored.push('removed_runner_index_js');
  }
  return { restored: true, disclosures: restored };
}

export function assertWorktreeClean(worktreeRoot, monorepoRoot = null) {
  const status = execSync('git status --porcelain', { cwd: worktreeRoot, encoding: 'utf8' });
  const violations = [];
  const indexPath = join(worktreeRoot, 'index.js');
  for (const line of status.split('\n')) {
    if (!line.trim()) continue;
    const code = line.slice(0, 2);
    const path = line.slice(3).trim().replace(/\\/g, '/');
    if (
      path === 'index.js' &&
      monorepoRoot &&
      isRunnerGeneratedExpoIndexJs(worktreeRoot, monorepoRoot, indexPath)
    ) {
      continue;
    }
    if (code === '??') {
      const allowed =
        ALLOWED_UNTRACKED_FILES.has(path) ||
        ALLOWED_UNTRACKED_PREFIXES.some((prefix) => path.startsWith(prefix));
      if (!allowed) {
        violations.push(`untracked:${path}`);
      }
      continue;
    }
    violations.push(`dirty:${path}`);
  }
  if (violations.length > 0) {
    throw new Error(
      `Worktree not clean at ${worktreeRoot}: ${violations.slice(0, 8).join(', ')}`,
    );
  }
}

export function prepareWorktreeAtSha(monorepoRoot, branch, expectedSha) {
  const worktreeRoot = requireWorktreeRoot(monorepoRoot, branch);
  assertOwnedStackValidationWorktree(monorepoRoot, worktreeRoot);
  fetchOrigin(monorepoRoot);

  const { unexpected, repairArtifacts } = classifyPreCheckoutDirtyState(worktreeRoot, monorepoRoot);
  if (unexpected.length > 0) {
    throw new Error(
      `Worktree has unexpected local changes; cleanup aborted to preserve state at ${worktreeRoot}: ${unexpected.join(', ')}`,
    );
  }

  if (repairArtifacts.length > 0) {
    execSync('git reset --hard', { cwd: worktreeRoot, stdio: 'ignore' });
    const repairIndex = join(worktreeRoot, 'index.js');
    if (
      !isTrackedAtHead(worktreeRoot, 'index.js') &&
      existsSync(repairIndex) &&
      isRunnerGeneratedExpoIndexJs(worktreeRoot, monorepoRoot, repairIndex)
    ) {
      rmSync(repairIndex, { force: true });
    }
  }

  execSync(`git checkout --detach ${expectedSha}`, { cwd: worktreeRoot, stdio: 'ignore' });
  assertWorktreeClean(worktreeRoot, monorepoRoot);

  const entryRepair = repairWorktreeExpoEntry(worktreeRoot, monorepoRoot);
  ensureWorktreeOwnNodeModules(worktreeRoot, monorepoRoot, expectedSha);
  const postCiRepair = repairWorktreeExpoEntry(worktreeRoot, monorepoRoot);
  const head = execSync('git rev-parse HEAD', { cwd: worktreeRoot, encoding: 'utf8' }).trim();
  if (head !== expectedSha) {
    throw new Error(
      `Worktree HEAD mismatch for ${branch}: expected ${expectedSha}, got ${head} at ${worktreeRoot}`,
    );
  }
  return {
    worktreeRoot,
    head,
    validatorRevision: STACK_VALIDATOR_REVISION,
    worktreeExpoEntryRepair: [...entryRepair.disclosures, ...postCiRepair.disclosures],
  };
}
