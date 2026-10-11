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
export function prepareWorktreeAtSha(monorepoRoot, branch, expectedSha) {
  const worktreeRoot = requireWorktreeRoot(monorepoRoot, branch);
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
