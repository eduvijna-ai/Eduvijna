#!/usr/bin/env node
import { spawn, spawnSync, execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINEERING_METRO_PORT, ENGINEERING_REPO_ROOT } from './lib/engineering-runtime-target.mjs';

const repoRoot = ENGINEERING_REPO_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');

function killPort(port) {
  const r = spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `$c = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($c) { $c | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }`,
    ],
    { encoding: 'utf8' },
  );
  return (r.stdout || '') + (r.stderr || '');
}

killPort(ENGINEERING_METRO_PORT);
execSync('node scripts/write-engineering-build-stamp.mjs', { cwd: repoRoot, stdio: 'inherit' });
console.log(JSON.stringify({ step: 'killed_port', port: ENGINEERING_METRO_PORT }));

const child = spawn(
  'npx',
  ['expo', 'start', '--port', String(ENGINEERING_METRO_PORT), '--dev-client'],
  {
    cwd: repoRoot,
    detached: true,
    stdio: 'ignore',
    shell: true,
    env: {
      ...process.env,
      EDUVIJNA_GIT_SHA: (
        spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout || ''
      ).trim(),
    },
  },
);
child.unref();
console.log(JSON.stringify({ step: 'metro_started', pid: child.pid, port: ENGINEERING_METRO_PORT }));
