import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = join(__dirname, '..', '..');

function runResolveSnippet(source: string, env?: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    env: env ?? process.env,
  });
}

function globalEasNodeModulesRoot(): string | null {
  const npmCli = join(repoRoot, 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (!existsSync(npmCli)) {
    return null;
  }
  const result = spawnSync(process.execPath, [npmCli, 'root', '-g'], {
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) {
    return null;
  }
  const root = result.stdout.trim();
  return root && existsSync(join(root, 'eas-cli')) ? root : null;
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
    const tempRoot = mkdtempSync(join(tmpdir(), 'eduvijna-no-eas-'));
    const scriptsDir = join(tempRoot, 'scripts');
    mkdirSync(scriptsDir);
    copyFileSync(
      join(repoRoot, 'scripts', 'resolve-cli-entry.mjs'),
      join(scriptsDir, 'resolve-cli-entry.mjs'),
    );
    const moduleUrl = pathToFileURL(join(scriptsDir, 'resolve-cli-entry.mjs')).href;
    const result = runResolveSnippet(`
      import { resolveCommandArgv } from '${moduleUrl}';
      try {
        resolveCommandArgv(['eas', '--version']);
        process.exit(9);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('npm ci')) process.exit(10);
      }
    `);
    expect(result.status).toBe(0);
  });

  it('does not resolve eas via NODE_PATH when repository-local eas-cli is absent', () => {
    const globalRoot = globalEasNodeModulesRoot();
    if (!globalRoot) {
      return;
    }

    const tempRoot = mkdtempSync(join(tmpdir(), 'eduvijna-no-eas-nodepath-'));
    const scriptsDir = join(tempRoot, 'scripts');
    mkdirSync(scriptsDir);
    copyFileSync(
      join(repoRoot, 'scripts', 'resolve-cli-entry.mjs'),
      join(scriptsDir, 'resolve-cli-entry.mjs'),
    );
    const moduleUrl = pathToFileURL(join(scriptsDir, 'resolve-cli-entry.mjs')).href;
    const result = runResolveSnippet(
      `
      import { resolveCommandArgv } from '${moduleUrl}';
      try {
        resolveCommandArgv(['eas', '--version']);
        process.exit(9);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('npm ci')) process.exit(10);
      }
    `,
      { ...process.env, NODE_PATH: globalRoot },
    );
    expect(result.status).toBe(0);
  });
});
