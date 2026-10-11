import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import { findLoginFields, parseUiTexts } from './lib/android-ui-parse.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';
const role = process.argv[2] || 'instructor';

function adb(cmd) {
  execSync(`adb -s ${serial} ${cmd}`, { stdio: 'inherit' });
}
function sleep(ms) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
}
function dump(name) {
  mkdirSync(evidence, { recursive: true });
  const local = join(evidence, name);
  execSync(`adb -s ${serial} shell uiautomator dump /sdcard/ui.xml`, { stdio: 'ignore' });
  execSync(`adb -s ${serial} pull /sdcard/ui.xml "${local.replace(/\\/g, '/')}"`, { stdio: 'ignore' });
  return local;
}

const xml = dump(`login-attempt-${role}.xml`);
const preTexts = parseUiTexts(xml);
if (
  preTexts.some((t) => /Assessments|Analytics|Hello,|Demo School|Enable Push/i.test(t)) &&
  !preTexts.some((t) => t === 'Sign in')
) {
  console.log(JSON.stringify({ ok: true, reason: 'already_authenticated' }));
  process.exit(0);
}
const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
const account = cfg.accounts[role];
const fields = findLoginFields(xml);
if (!fields) {
  console.log(JSON.stringify({ ok: false, reason: 'login_ui_missing' }));
  process.exit(3);
}

function tap(x, y) {
  adb(`shell input tap ${x} ${y}`);
}
function clearField() {
  adb('shell input keyevent 123');
  for (let i = 0; i < 48; i++) adb('shell input keyevent 67');
}

function adbInputChar(ch) {
  if (/[a-zA-Z0-9]/.test(ch)) {
    spawnSync('adb', ['-s', serial, 'shell', 'input', 'text', ch], { stdio: 'ignore' });
    sleep(60);
    return;
  }
  if (ch === ' ') {
    spawnSync('adb', ['-s', serial, 'shell', 'input', 'text', '%s'], { stdio: 'ignore' });
    return;
  }
  const escaped = {
    '@': '\\@',
    '!': '\\!',
    '#': '\\#',
    '$': '\\$',
    '%': '\\%',
    '&': '\\&',
    '*': '\\*',
    '-': '\\-',
    '_': '\\_',
    '.': '\\.',
    '/': '\\/',
    ':': '\\:',
    ';': '\\;',
    ',': '\\,',
    '+': '\\+',
    '=': '\\=',
    '?': '\\?',
  }[ch];
  if (escaped) {
    spawnSync('adb', ['-s', serial, 'shell', 'input', 'text', escaped], { stdio: 'ignore' });
    sleep(60);
  }
}

function adbInputPassword(password) {
  for (const ch of String(password)) adbInputChar(ch);
}

const { email, pass, btn } = fields;
tap(email.x, email.y);
sleep(200);
clearField();
sleep(100);
const userSafe = account.username.replace(/ /g, '%s');
adb(`shell input text ${userSafe}`);
sleep(400);
tap(pass.x, pass.y);
sleep(200);
clearField();
sleep(100);
adbInputPassword(account.password);
sleep(500);
adb('shell input keyevent 66');
sleep(15000);
const after = dump(`login-success-${role}.xml`);
const texts = parseUiTexts(after);
const loggedIn =
  texts.some((t) => /Assessments|Analytics|Home|Demo School|Enable Push Notifications/i.test(t)) &&
  !texts.some((t) => t === 'Sign in');
writeFileSync(join(evidence, `login-result-${role}.json`), JSON.stringify({ loggedIn, sample: texts.slice(0, 12) }, null, 2));
console.log(JSON.stringify({ ok: loggedIn }));
