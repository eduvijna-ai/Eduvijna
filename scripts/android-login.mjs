/**
 * Android normal login diagnostics (no secrets in logs or committed artifacts).
 */
import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loginDevApi } from './lib/dev-api-auth.mjs';
import { findLoginFields, findTapTarget } from './lib/android-ui-parse.mjs';
import {
  collectUiTexts,
  locateByLabel,
  parseUiXml,
  readXmlContent,
} from './lib/android-journey-logic.mjs';
import { classifyAndroidRuntimeScreen } from './lib/android-runtime-screen.mjs';
import { prepareAndroidEngineeringRuntime } from './lib/android-engineering-runtime-prep.mjs';
import { adbUiDump } from './lib/adb-ui-dump.mjs';
const APP_PACKAGE = 'com.eduvijna.app';
const METRO_URL = process.env.ENGINEERING_METRO_URL || 'http://127.0.0.1:8082';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence', 'android-login');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';

mkdirSync(evidence, { recursive: true });

function adb(cmd) {
  return execSync(`adb -s ${serial} ${cmd}`, { encoding: 'utf8' });
}

function sleep(ms) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
}

function dumpUi(name) {
  const local = join(evidence, name);
  adbUiDump(serial, local);
  return local;
}

function tap(x, y) {
  adb(`shell input tap ${x} ${y}`);
}

function sha256(text) {
  return createHash('sha256').update(String(text)).digest('hex').slice(0, 12);
}

function adbSetClipboard(text) {
  spawnSync('adb', ['-s', serial, 'shell', 'cmd', 'clipboard', 'set-text', String(text)], {
    encoding: 'utf8',
  });
}

function adbPaste() {
  adb('shell input keyevent 279');
}

function clearField() {
  for (let i = 0; i < 96; i++) adb('shell input keyevent 67');
}

function resetLoginFormFields(fields) {
  tap(fields.email.x, fields.email.y);
  sleep(150);
  clearField();
  tap(fields.pass.x, fields.pass.y);
  sleep(150);
  clearField();
  tap(fields.email.x, fields.email.y);
  sleep(150);
  clearField();
}

/** Per-character `adb shell input text` (works with secureTextEntry + RN onEndEditing sync). */
function adbInputText(text) {
  const specials = new Set('!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`');
  for (const ch of String(text)) {
    if (ch === ' ') {
      execSync(`adb -s ${serial} shell input text %s`, { stdio: 'ignore' });
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      execSync(`adb -s ${serial} shell input text ${ch}`, { stdio: 'ignore' });
    } else if (ch === '%') {
      execSync(`adb -s ${serial} shell input text %25`, { stdio: 'ignore' });
    } else if (specials.has(ch)) {
      execSync(`adb -s ${serial} shell input text \\${ch}`, { stdio: 'ignore' });
    } else {
      typeEscapedInput(ch);
    }
    sleep(40);
  }
}

function blurPasswordFieldSync(fields) {
  tap(fields.email.x, fields.email.y);
  sleep(350);
  tap(fields.pass.x, fields.pass.y);
  sleep(250);
  adb('shell input keyevent 111');
  sleep(200);
}

function readLoginDiagLogcat() {
  try {
    const log = execSync(`adb -s ${serial} logcat -d -s ReactNativeJS:I`, { encoding: 'utf8' });
    const parsed = [];
    for (const line of log.split('\n')) {
      const idx = line.indexOf('LOGIN_DIAG');
      if (idx < 0) continue;
      const json = line.slice(idx + 'LOGIN_DIAG'.length).trim();
      try {
        parsed.push(JSON.parse(json));
      } catch {
        // ignore
      }
    }
    return parsed;
  } catch {
    return [];
  }
}

function typeEscapedInput(text) {
  const escaped = String(text)
    .replace(/%/g, '%25')
    .replace(/ /g, '%s')
    .replace(/@/g, '\\@')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
  adb(`shell input text "${escaped}"`);
}

