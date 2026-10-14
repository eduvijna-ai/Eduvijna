import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  assertWorktreeExpoEntry,
  ensureWorktreeOwnNodeModules,
  worktreeFolderForBranch,
} from './stack-worktree-paths.mjs';
import { computeStackValidationStatus } from './stack-validate-status.mjs';

const scriptsRoot = join(fileURLToPath(import.meta.url), '..', '..');
const monorepoRoot = join(scriptsRoot, '..');

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

test('ensureWorktreeOwnNodeModules runs npm ci when marker sha differs', () => {
  const root = makeMinimalWorktree();
  const log = join(root, 'npm-ci.log');
  const prev = process.env.STACK_WORKTREE_NPM_CI_CMD;
  process.env.STACK_WORKTREE_NPM_CI_CMD = `node -e "require('fs').appendFileSync('${log.replace(/\\/g, '/')}', 'ok')"`;

  writeFileSync(join(root, '.stack-worktree-npm-ci.sha'), 'old-sha', 'utf8');
  ensureWorktreeOwnNodeModules(root, root, 'new-sha');
  assert.equal(readFileSync(join(root, '.stack-worktree-npm-ci.sha'), 'utf8'), 'new-sha');
  assert.match(readFileSync(log, 'utf8'), /ok/);

  ensureWorktreeOwnNodeModules(root, root, 'new-sha');
  assert.equal(readFileSync(log, 'utf8'), 'ok');

  process.env.STACK_WORKTREE_NPM_CI_CMD = prev;
  rmSync(root, { recursive: true, force: true });
});

test('ensureWorktreeOwnNodeModules does not write marker when npm ci fails', () => {
  const root = makeMinimalWorktree();
  const prev = process.env.STACK_WORKTREE_NPM_CI_CMD;
  process.env.STACK_WORKTREE_NPM_CI_CMD = 'node -e "process.exit(3)"';

  assert.throws(
    () => ensureWorktreeOwnNodeModules(root, root, 'sha-fail'),
    (err) => err.status === 3,
  );
  assert.equal(existsSyncMarker(root), false);

  process.env.STACK_WORKTREE_NPM_CI_CMD = prev;
  rmSync(root, { recursive: true, force: true });
});

function existsSyncMarker(root) {
  try {
    readFileSync(join(root, '.stack-worktree-npm-ci.sha'), 'utf8');
    return true;
  } catch {
    return false;
  }
}

test('computeStackValidationStatus passing vs regression vs export vs tool failure', () => {
  const baseBranch = {
    headMatchesOrigin: true,
    exports: { web: { exitCode: 0 } },
    diagnostics: {
      toolFailure: false,
      identitiesAdded: { tsAdded: [], eslintAdded: [] },
    },
  };
  assert.equal(computeStackValidationStatus([baseBranch]).status, 'passed');

  const regression = {
    ...baseBranch,
    diagnostics: {
      ...baseBranch.diagnostics,
      identitiesAdded: { tsAdded: ['src/foo.ts|TS1234'], eslintAdded: [] },
    },
  };
  assert.equal(computeStackValidationStatus([regression]).status, 'diagnostic_regression');

  const rawOnlyNotGenuine = {
    ...baseBranch,
    diagnostics: {
      ...baseBranch.diagnostics,
      identitiesAdded: {
        tsAdded: ['src/foo.ts|TS1234'],
        eslintAdded: [],
        tsGenuineAdded: [],
        eslintGenuineAdded: [],
      },
    },
  };
  assert.equal(computeStackValidationStatus([rawOnlyNotGenuine]).status, 'passed');

  const exportFail = {
    ...baseBranch,
    exports: { web: { exitCode: 1 } },
  };
  assert.equal(computeStackValidationStatus([exportFail]).status, 'export_failures');

  const toolFail = {
    ...baseBranch,
    diagnostics: { ...baseBranch.diagnostics, toolFailure: true },
  };
  assert.equal(computeStackValidationStatus([toolFail]).status, 'diagnostic_tool_failure');
});

test('validator subprocess exits nonzero when fixture diagnostics report regression', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'stack-val-'));
  const reportOut = join(fixtureRoot, 'report.json');
  const harnessPath = join(fixtureRoot, 'run-report.mjs');
  const statusModule = join(scriptsRoot, 'lib', 'stack-validate-status.mjs');
  writeFileSync(
    harnessPath,
    `import { writeFileSync } from 'node:fs';
import { computeStackValidationStatus } from ${JSON.stringify(statusModule.replace(/\\/g, '/'))};
const branches = [{
  headMatchesOrigin: true,
  exports: { web: { exitCode: 0 } },
  diagnostics: {
    toolFailure: false,
    identitiesAdded: { tsAdded: ['src/new.ts|TS9999'], eslintAdded: [] },
  },
}];
const report = { branches, ...computeStackValidationStatus(branches) };
writeFileSync(${JSON.stringify(reportOut.replace(/\\/g, '/'))}, JSON.stringify(report));
process.exit(report.status === 'passed' ? 0 : 1);
`,
  );

  const proc = spawnSync(process.execPath, [harnessPath], { encoding: 'utf8' });
  assert.equal(proc.status, 1, proc.stderr || proc.stdout);
  const report = JSON.parse(readFileSync(reportOut, 'utf8'));
  assert.equal(report.status, 'diagnostic_regression');
  assert.equal(report.diagnosticStatus, 'regression');

  rmSync(fixtureRoot, { recursive: true, force: true });
});
