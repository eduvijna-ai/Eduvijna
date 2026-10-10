import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = join(__dirname, '..', '..');

function runResolveSnippet(
  source: string,
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: options?.cwd ?? repoRoot,
    encoding: 'utf8',
    shell: false,
    env: options?.env ?? process.env,
  });
}

function createIsolatedResolverCopy(): {
  tempRoot: string;
  moduleUrl: string;
  fakeNodePathRoot: string;
} {
  const tempRoot = mkdtempSync(join(tmpdir(), 'eduvijna-no-eas-'));
  const scriptsDir = join(tempRoot, 'scripts');
  mkdirSync(scriptsDir);
  copyFileSync(
    join(repoRoot, 'scripts', 'resolve-cli-entry.mjs'),
    join(scriptsDir, 'resolve-cli-entry.mjs'),
  );

  const fakeNodePathRoot = join(tempRoot, 'fake-node-path');
  const fakeEasCli = join(fakeNodePathRoot, 'eas-cli', 'build', 'bin');
  mkdirSync(fakeEasCli, { recursive: true });
  writeFileSync(join(fakeEasCli, 'cli'), 'console.log("fake-global-eas");\n');

  const moduleUrl = pathToFileURL(join(scriptsDir, 'resolve-cli-entry.mjs')).href;
  return { tempRoot, moduleUrl, fakeNodePathRoot };
}

describe('resolve-cli-entry.mjs', () => {
  it('resolves expo to node_modules/expo/bin/cli', () => {
    const result = runResolveSnippet(`
      import { resolveCommandArgv } from './scripts/resolve-cli-entry.mjs';
      const r = resolveCommandArgv(['expo', 'config']);
      if (r.executable !== process.execPath) process.exit(2);
      if (!r.args[0].replace(/\\\\/g, '/').endsWith('expo/bin/cli')) process.exit(3);
    `);
    expect(result.status).toBe(0);
  });

  it('resolves eas to repository-local eas-cli node entry', () => {
    const result = runResolveSnippet(`
      import { resolveCommandArgv } from './scripts/resolve-cli-entry.mjs';
      const r = resolveCommandArgv(['eas', '--version']);
      if (r.executable !== process.execPath) process.exit(2);
      const entry = r.args[0].replace(/\\\\/g, '/');
      if (!entry.includes('/node_modules/eas-cli/')) process.exit(3);
      if (entry.includes('AppData/npm')) process.exit(4);
    `);
    expect(result.status).toBe(0);
  });

  it('throws actionable error when repository-local eas-cli is missing', () => {
    const { moduleUrl, fakeNodePathRoot } = createIsolatedResolverCopy();
    const childEnv = {
      ...process.env,
      NODE_PATH: fakeNodePathRoot,
    };
    const probe = spawnSync(
      process.execPath,
      ['-p', 'process.env.NODE_PATH || ""'],
      { env: childEnv, encoding: 'utf8', shell: false },
    );
    expect(probe.stdout.trim()).toBe(fakeNodePathRoot);

    const result = runResolveSnippet(
      `
      if (process.env.NODE_PATH !== ${JSON.stringify(fakeNodePathRoot)}) process.exit(11);
      import { resolveCommandArgv } from '${moduleUrl}';
      try {
        resolveCommandArgv(['eas', '--version']);
        process.exit(9);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('npm ci')) process.exit(10);
      }
    `,
      { cwd: repoRoot, env: childEnv },
    );
    expect(result.status).toBe(0);
  });

  it('does not resolve eas via NODE_PATH fake eas-cli when repository-local eas-cli is absent', () => {
    const { moduleUrl, fakeNodePathRoot } = createIsolatedResolverCopy();
    const childEnv = {
      ...process.env,
      NODE_PATH: fakeNodePathRoot,
    };

    const result = runResolveSnippet(
      `
      if (process.env.NODE_PATH !== ${JSON.stringify(fakeNodePathRoot)}) process.exit(11);
      import { resolveCommandArgv } from '${moduleUrl}';
      try {
        const r = resolveCommandArgv(['eas', '--version']);
        if (r.args[0].includes('fake-node-path')) process.exit(12);
        process.exit(9);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('npm ci')) process.exit(10);
      }
    `,
      { cwd: repoRoot, env: childEnv },
    );
    expect(result.status).toBe(0);
  });
});
