import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = join(__dirname, '..', '..');

function runResolveSnippet(source: string) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
  });
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

  it('resolves eas to local eas-cli node entry', () => {
    const result = runResolveSnippet(`
      import { resolveCommandArgv } from './scripts/resolve-cli-entry.mjs';
      const r = resolveCommandArgv(['eas', '--version']);
      if (r.executable !== process.execPath) process.exit(2);
      if (!r.args[0].replace(/\\\\/g, '/').includes('/node_modules/eas-cli/')) process.exit(3);
    `);
    expect(result.status).toBe(0);
  });

  it('throws actionable error when local eas-cli is missing', () => {
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
});
