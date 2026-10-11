import { existsSync } from 'node:fs';
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
const ALLOWED_UNTRACKED_PREFIXES = ['.stack-export-check/'];

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
  const head = execSync('git rev-parse HEAD', { cwd: worktreeRoot, encoding: 'utf8' }).trim();
  if (head !== expectedSha) {
    throw new Error(
      `Worktree HEAD mismatch for ${branch}: expected ${expectedSha}, got ${head} at ${worktreeRoot}`,
    );
  }
  return { worktreeRoot, head };
}
