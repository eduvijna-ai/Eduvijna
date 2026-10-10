import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function resolveMonorepoRoot(scriptsRepoRoot) {
  if (scriptsRepoRoot.includes('.stack-worktrees')) {
    return join(scriptsRepoRoot, '..', '..');
  }
  return scriptsRepoRoot;
}

export function worktreeFolderForBranch(branch) {
  return branch.replace('/', '_');
}

export function resolveWorktreeCheckout(monorepoRoot, branch) {
  const folder = worktreeFolderForBranch(branch);
  const worktreeRoot = join(monorepoRoot, '.stack-worktrees', folder);
  if (existsSync(join(worktreeRoot, 'App.tsx')) && existsSync(join(worktreeRoot, 'package.json'))) {
    return worktreeRoot;
  }
  if (existsSync(join(monorepoRoot, 'App.tsx'))) {
    return monorepoRoot;
  }
  throw new Error(`No checkout with App.tsx for branch ${branch} (tried ${worktreeRoot})`);
}
