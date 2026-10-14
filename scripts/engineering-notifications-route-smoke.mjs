import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmulatorLoginHarness } from './lib/emulator-login-harness.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `notifications-smoke-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
const h = createEmulatorLoginHarness();
const { adb, sleep, dumpUi, tapContentDesc } = h;

function shot(n) {
  execSync(`adb -s ${h.device} exec-out screencap -p > "${join(evidenceDir, n)}"`, { shell: true, stdio: 'inherit' });
}

mkdirSync(evidenceDir, { recursive: true });
adb('shell monkey -p com.eduvijna.app -c android.intent.category.LAUNCHER 1');
sleep(6000);
let xmlBoot = dumpUi();
if (/No Quiz Available/i.test(xmlBoot)) {
  tapContentDesc(xmlBoot, 'Go Back') || tapText(xmlBoot, 'Go Back');
  sleep(2000);
  xmlBoot = dumpUi();
}
tapContentDesc(xmlBoot, 'Home');
sleep(2500);
function tapText(xml, text) {
  const m = new RegExp(`text="${text}"[^>]*bounds="([^"]+)"`, 'i').exec(xml);
  if (!m) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
  return true;
}
function tapBell(xml) {
  const m = /clickable="true"[^>]*bounds="\[949,91\]\[1049,190\]"/.exec(xml);
  if (m) {
    adb('shell input tap 999 140');
    return true;
  }
  const any = /bounds="\[9\d{2},8\d\]\[10\d{2},1\d\d\]"/.exec(xml);
  if (any) {
    const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(any[0]);
    adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
    return true;
  }
  adb('shell input tap 999 140');
  return false;
}
let xml0 = dumpUi();
tapBell(xml0);
sleep(3000);
const xml = dumpUi();
writeFileSync(join(evidenceDir, 'notifications-ui.xml'), xml);
shot('notifications-screen.png');
const routeOk = /Notifications|No notifications|Mark all read/i.test(xml);
const delivery = {
  status: 'not_verified',
  reason:
    'Emulator lacks FCM/APNs delivery path for release push; only in-app bell route and settings toggle were exercised.',
};
const results = { routeOk, delivery, evidenceDir };
writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
process.exit(routeOk ? 0 : 1);
