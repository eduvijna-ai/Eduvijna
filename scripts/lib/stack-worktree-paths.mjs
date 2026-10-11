import { existsSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

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
  if (!sharedNodeModulesWithMonorepo(worktreeRoot, monorepoRoot)) {
    writeFileSync(marker, expectedSha, 'utf8');
    return;
  }
  const nm = join(worktreeRoot, 'node_modules');
  rmSync(nm, { recursive: true, force: true });
  execSync('npm ci', { cwd: worktreeRoot, stdio: 'inherit' });
  writeFileSync(marker, expectedSha, 'utf8');
}

export function assertWorktreeExpoEntry(worktreeRoot) {
  const pkgPath = join(worktreeRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.main !== 'index.js') {
    throw new Error(
      `Worktree ${worktreeRoot} must set package.json main to "index.js" (found ${pkg.main ?? 'unset'})`,
    );
  }
  if (!existsSync(join(worktreeRoot, 'index.js'))) {
    throw new Error(`Worktree ${worktreeRoot} is missing index.js Expo entry`);
  }
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

export function assertWorktreeClean(worktreeRoot) {
  const status = execSync('git status --porcelain', { cwd: worktreeRoot, encoding: 'utf8' });
  const violations = [];
  for (const line of status.split('\n')) {
    if (!line.trim()) continue;
    const code = line.slice(0, 2);
    const path = line.slice(3).trim().replace(/\\/g, '/');
    if (code === '??') {
      const allowed = ALLOWED_UNTRACKED_PREFIXES.some((prefix) => path.startsWith(prefix));
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
  assertWorktreeClean(worktreeRoot);
  fetchOrigin(monorepoRoot);
  execSync(`git checkout --detach ${expectedSha}`, { cwd: worktreeRoot, stdio: 'ignore' });
  assertWorktreeExpoEntry(worktreeRoot);
  ensureWorktreeOwnNodeModules(worktreeRoot, monorepoRoot, expectedSha);
  const head = execSync('git rev-parse HEAD', { cwd: worktreeRoot, encoding: 'utf8' }).trim();
  if (head !== expectedSha) {
    throw new Error(
      `Worktree HEAD mismatch for ${branch}: expected ${expectedSha}, got ${head} at ${worktreeRoot}`,
    );
  }
  return { worktreeRoot, head };
}