function typeLoginCredential(text) {
  for (const ch of String(text)) {
    if (ch === ' ') {
      adb('shell input text %s');
    } else if (ch === '@') {
      adb('shell input text \\@');
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      adb(`shell input text ${ch}`);
    } else {
      typeEscapedInput(ch);
    }
    sleep(30);
  }
}

function typePasswordSecure(password) {
  try {
    adbSetClipboard(password);
    const got = adb('shell cmd clipboard get-text').trim();
    if (got.length === password.length) {
      adbPaste();
      return { method: 'clipboard_paste', clipLen: got.length };
    }
  } catch {
    /* fall through */
  }
  typeLoginCredential(password);
  return { method: 'per_char', clipLen: 0 };
}

function readEmailFieldText(xmlPath) {
  const s = readFileSync(xmlPath, 'utf8');
  const m =
    s.match(/resource-id="login-email-input"[^>]*text="([^"]*)"/) ||
    s.match(/text="([^"]*)"[^>]*resource-id="login-email-input"/);
  const value = m?.[1] ?? null;
  if (!value || value === 'Email or Username') return '';
  return value;
}

function waitFor(predicate, { attempts = 24, pauseMs = 1000, dumpPrefix = 'wait' } = {}) {
  for (let i = 0; i < attempts; i++) {
    const path = dumpUi(`${dumpPrefix}-${i}.xml`);
    const xml = readXmlContent(path);
    const hit = predicate(xml, path);
    if (hit) return { ok: true, ...hit, xmlPath: path };
    sleep(pauseMs);
  }
  return { ok: false };
}

const classifyScreen = classifyAndroidRuntimeScreen;

async function probeApiLogin(role, account) {
  try {
    const result = await loginDevApi(account.username, account.password);
    return { ok: true, status: 200, userIdRedacted: result.userId ? sha256(result.userId) : null };
  } catch (e) {
    const status = e?.status ?? e?.response?.status ?? null;
    return { ok: false, status, code: e?.code ?? 'api_error' };
  }
}

function dismissStartupOverlays() {
  try {
    execSync(`node "${join(repoRoot, 'scripts/android-dismiss-overlays.mjs')}"`, { stdio: 'ignore' });
  } catch {
    // ignore
  }
  for (let i = 0; i < 4; i++) {
    const path = dumpUi(`pre-login-overlay-${i}.xml`);
    const content = readXmlContent(path);
    const screen = classifyScreen(content);
    if (screen === 'login_form' || screen === 'authenticated_shell') return;
    const cont = findTapTarget(path, 'Continue');
    if (cont) {
      tap(cont.x, cont.y);
      sleep(2000);
      continue;
    }
    const reload = findTapTarget(path, 'Reload');
    if (reload) {
      tap(reload.x, reload.y);
      sleep(20000);
    }
    sleep(1500);
  }
}

