/**
 * Resolve expo/eas shims to `node <cli-entry.js> ...` for reliable Windows spawning.
 * Local package entries are preferred; EAS falls back to the global npm root when documented.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function expoCliEntry() {
  return join(repoRoot, 'node_modules', 'expo', 'bin', 'cli');
}

function localEasCliEntry() {
  try {
    return require.resolve('eas-cli/build/bin/cli');
  } catch {
    try {
      return require.resolve('eas-cli/bin/run');
    } catch {
      return null;
    }
  }
}

function globalNpmModulesRoot() {
  const npmCli = join(repoRoot, 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (existsSync(npmCli)) {
    const result = spawnSync(process.execPath, [npmCli, 'root', '-g'], {
      encoding: 'utf8',
      shell: false,
    });
    if (result.status === 0) {
      const root = result.stdout.trim();
      if (root && existsSync(root)) {
        return root;
      }
    }
  }

  if (process.platform === 'win32' && process.env.APPDATA) {
    const appDataRoot = join(process.env.APPDATA, 'npm', 'node_modules');
    if (existsSync(appDataRoot)) {
      return appDataRoot;
    }
  }

  return null;
}

function easEntryFromModuleRoot(modulesRoot) {
  const candidates = [
    join(modulesRoot, 'eas-cli', 'build', 'bin', 'cli'),
    join(modulesRoot, 'eas-cli', 'bin', 'run'),
  ];
  for (const entry of candidates) {
    if (existsSync(entry)) {
      return entry;
    }
  }
  return null;
}

function resolveEasCliEntry() {
  const local = localEasCliEntry();
  if (local) {
    return local;
  }
  const globalRoot = globalNpmModulesRoot();
  if (globalRoot) {
    return easEntryFromModuleRoot(globalRoot);
  }
  return null;
}

/**
 * @param {string[]} commandArgv
 * @returns {{ executable: string, args: string[], display: string }}
 */
export function resolveCommandArgv(commandArgv) {
  if (!commandArgv.length) {
    throw new Error('Empty command');
  }

  const head = commandArgv[0];
  const tail = commandArgv.slice(1);
  const headBase = basename(head).replace(/\.(cmd|exe)$/i, '');

  if (headBase === 'expo') {
    const entry = expoCliEntry();
    if (!existsSync(entry)) {
      throw new Error(`Expo CLI entry not found at ${entry}. Run npm ci.`);
    }
    return {
      executable: process.execPath,
      args: [entry, ...tail],
      display: `node ${entry} ${tail.join(' ')}`.trim(),
    };
  }

  if (headBase === 'eas') {
    const entry = resolveEasCliEntry();
    if (!entry) {
      throw new Error(
        'EAS CLI not found. Run npm ci (installs eas-cli locally) or npm install -g eas-cli.',
      );
    }
    return {
      executable: process.execPath,
      args: [entry, ...tail],
      display: `node ${entry} ${tail.join(' ')}`.trim(),
    };
  }

  if (headBase === 'node' || head === process.execPath) {
    return {
      executable: headBase === 'node' ? process.execPath : head,
      args: tail,
      display: commandArgv.join(' '),
    };
  }

  return {
    executable: head,
    args: tail,
    display: commandArgv.join(' '),
  };
}
