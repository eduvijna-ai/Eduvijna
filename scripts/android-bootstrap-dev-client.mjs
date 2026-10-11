/**
 * Bring Android dev client to app login/home without pm clear.
 * Uses UI dump to tap Continue / Metro server / login fields.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loginDevApi } from './lib/dev-api-auth.mjs';
import { findLoginFields, findTapTarget, parseUiTexts } from './lib/android-ui-parse.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';
// With `adb reverse tcp:8082`, device localhost reaches host Metro (more reliable than 10.0.2.2 on some emulators).
const metroHost = process.env.METRO_ANDROID_HOST || '127.0.0.1:8082';

function adb(cmd) {
  return execSync(`adb -s ${serial} ${cmd}`, { encoding: 'utf8' });
}

function sleep(ms) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
}

function dumpUi(name) {
  mkdirSync(evidence, { recursive: true });
  const local = join(evidence, name);
  adb('shell uiautomator dump /sdcard/ui.xml');
  execSync(`adb -s ${serial} pull /sdcard/ui.xml "${local.replace(/\\/g, '/')}"`, { stdio: 'ignore' });
  return local;
}

function tap(x, y) {
  adb(`shell input tap ${x} ${y}`);
}

function tapIf(xml, pattern) {
  const t = findTapTarget(xml, pattern);
  if (t) {
    tap(t.x, t.y);
    return t.label;
  }
  return null;
}

function adbText(text) {
  const safe = String(text).replace(/ /g, '%s');
  adb(`shell input text "${safe.replace(/"/g, '\\"')}"`);
}

function adbSetClipboard(text) {
  spawnSync('adb', ['-s', serial, 'shell', 'cmd', 'clipboard', 'set-text', String(text)], {
    encoding: 'utf8',
  });
}

function adbPaste() {
  adb('shell input keyevent 279');
}

async function ensureMetroConnected() {
  adb('reverse tcp:8082 tcp:8082');
  adb('reverse tcp:8081 tcp:8082');
  let xml = dumpUi('bootstrap-0.xml');
  let texts = parseUiTexts(xml);
  const log = { steps: [], textsSample: texts.slice(0, 20) };

  if (texts.some((t) => /developer menu/i.test(t))) {
    log.steps.push({ action: 'dismiss_dev_menu', tapped: tapIf(xml, 'Continue') });
    sleep(1500);
    xml = dumpUi('bootstrap-1.xml');
    texts = parseUiTexts(xml);
  }

  if (texts.some((t) => t.includes('8082') || /DEVELOPMENT SERVERS/i.test(t))) {
    log.steps.push({
      action: 'select_metro',
      tapped: tapIf(xml, '8082') || tapIf(xml, metroHost.replace(':', '\\\\:')),
    });
    sleep(12000);
    xml = dumpUi('bootstrap-2.xml');
    texts = parseUiTexts(xml);
  }

  if (texts.some((t) => /developer menu/i.test(t))) {
    log.steps.push({ action: 'dismiss_dev_menu_2', tapped: tapIf(xml, 'Continue') });
    sleep(2000);
    xml = dumpUi('bootstrap-3.xml');
    texts = parseUiTexts(xml);
  }

  // Deep link to dev client URL (explicit Metro 8082)
  const url = `exp+eduvijna://expo-development-client/?url=${encodeURIComponent(`http://${metroHost}`)}`;
  adb(`shell am start -a android.intent.action.VIEW -d "${url}"`);
  sleep(45000);
  xml = dumpUi('bootstrap-4.xml');
  texts = parseUiTexts(xml);
  log.steps.push({ action: 'deep_link', texts: texts.slice(0, 15) });

  if (texts.some((t) => /developer menu/i.test(t))) {
    tapIf(xml, 'Continue');
    sleep(2000);
    xml = dumpUi('bootstrap-5.xml');
    texts = parseUiTexts(xml);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    if (!texts.some((t) => /problem loading the project/i.test(t))) break;
    log.steps.push({ action: 'reload_bundle', attempt, tapped: tapIf(xml, 'Reload') });
    sleep(35000);
    xml = dumpUi(`bootstrap-reload-${attempt}.xml`);
    texts = parseUiTexts(xml);
  }

  log.finalTexts = texts;
  writeFileSync(join(evidence, 'android-bootstrap-log.json'), JSON.stringify(log, null, 2));
  return xml;
}

async function loginIfNeeded(role) {
  const xml = dumpUi(`login-${role}-before.xml`);
  const texts = parseUiTexts(xml);
  if (texts.some((t) => /problem loading the project/i.test(t))) {
    return { loggedIn: false, reason: 'bundle_load_error' };
  }
  if (
    texts.some((t) => /Assessments|Analytics|Home|Demo School/i.test(t)) &&
    !texts.some((t) => t === 'Sign in')
  ) {
    return { loggedIn: true, reason: 'already_authenticated' };
  }
  if (!texts.some((t) => /Sign in/i.test(t))) {
    return { loggedIn: false, reason: 'unknown_screen' };
  }
  if (!existsSync(credFile)) throw new Error('missing_credentials');
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const account = cfg.accounts?.[role];
  const fields = findLoginFields(xml);
  if (!fields) return { loggedIn: false, reason: 'login_fields_not_found' };
  const { email, pass, btn } = fields;
  tap(email.x, email.y);
  sleep(200);
  for (let i = 0; i < 48; i++) adb('shell input keyevent 67');
  adbText(account.username);
  sleep(400);
  tap(pass.x, pass.y);
  sleep(200);
  for (let i = 0; i < 48; i++) adb('shell input keyevent 67');
  for (const ch of String(account.password)) {
    if (/[a-zA-Z0-9]/.test(ch)) {
      adb(`shell input text ${ch}`);
    } else if (ch === ' ') {
      adb('shell input text %s');
    } else {
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
      }[ch];
      if (escaped) adb(`shell input text ${escaped}`);
    }
  }
  sleep(400);
  tap(btn.x, btn.y);
  sleep(10000);
  const after = dumpUi(`login-${role}-after.xml`);
  const afterTexts = parseUiTexts(after);
  const loggedIn =
    afterTexts.some((t) => /Assessments|Analytics|Home|Demo School/i.test(t)) &&
    !afterTexts.some((t) => t === 'Sign in');
  return { loggedIn, reason: 'submitted' };
}

const role = process.argv[2] || 'instructor';
await ensureMetroConnected();
const loginResult = await loginIfNeeded(role);
// verify API login works (no token output)
if (existsSync(credFile)) {
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const account = cfg.accounts?.[role];
  await loginDevApi(account.username, account.password);
}
writeFileSync(
  join(evidence, 'android-bootstrap-result.json'),
  JSON.stringify({ role, loginResult, at: new Date().toISOString() }, null, 2),
);
console.log(JSON.stringify({ ok: true, loginResult }));
