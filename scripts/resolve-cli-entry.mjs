/**
 * Resolve expo/eas shims to `node <cli-entry.js> ...` for reliable Windows spawning.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function expoCliEntry() {
  return join(repoRoot, 'node_modules', 'expo', 'bin', 'cli');
}

function easCliEntry() {
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
    const entry = easCliEntry();
    if (!entry) {
      throw new Error('eas-cli is not installed locally. Install eas-cli or use npx from a shell.');
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
