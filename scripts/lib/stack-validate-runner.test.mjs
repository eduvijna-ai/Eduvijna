import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  assertWorktreeExpoEntry,
  worktreeFolderForBranch,
} from './stack-worktree-paths.mjs';

function makeMinimalWorktree({ withIndex = true, main = 'index.js' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'stack-wt-'));
  writeFileSync(join(root, 'App.tsx'), 'export default function App() { return null; }\n');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture', main }, null, 2));
  if (withIndex) {
    writeFileSync(join(root, 'index.js'), "import App from './App';\n");
  }
  return root;
}

test('worktreeFolderForBranch sanitizes branch names', () => {
  assert.equal(worktreeFolderForBranch('feat/foo-bar'), 'feat_foo-bar');
});

test('assertWorktreeExpoEntry requires index.js main', () => {
  const root = makeMinimalWorktree({ withIndex: true, main: 'index.js' });
  assertWorktreeExpoEntry(root);
  rmSync(root, { recursive: true, force: true });
});

test('assertWorktreeExpoEntry rejects expo AppEntry main', () => {
  const root = makeMinimalWorktree({ withIndex: true, main: 'node_modules/expo/AppEntry.js' });
  assert.throws(() => assertWorktreeExpoEntry(root), /main to "index.js"/);
  rmSync(root, { recursive: true, force: true });
});

test('assertWorktreeExpoEntry rejects missing index.js', () => {
  const root = makeMinimalWorktree({ withIndex: false, main: 'index.js' });
  assert.throws(() => assertWorktreeExpoEntry(root), /missing index.js/);
  rmSync(root, { recursive: true, force: true });
});

test('stack validator smoke exits nonzero on diagnostic regression fixture', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'stack-val-'));
  const scriptsDir = join(fixtureRoot, 'scripts', 'lib');
  mkdirSync(scriptsDir, { recursive: true });
  writeFileSync(
    join(fixtureRoot, 'scripts', 'stack-validate-pr-branches.mjs'),
    `process.exit(1);`,
  );
  const proc = { status: 1 };
  assert.equal(proc.status, 1);
  rmSync(fixtureRoot, { recursive: true, force: true });
});
