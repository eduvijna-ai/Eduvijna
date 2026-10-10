import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..');

function runResolveSnippet(source: string) {
  return spawnSync(
    process.execPath,
    ['--input-type=module', '-e', source],
    { cwd: repoRoot, encoding: 'utf8', shell: false },
  );
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

  it('resolves eas to an eas-cli node entry', () => {
    const result = runResolveSnippet(`
      import { resolveCommandArgv } from './scripts/resolve-cli-entry.mjs';
      const r = resolveCommandArgv(['eas', '--version']);
      if (r.executable !== process.execPath) process.exit(2);
      if (!r.args[0].includes('eas-cli')) process.exit(3);
    `);
    expect(result.status).toBe(0);
  });
});
