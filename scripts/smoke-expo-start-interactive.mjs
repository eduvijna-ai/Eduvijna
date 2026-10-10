#!/usr/bin/env node
/**
 * Smoke-test: Expo start inherits TTY streams and responds to SIGINT (Windows-safe CLI spawn).
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const wrapper = join(repoRoot, 'scripts/with-eduvijna-api-env.mjs');

const child = spawn(
  process.execPath,
  [wrapper, 'development', '--', 'expo', 'start', '--non-interactive'],
  {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, EDUVIJNA_API_ENV: 'development', CI: '1' },
  },
);

let sawMetro = false;
const timer = setTimeout(() => {
  if (!sawMetro) {
    console.error('Timeout waiting for Metro output (15s)');
  }
  child.kill('SIGINT');
}, 15000);

child.stdout?.on('data', () => {
  sawMetro = true;
});
child.stderr?.on('data', () => {
  sawMetro = true;
});

child.on('exit', (code, signal) => {
  clearTimeout(timer);
  console.log(`Expo start exited code=${code ?? 'null'} signal=${signal ?? 'null'}`);
  process.exit(code === null && signal ? 0 : code ?? 1);
});

child.on('error', (error) => {
  clearTimeout(timer);
  console.error('Failed to spawn Expo start:', error.message);
  process.exit(1);
});
