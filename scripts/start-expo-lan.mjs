#!/usr/bin/env node
/**
 * Start Expo over LAN on the preferred Metro port.
 *
 * Modes:
 *   node scripts/start-expo-lan.mjs go          # Expo Go (--go --lan)
 *   node scripts/start-expo-lan.mjs dev-client  # EduVijna development build
 *
 * Env:
 *   EXPO_METRO_PORT (default 8082)
 *   REACT_NATIVE_PACKAGER_HOSTNAME overrides Expo LAN host when set
 */
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const modeArg = (process.argv[2] || 'go').toLowerCase();
const mode = modeArg === 'dev-client' || modeArg === 'dev' || modeArg === 'device' ? 'dev-client' : 'go';
const port = String(process.env.EXPO_METRO_PORT || 8082);

function runNode(script, args = []) {
  return spawnSync(process.execPath, [join(repoRoot, script), ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    windowsHide: true,
  });
}

const portCheck = runNode('scripts/check-metro-port.mjs', [port]);
if (portCheck.status !== 0) {
  console.error(`Port ${port} is not available. Only one Metro instance may own it.`);
  console.error(portCheck.stdout || portCheck.stderr);
  console.error('Shutdown: stop the owning Node/Expo process, or change EXPO_METRO_PORT.');
  process.exit(1);
}

const lan = runNode('scripts/detect-lan-ipv4.mjs');
if (lan.status !== 0) {
  console.error(lan.stderr || lan.stdout || 'Failed to detect LAN IPv4');
  process.exit(1);
}
const lanIp = lan.stdout.trim();
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || lanIp;

const expoFlags =
  mode === 'go'
    ? ['start', '--go', '--lan', '--port', port]
    : ['start', '--dev-client', '--lan', '--port', port];

console.log('=== EduVijna Expo LAN ===');
console.log(`mode=${mode}`);
console.log(`LAN_IP=${lanIp}`);
console.log(`PORT=${port}`);
console.log(`REACT_NATIVE_PACKAGER_HOSTNAME=${process.env.REACT_NATIVE_PACKAGER_HOSTNAME}`);
if (mode === 'go') {
  console.log(`Expo Go URL (expected): exp://${lanIp}:${port}`);
} else {
  console.log(
    `Dev client URL (expected): exp+eduvijna://expo-development-client/?url=http%3A%2F%2F${lanIp}%3A${port}`,
  );
}
console.log('Metro status probe: http://' + lanIp + ':' + port + '/status');
console.log('Switching modes: stop this process (Ctrl+C), then start the other mode.');
console.log('Launching via with-eduvijna-api-env (development)...');

const wrapper = join(repoRoot, 'scripts/with-eduvijna-api-env.mjs');
const child = spawn(
  process.execPath,
  [wrapper, 'development', '--', 'expo', ...expoFlags],
  {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: false,
  },
);

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
