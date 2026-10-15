/**
 * Create/update isolated STACK worktrees at origin SHAs (no primary fallback).
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import {
  resolveMonorepoRoot,
  worktreeFolderForBranch,
  resolveRemoteBranchSha,
  fetchOrigin,
  repairWorktreeExpoEntry,
} from './lib/stack-worktree-paths.mjs';

const scriptRepoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const monorepoRoot = resolveMonorepoRoot(scriptRepoRoot);

const STACK = [
  'feat/mobile-assigned-quiz-phase1',
  'feat/mobile-phase2-student-dashboard-parity',
  'feat/mobile-phase3-document-quiz-runtime',
  'feat/mobile-phase4-role-profile-popups',
  'feat/mobile-phase5-deep-links',
  'feat/mobile-phase6-push-notifications',
  'integration/mobile-founder-acceptance-20261011',
];

fetchOrigin(monorepoRoot);
const provisioned = [];

for (const branch of STACK) {
  const sha = resolveRemoteBranchSha(monorepoRoot, branch);
  const folder = worktreeFolderForBranch(branch);
  const path = join(monorepoRoot, '.stack-worktrees', folder);
  if (!existsSync(join(path, 'App.tsx'))) {
    mkdirSync(dirname(path), { recursive: true });
    execSync(`git worktree add --detach "${path}" ${sha}`, { cwd: monorepoRoot, stdio: 'inherit' });
  } else {
    execSync(`git checkout --detach ${sha}`, { cwd: path, stdio: 'ignore' });
  }
  const head = execSync('git rev-parse HEAD', { cwd: path, encoding: 'utf8' }).trim();
  if (head !== sha) {
    throw new Error(`Worktree ${branch}: HEAD ${head} !== origin ${sha}`);
  }
  const repair = repairWorktreeExpoEntry(path, monorepoRoot);
  provisioned.push({ branch, sha, path, repairWorktreeExpoEntry: repair.disclosures });
}

console.log(JSON.stringify({ monorepoRoot, provisioned }, null, 2));
