import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findTapTarget, parseUiTexts } from './lib/android-ui-parse.mjs';
import { mkdirSync } from 'node:fs';

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
  execSync(`adb -s ${serial} shell uiautomator dump /sdcard/ui.xml`, { stdio: 'ignore' });
  execSync(`adb -s ${serial} pull /sdcard/ui.xml "${local.replace(/\\/g, '/')}"`, { stdio: 'ignore' });
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

if (texts.some((t) => /developer menu/i.test(t))) {
  const cont = findTapTarget(xml, 'Continue');
  if (cont) {
    adb(`shell input tap ${cont.x} ${cont.y}`);
    steps.push('dev_menu_continue');
    sleep(1500);
  }
}

console.log(JSON.stringify({ steps, texts: texts.slice(0, 20) }));
