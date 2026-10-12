import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findTapTarget, parseUiTexts } from './lib/android-ui-parse.mjs';
import { mkdirSync } from 'node:fs';
import { adbUiDump } from './lib/adb-ui-dump.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence');
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';

function adb(cmd) {
  execSync(`adb -s ${serial} ${cmd}`, { stdio: 'ignore' });
}
function sleep(ms) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
}
function dump(name) {
  mkdirSync(evidence, { recursive: true });
  const local = join(evidence, name);
  adbUiDump(serial, local);
  return local;
}

let xml = dump('overlay-before.xml');
let texts = parseUiTexts(xml);
const steps = [];

if (texts.some((t) => /Enable Push Notifications/i.test(t))) {
  const later = findTapTarget(xml, 'Maybe Later');
  if (later) {
    adb(`shell input tap ${later.x} ${later.y}`);
    steps.push('push_maybe_later');
    sleep(2000);
    xml = dump('overlay-after-push.xml');
    texts = parseUiTexts(xml);
  }
}

if (texts.some((t) => /isn't responding|not responding/i.test(t))) {
  const wait = findTapTarget(xml, 'Wait');
  if (wait) {
    adb(`shell input tap ${wait.x} ${wait.y}`);
    steps.push('anr_wait');
    sleep(3000);
    xml = dump('overlay-after-anr.xml');
    texts = parseUiTexts(xml);
  }
}

if (texts.some((t) => /DEVELOPMENT SERVERS|development server/i.test(t))) {
  const metro =
    findTapTarget(xml, '127.0.0.1:8082') ||
    findTapTarget(xml, '8082') ||
    findTapTarget(xml, '10.0.2.2:8082');
  if (metro) {
    adb(`shell input tap ${metro.x} ${metro.y}`);
    steps.push('select_metro_8082');
    sleep(15000);
    xml = dump('overlay-after-metro.xml');
    texts = parseUiTexts(xml);
  }
}

if (texts.some((t) => /developer menu/i.test(t))) {
  const cont = findTapTarget(xml, 'Continue');
  if (cont) {
    adb(`shell input tap ${cont.x} ${cont.y}`);
    steps.push('dev_menu_continue');
    sleep(1500);
  }
}

console.log(JSON.stringify({ steps, texts: texts.slice(0, 20) }));
