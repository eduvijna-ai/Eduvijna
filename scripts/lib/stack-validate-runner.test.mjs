import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { requireWorktreeRoot, resolveMonorepoRoot } from './stack-worktree-paths.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoFromScripts = join(scriptsDir, '..', '..');
const monorepoRoot = resolveMonorepoRoot(repoFromScripts);

test('requires isolated phase6 worktree with App.tsx', () => {
  const root = requireWorktreeRoot(monorepoRoot, 'feat/mobile-phase6-push-notifications');
  assert.equal(existsSync(join(root, 'App.tsx')), true);
});

test('smoke: stack validator completes one branch diagnostics', () => {
  const proc = spawnSync(
    process.execPath,
    ['scripts/stack-validate-pr-branches.mjs', '--smoke', '24'],
    {
      cwd: monorepoRoot,
      encoding: 'utf8',
      timeout: 180_000,
      env: { ...process.env, CI: '1' },
    },
  );
  assert.equal(
    proc.status,
    0,
    `smoke failed:\n${proc.stderr}\n${proc.stdout?.slice(-2000)}`,
  );
});
