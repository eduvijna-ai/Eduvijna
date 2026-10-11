/**
 * Log into dev client on emulator (credentials from .dev-api-credentials.local.json).
 * Does not print secrets.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const role = process.argv[2] || 'instructor';
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';

function adb(cmd) {
  execSync(`adb -s ${serial} ${cmd}`, { stdio: 'inherit' });
}

function adbText(text) {
  const escaped = String(text).replace(/ /g, '%s').replace(/(['"\\$`&|;<>()])/g, '\\$1');
  execSync(`adb -s ${serial} shell input text ${escaped}`, { stdio: 'inherit' });
}

function sleep(ms) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
}

if (!existsSync(credFile)) {
  console.error('missing_credentials');
  process.exit(2);
}
const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
const account = cfg.accounts?.[role];
if (!account?.username || !account?.password) {
  console.error('missing_account');
  process.exit(2);
}

adb('shell pm clear com.eduvijna.app');
sleep(4000);
adb('shell am start -n com.eduvijna.app/.MainActivity');
sleep(6000);
adb('shell uiautomator dump /sdcard/login.xml');
const xml = execSync(`adb -s ${serial} shell cat /sdcard/login.xml`, { encoding: 'utf8' });
const emailMatch = xml.match(/text="Email or Username"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
const passMatch = xml.match(/password="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
const btnMatch = xml.match(/text="Sign in"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
const center = (m) => {
  const x = Math.floor((Number(m[1]) + Number(m[3])) / 2);
  const y = Math.floor((Number(m[2]) + Number(m[4])) / 2);
  return { x, y };
};
if (!emailMatch || !passMatch || !btnMatch) {
  console.error('login_layout_not_found');
  process.exit(3);
}
const email = center(emailMatch);
const pass = center(passMatch);
const btn = center(btnMatch);
adb(`shell input tap ${email.x} ${email.y}`);
sleep(400);
adbText(account.username);
sleep(400);
adb(`shell input tap ${pass.x} ${pass.y}`);
sleep(400);
adbText(account.password);
sleep(400);
adb(`shell input tap ${btn.x} ${btn.y}`);
console.log(`login_submitted role=${role}`);