async function runLogin(role) {
  const startedAt = new Date().toISOString();
  const freshLogin = process.argv.includes('--fresh-login');
  const restartMetro = process.argv.includes('--restart-metro');
  const skipRuntimePrep = process.argv.includes('--skip-runtime-prep');

  let runtimePrecondition = null;
  if (!skipRuntimePrep) {
    const prep = await prepareAndroidEngineeringRuntime({
      fresh: freshLogin,
      restartMetro,
      relaunchDevClient: freshLogin,
      evidenceRoot: join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence'),
    });
    runtimePrecondition = prep.report;
    if (!prep.ok) {
      const report = {
        role,
        pass: false,
        firstFailingBoundary: 'runtime_prep',
        milestones: [{ step: 'runtime_prep', ok: false, report: prep.report }],
        appPackage: APP_PACKAGE,
        metroUrl: METRO_URL,
        startedAt,
        at: new Date().toISOString(),
        runtimePrecondition: prep.report,
      };
      writeFileSync(join(evidence, `login-${role}-report.json`), JSON.stringify(report, null, 2));
      return report;
    }
  } else {
    adb('reverse tcp:8082 tcp:8082');
    adb('reverse tcp:8081 tcp:8082');
  }
  dismissStartupOverlays();
  const milestones = [];
  const fail = (boundary, detail) => {
    milestones.push({ boundary, ...detail });
    const report = {
      role,
      pass: false,
      firstFailingBoundary: boundary,
      milestones,
      appPackage: APP_PACKAGE,
      metroUrl: METRO_URL,
      startedAt,
      at: new Date().toISOString(),
    };
    writeFileSync(join(evidence, `login-${role}-report.json`), JSON.stringify(report, null, 2));
    return report;
  };

  if (!existsSync(credFile)) {
    return fail('credentials_file', { reason: 'missing_credentials' });
  }
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const account = cfg.accounts?.[role];
  if (!account?.username || !account?.password) {
    return fail('credentials_file', { reason: 'incomplete_account' });
  }

  const formReady = waitFor(
    (content) => {
      const screen = classifyScreen(content);
      if (screen === 'login_form') return { screen };
      if (screen === 'authenticated_shell') {
        const nodes = parseUiXml(content);
        const stillOnLogin = nodes.some((n) => (n['resource-id'] || '') === 'login-email-input');
        if (!stillOnLogin) return { screen, alreadyAuthenticated: true };
      }
      return null;
    },
    { dumpPrefix: `${role}-form-ready` },
  );
  milestones.push({ step: 'login_form_ready', ...formReady });
  if (!formReady.ok) {
    const failPath = dumpUi(`${role}-form-fail.xml`);
    return fail('login_form_ready', { screen: classifyScreen(readXmlContent(failPath)) });
  }
  if (formReady.alreadyAuthenticated && !freshLogin) {
    const report = {
      role,
      pass: true,
      milestones,
      outcome: 'already_authenticated',
      appPackage: APP_PACKAGE,
      metroUrl: METRO_URL,
      startedAt,
      authenticatedShellDetection: 'assessments_or_analytics_tab',
      at: new Date().toISOString(),
    };
    writeFileSync(join(evidence, `login-${role}-report.json`), JSON.stringify(report, null, 2));
    return report;
  }

  const fields = findLoginFields(formReady.xmlPath);
  if (!fields) {
    return fail('login_fields', { reason: 'fields_not_found' });
  }
  milestones.push({ step: 'fields_located', emailY: fields.email.y, passY: fields.pass.y });

  resetLoginFormFields(fields);
  tap(fields.email.x, fields.email.y);
  sleep(200);
  clearField();
  adbInputText(account.username);
  sleep(400);

  tap(fields.pass.x, fields.pass.y);
  sleep(250);
  clearField();
  adbInputText(account.password);
  blurPasswordFieldSync(fields);
  const passwordEntry = { method: 'adb_input_per_char' };
  sleep(400);
  milestones.push({ step: 'password_entry', ...passwordEntry });

  const usernameProbe = sha256(account.username);
  const passwordLen = account.password.length;
  const afterPopulatePath = dumpUi(`${role}-after-populate.xml`);
  const emailFieldText = readEmailFieldText(afterPopulatePath);
  milestones.push({
    step: 'inputs_populated',
    usernameSha256Prefix: usernameProbe,
    passwordLength: passwordLen,
    emailFieldMatchesUsername: emailFieldText === account.username,
  });

  const apiProbe = await probeApiLogin(role, account);
  milestones.push({ step: 'api_login_probe', ...apiProbe });

  const preSubmitDiag = readLoginDiagLogcat();
  const lastPassChange = preSubmitDiag.filter((e) => e.type === 'change' && e.field === 'password').pop();
  const lastEmailChange = preSubmitDiag.filter((e) => e.type === 'change' && e.field === 'email').pop();
  milestones.push({
    step: 'pre_submit_diag_lengths',
    emailChangeLength: lastEmailChange?.length ?? null,
    passwordChangeLength: lastPassChange?.length ?? null,
  });

  try {
    execSync(`adb -s ${serial} logcat -c`, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }

  tap(fields.btn.x, fields.btn.y);
  milestones.push({ step: 'submit_tapped', method: 'sign_in_button' });
  sleep(3500);

  let logcatDiag = [];
  try {
    const log = execSync(`adb -s ${serial} logcat -d -s ReactNativeJS:I`, { encoding: 'utf8' });
    logcatDiag = log
      .split('\n')
      .filter((line) => line.includes('LOGIN_DIAG'))
      .slice(-12)
      .map((line) => line.replace(/^.*LOGIN_DIAG\s*/, '').trim());
  } catch {
    logcatDiag = [];
  }

  let loginDiagnostics = null;
  try {
    const raw = adb('shell run-as com.eduvijna.app cat files/login-diagnostics.json');
    loginDiagnostics = JSON.parse(raw);
  } catch {
    loginDiagnostics = { events: [], note: 'diagnostics_unavailable' };
  }
  const diagEvents = loginDiagnostics?.events ?? [];
  const lastSubmit = diagEvents.filter((e) => e.type === 'submit').pop();
  const lastChangeEmail = diagEvents.filter((e) => e.type === 'change' && e.field === 'email').pop();
  const lastChangePass = diagEvents.filter((e) => e.type === 'change' && e.field === 'password').pop();
  milestones.push({
    step: 'in_app_login_diagnostics',
    submitEmailLength: lastSubmit?.emailLength ?? null,
    submitPasswordLength: lastSubmit?.passwordLength ?? null,
    lastEmailChangeLength: lastChangeEmail?.length ?? null,
    lastPasswordChangeLength: lastChangePass?.length ?? null,
    eventCount: diagEvents.length,
    logcatEvents: logcatDiag.length,
    logcatLast: logcatDiag[logcatDiag.length - 1] ?? null,
  });

  const afterLogin = waitFor(
    (content) => {
      const screen = classifyScreen(content);
      if (screen === 'authenticated_shell') return { screen };
      if (screen === 'credential_rejected_ui') return { screen, rejected: true };
      if (screen === 'bundle_error') return { screen, bundleError: true };
      if (/Enable Push Notifications/i.test(content)) {
        try {
          execSync(`node "${join(repoRoot, 'scripts/android-dismiss-overlays.mjs')}"`, { stdio: 'ignore' });
        } catch {
          // ignore
        }
      }
      return null;
    },
    { attempts: 30, pauseMs: 1500, dumpPrefix: `${role}-post-submit` },
  );
  milestones.push({ step: 'post_submit_observation', ...afterLogin });

  if (!afterLogin.ok) {
    const failPath = dumpUi(`${role}-post-fail.xml`);
    const screen = classifyScreen(readXmlContent(failPath));
    if (!apiProbe.ok && apiProbe.status === 401) {
      return fail('credential_rejected', { screen, apiProbe });
    }
    if (screen === 'bundle_error') {
      return fail('bundle_load', { apiProbe });
    }
    if (screen === 'outside_app' || screen === 'launcher_icon') {
      return fail('app_not_foreground', { screen, apiProbe });
    }
    if (screen === 'login_form' || screen === 'login_in_progress') {
      return fail('in_app_login_no_navigation', { screen, apiProbe });
    }
    return fail('authenticated_shell_timeout', { screen, apiProbe });
  }

  const report = {
    role,
    pass: true,
    milestones,
    outcome: 'authenticated_shell',
    authenticatedShellDetection: 'assessments_or_analytics_tab',
    apiProbeOk: apiProbe.ok,
    appPackage: APP_PACKAGE,
    metroUrl: METRO_URL,
    startedAt,
    at: new Date().toISOString(),
    runtimePrecondition,
  };
  writeFileSync(join(evidence, `login-${role}-report.json`), JSON.stringify(report, null, 2));
  return report;
}

const role = process.argv[2] || 'instructor';
const result = await runLogin(role);
console.log(JSON.stringify({ role, pass: result.pass, firstFailingBoundary: result.firstFailingBoundary ?? null }));
if (!result.pass) process.exit(1);
