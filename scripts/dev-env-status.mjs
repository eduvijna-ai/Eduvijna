#!/usr/bin/env node
/**
 * One-shot status for EduVijna Expo LAN + Android emulator readiness.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { networkInterfaces } from 'node:os';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pkg = require(join(repoRoot, 'package.json'));
const PORT = Number(process.env.EXPO_METRO_PORT || 8082);

function run(cmd, args, opts = {}) {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf8',
      windowsHide: true,
      cwd: repoRoot,
      ...opts,
    }).trim();
  } catch (e) {
    return (e.stdout || e.stderr || e.message || '').toString().trim();
  }
}

function lanIp() {
  const r = spawnSync(process.execPath, [join(repoRoot, 'scripts/detect-lan-ipv4.mjs')], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.status === 0) return r.stdout.trim();
  return null;
}

function httpGet(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ ok: true, status: res.statusCode, body: body.trim() }));
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

const lan = lanIp();
const adbDevices = run('adb', ['devices', '-l']);
const avds = run('emulator', ['-list-avds']);
const nodeV = process.version;
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmV = run(npmCmd, ['--version']);
const expoSdk = pkg.dependencies?.expo || 'unknown';

const localStatus = await httpGet(`http://127.0.0.1:${PORT}/status`);
const lanStatus = lan ? await httpGet(`http://${lan}:${PORT}/status`) : { ok: false, error: 'no-lan-ip' };

const report = {
  at: new Date().toISOString(),
  git: {
    branch: run('git', ['branch', '--show-current']),
    sha: run('git', ['rev-parse', 'HEAD']),
  },
  node: nodeV,
  npm: npmV,
  expoSdk,
  metroPort: PORT,
  lanIp: lan,
  adbDevices,
  avds,
  metroLocal: localStatus,
  metroLan: lanStatus,
  expectedExpoGoUrl: lan ? `exp://${lan}:${PORT}` : null,
  expectedDevClientUrl: lan ? `exp+eduvijna://expo-development-client/?url=http%3A%2F%2F${lan}%3A${PORT}` : null,
  hostIfaces: Object.fromEntries(
    Object.entries(networkInterfaces()).map(([k, v]) => [
      k,
      (v || []).filter((a) => a.family === 'IPv4' || a.family === 4).map((a) => a.address),
    ]),
  ),
};

console.log(JSON.stringify(report, null, 2));
