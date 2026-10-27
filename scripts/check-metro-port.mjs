#!/usr/bin/env node
/**
 * Check whether a TCP port is free on Windows (default 8082).
 * Usage: node scripts/check-metro-port.mjs [port]
 */
import net from 'node:net';
import { execFileSync } from 'node:child_process';

const port = Number(process.argv[2] || 8082);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${process.argv[2]}`);
  process.exit(2);
}

function tryListen(p) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => resolve({ available: false, code: err.code }));
    server.once('listening', () => {
      server.close(() => resolve({ available: true }));
    });
    server.listen(p, '0.0.0.0');
  });
}

function owningProcess(p) {
  const ps = `
    $c = Get-NetTCPConnection -LocalPort ${p} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $c) { '' }
    else {
      $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
      Write-Output ("{0}|{1}|{2}" -f $c.OwningProcess, $proc.ProcessName, $proc.Path)
    }
  `;
  try {
    const raw = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-Command', ps],
      { encoding: 'utf8', windowsHide: true },
    ).trim();
    if (!raw) return null;
    const [pid, name, path] = raw.split('|');
    return { pid: Number(pid), name, path };
  } catch {
    return null;
  }
}

const owner = owningProcess(port);
if (owner) {
  console.log(JSON.stringify({ port, available: false, owner }, null, 2));
  process.exit(1);
}

const listen = await tryListen(port);
if (listen.available) {
  console.log(JSON.stringify({ port, available: true }));
  process.exit(0);
}

console.log(
  JSON.stringify(
    { port, available: false, owner: null, listenCode: listen.code },
    null,
    2,
  ),
);
process.exit(1);
