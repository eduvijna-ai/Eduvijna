#!/usr/bin/env node
/**
 * Print the preferred Windows LAN IPv4 for Expo --lan (Wi-Fi/Ethernet).
 * Skips loopback, APIPA, Hyper-V/WSL/Docker/VPN adapters, and disconnected NICs.
 */
import { networkInterfaces } from 'node:os';
import { execSync } from 'node:child_process';

const BAD_IFACE = /vEthernet|Hyper-V|VMware|VirtualBox|WSL|Docker|TAP|VPN|Cisco|ZeroTier|Tailscale|Hamachi|Npc|Loopback/i;

function powershellAdapterMap() {
  try {
    const raw = execSync(
      'powershell -NoProfile -Command "Get-NetAdapter | Select-Object Name,Status,InterfaceDescription,ifIndex | ConvertTo-Json -Compress"',
      { encoding: 'utf8', windowsHide: true },
    ).trim();
    const parsed = JSON.parse(raw || '[]');
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const byName = new Map();
    for (const a of list) {
      if (a?.Name) byName.set(String(a.Name), a);
    }
    return byName;
  } catch {
    return new Map();
  }
}

function score(ifaceName, address, adapter) {
  let s = 0;
  if (BAD_IFACE.test(ifaceName) || BAD_IFACE.test(adapter?.InterfaceDescription || '')) return -1000;
  if (address.startsWith('127.') || address.startsWith('169.254.')) return -1000;
  if (adapter?.Status && String(adapter.Status) !== 'Up') return -500;
  if (/Wi-?Fi|Wireless/i.test(ifaceName)) s += 30;
  if (/^Ethernet/i.test(ifaceName)) s += 20;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(address)) s += 10;
  if (adapter?.Status === 'Up') s += 50;
  return s;
}

const adapters = powershellAdapterMap();
const candidates = [];
const nets = networkInterfaces();
for (const [name, addrs] of Object.entries(nets)) {
  if (!addrs) continue;
  for (const a of addrs) {
    if (a.family !== 'IPv4' && a.family !== 4) continue;
    if (a.internal) continue;
    const adapter = adapters.get(name);
    const sc = score(name, a.address, adapter);
    candidates.push({ name, address: a.address, score: sc, status: adapter?.Status || 'unknown' });
  }
}
candidates.sort((x, y) => y.score - x.score);
const best = candidates.find((c) => c.score > 0);
if (!best) {
  console.error('No usable LAN IPv4 found. Candidates:');
  for (const c of candidates) console.error(`  ${c.address} (${c.name}, score=${c.score}, status=${c.status})`);
  process.exit(2);
}
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ lanIp: best.address, iface: best.name, candidates }, null, 2));
} else {
  console.log(best.address);
}
