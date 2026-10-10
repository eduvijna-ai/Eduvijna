#!/usr/bin/env node
/**
 * Smoke-test Expo start on a disposable port (does not attach to Founder Metro 8082).
 * Requires observed Metro startup log line before treating run as success.
 */
import { spawn } from 'node:child_process';
import { createWriteStream, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const wrapper = join(repoRoot, 'scripts/with-eduvijna-api-env.mjs');
const SMOKE_PORT = process.env.EDUVIJNA_EXPO_SMOKE_PORT || '19012';
const METRO_START_PATTERN =
  /Metro waiting on|Waiting on http|Logs for your project will appear|Bundling complete/i;

const logDir = mkdtempSync(join(tmpdir(), 'eduvijna-expo-smoke-'));
const logPath = join(logDir, 'expo-smoke.log');
const logStream = createWriteStream(logPath, { flags: 'a' });

let sawMetroStartup = false;
let outputBuffer = '';

function inspectChunk(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);
  logStream.write(text);
  outputBuffer += text;
  if (METRO_START_PATTERN.test(text)) {
    sawMetroStartup = true;
  }
}

const child = spawn(
  process.execPath,
  [
    wrapper,
    'development',
    '--',
    'expo',
    'start',
    '--non-interactive',
    '--port',
    SMOKE_PORT,
  ],
  {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: false,
    env: { ...process.env, EDUVIJNA_API_ENV: 'development', CI: '1' },
  },
);

const timer = setTimeout(() => {
  child.kill('SIGINT');
}, 20000);

child.stdout?.on('data', inspectChunk);
child.stderr?.on('data', inspectChunk);

child.on('exit', (code, signal) => {
  clearTimeout(timer);
  logStream.end();
  const logText = readFileSync(logPath, 'utf8');
  if (!sawMetroStartup && METRO_START_PATTERN.test(logText)) {
    sawMetroStartup = true;
  }
  try {
    rmSync(logDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
  const intentionalShutdown = signal === 'SIGINT' || signal === 'SIGTERM';
  const unexpectedExit = code !== 0 && code !== null && !intentionalShutdown;

  if (!sawMetroStartup) {
    console.error('Smoke failed: Metro startup was not observed in Expo output.');
    process.exit(1);
  }
  if (unexpectedExit) {
    console.error(
      `Smoke failed: process exited with code ${code} after Metro startup (not an intentional shutdown).`,
    );
    process.exit(1);
  }
  console.log(
    `Expo smoke passed (Metro observed). exit code=${code ?? 'null'} signal=${signal ?? 'null'}`,
  );
  process.exit(0);
});

child.on('error', (error) => {
  clearTimeout(timer);
  console.error('Failed to spawn Expo start:', error.message);
  process.exit(1);
});
