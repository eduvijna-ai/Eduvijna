/**
 * Resolve expo/eas shims to `node <cli-entry.js> ...` for reliable Windows spawning.
 * eas-cli must live under this repository's node_modules (no require.resolve / NODE_PATH).
 */
import { existsSync } from 'node:fs';
import { dirname, join, basename, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoEasRoot = join(repoRoot, 'node_modules', 'eas-cli');

const EAS_CLI_ENTRY_CANDIDATES = [
  join(repoEasRoot, 'build', 'bin', 'cli'),
  join(repoEasRoot, 'bin', 'run'),
];

function assertRepoLocalEasEntry(entryPath) {
  const normalizedEntry = resolve(entryPath);
  const normalizedRoot = resolve(repoEasRoot);
  const rootPrefix = process.platform === 'win32' ? normalizedRoot.toLowerCase() : normalizedRoot;
  const entryPrefix = process.platform === 'win32' ? normalizedEntry.toLowerCase() : normalizedEntry;
  const underRepoEas =
    entryPrefix === rootPrefix || entryPrefix.startsWith(rootPrefix + sep);
  if (!underRepoEas) {
    throw new Error('EAS CLI entry must resolve under node_modules/eas-cli in this repository.');
  }
  return normalizedEntry;
}

function localEasCliEntry() {
  for (const candidate of EAS_CLI_ENTRY_CANDIDATES) {
    if (existsSync(candidate)) {
      return assertRepoLocalEasEntry(candidate);
    }
  }
  return null;
}

function expoCliEntry() {
  return join(repoRoot, 'node_modules', 'expo', 'bin', 'cli');
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
    const entry = localEasCliEntry();
    if (!entry) {
      throw new Error('EAS CLI not found. Run npm ci to install the pinned eas-cli devDependency.');
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
