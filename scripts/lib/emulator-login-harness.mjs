/**
 * Stabilized release-APK login for emulator (no credential logging).
 */
import { execSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function createEmulatorLoginHarness(device = process.env.ADB_DEVICE || 'emulator-5554') {
  function adb(cmd) {
    return execSync(`adb -s ${device} ${cmd}`, { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 }).trim();
  }

  function sleep(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  }

  function dumpUi() {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        adb('shell uiautomator dump /sdcard/eng-login-ui.xml');
      } catch (e) {
        const detail = `${e.stdout || ''}${e.stderr || ''}${e.message || ''}`;
        if (!/dumped|137/.test(detail)) throw e;
      }
      sleep(attempt === 0 ? 200 : 600);
      try {
        const xml = adb('shell cat /sdcard/eng-login-ui.xml');
        if (xml && xml.includes('<hierarchy')) return xml;
      } catch {
        /* retry */
      }
    }
    throw new Error('dumpUi failed after retries');
  }

  function centerFromBounds(bounds) {
    const m = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(bounds);
    if (!m) return null;
    return {
      x: Math.floor((+m[1] + +m[3]) / 2),
      y: Math.floor((+m[2] + +m[4]) / 2),
    };
  }

  function tapTestId(xml, testId) {
    const re = new RegExp(`resource-id="${testId}"[^>]*bounds="([^"]+)"`, 'i');
    const m = re.exec(xml);
    if (!m) return false;
    const c = centerFromBounds(m[1]);
    if (!c) return false;
    adb(`shell input tap ${c.x} ${c.y}`);
    return true;
  }

  function tapContentDesc(xml, desc) {
    const re = new RegExp(`content-desc="${desc}"[^>]*bounds="([^"]+)"`, 'i');
    const m = re.exec(xml);
    if (!m) return false;
    const c = centerFromBounds(m[1]);
    if (!c) return false;
    adb(`shell input tap ${c.x} ${c.y}`);
    return true;
  }

  function fieldNode(xml, testId) {
    const re = new RegExp(`<node[^>]*resource-id="${testId}"[^>]*>`, 'i');
    const m = re.exec(xml);
    if (m) return m[0];
    const re2 = new RegExp(`<node[^>]*resource-id="${testId}"[^>]*/>`, 'i');
    return re2.exec(xml)?.[0] ?? '';
  }

  function fieldNodeByHint(xml, hint) {
    const esc = hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`hint="${esc}"[^>]*bounds="(\\[[^\\]]+\\]\\[[^\\]]+\\])"`, 'i');
    const m = re.exec(xml);
    return m ? m[0] : '';
  }

  function fieldText(xml, testId) {
    const block = fieldNode(xml, testId);
    const textRe = /text="([^"]*)"/i;
    const raw = textRe.exec(block)?.[1] ?? '';
    if (raw === 'Email or Username' || raw === 'Password') return '';
    return raw;
  }

  function fieldTextByHint(xml, hint) {
    const esc = hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const blockRe = new RegExp(`<node[^>]*hint="${esc}"[^>]*>`, 'i');
    const block = blockRe.exec(xml)?.[0] ?? fieldNodeByHint(xml, hint);
    const textRe = /text="([^"]*)"/i;
    const raw = textRe.exec(block)?.[1] ?? '';
    if (raw === hint) return '';
    return raw;
  }

  function passwordMaskLength(xml) {
    const fromId = fieldText(xml, 'login-password-input');
    if (fromId.length > 0) return fromId.length;
    return fieldTextByHint(xml, 'Password').length;
  }

  function tapFieldByHint(xml, hint) {
    const block = fieldNodeByHint(xml, hint);
    const m = /bounds="(\[[^\]]+\]\[[^\]]+\])"/.exec(block);
    if (!m) return false;
    const c = centerFromBounds(m[1]);
    if (!c) return false;
    adb(`shell input tap ${c.x} ${c.y}`);
    return true;
  }

  function tapEmailField(xml) {
    return (
      tapFieldCenter(xml, 'login-email-input') ||
      tapFieldByHint(xml, 'Email or Username') ||
      tapContentDesc(xml, 'Email or Username')
    );
  }

  function tapPasswordField(xml) {
    return (
      tapFieldCenter(xml, 'login-password-input') ||
      tapFieldByHint(xml, 'Password') ||
      tapContentDesc(xml, 'Password')
    );
  }

  function readEmailField(xml) {
    const v = fieldText(xml, 'login-email-input');
    return v || fieldTextByHint(xml, 'Email or Username');
  }

  function tapFieldCenter(xml, testId) {
    const block = fieldNode(xml, testId);
    const m = /bounds="(\[[^\]]+\]\[[^\]]+\])"/.exec(block);
    if (!m) return tapTestId(xml, testId);
    const c = centerFromBounds(m[1]);
    if (!c) return false;
    adb(`shell input tap ${c.x} ${c.y}`);
    return true;
  }

  function selectAllAndClear() {
    try {
      adb('shell input keycombination 113 29');
    } catch {
      /* older devices */
    }
    sleep(150);
    clearFocusedField();
  }

  function clearFocusedField() {
    for (let i = 0; i < 56; i++) adb('shell input keyevent 67');
  }

  function typeAsciiField(text) {
    adb(`shell input text ${text.replace(/ /g, '%s').replace(/%/g, '%%')}`);
  }

  function typePasswordField(password) {
    return spawnSync('adb', ['-s', device, 'shell', 'input', 'text', password], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    });
  }

  function onLoginScreen(xml) {
    return (
      /login-email-input/.test(xml) ||
      /hint="Email or Username"/.test(xml) ||
      /content-desc="Sign in"/.test(xml)
    );
  }

  function dismissPostLoginInterstitials(xml) {
    if (/Enable Push Notifications/i.test(xml)) {
      if (tapContentDesc(xml, 'Maybe Later')) return true;
      if (tapText(xml, 'Maybe Later')) return true;
    }
    return false;
  }

  function tapText(xml, text) {
    const re = new RegExp(`text="${text}"[^>]*bounds="([^"]+)"`, 'i');
    const m = re.exec(xml);
    if (!m) return false;
    const c = centerFromBounds(m[1]);
    if (!c) return false;
    adb(`shell input tap ${c.x} ${c.y}`);
    return true;
  }

  function authenticatedMarker(xml) {
    if (onLoginScreen(xml) || /Invalid credentials/i.test(xml)) return false;
    return (
      /Demo School|Assessments|Overview|classroom overview|Analytics|Total:|Teacher/i.test(xml) ||
      /content-desc="Assessments"/.test(xml) ||
      /content-desc="Open navigation menu"/.test(xml)
    );
  }

  /**
   * @returns {{ ok: boolean, xml: string, diagnostics: object }}
   */
  function performLogin(username, password, role = 'instructor') {
    const diagnostics = { steps: [] };
    let xml = dumpUi();
    diagnostics.steps.push({ step: 'initial', onLogin: onLoginScreen(xml), invalid: /Invalid credentials/i.test(xml) });

    if (authenticatedMarker(xml)) {
      diagnostics.steps.push({ step: 'already_authenticated' });
      return { ok: true, xml, diagnostics, alreadyAuthenticated: true };
    }

    if (!onLoginScreen(xml)) {
      adb(`shell monkey -p com.eduvijna.app -c android.intent.category.LAUNCHER 1`);
      sleep(5000);
      xml = dumpUi();
      if (authenticatedMarker(xml)) {
        diagnostics.steps.push({ step: 'authenticated_after_relaunch' });
        return { ok: true, xml, diagnostics, alreadyAuthenticated: true };
      }
    }

    tapEmailField(xml);
    sleep(500);
    selectAllAndClear();
    sleep(200);
    typeAsciiField(username);
    sleep(500);
    xml = dumpUi();
    const emailActual = readEmailField(xml);
    diagnostics.steps.push({ step: 'email', ok: emailActual === username, len: emailActual.length });

    tapPasswordField(xml);
    sleep(800);
    selectAllAndClear();
    sleep(250);
    tapPasswordField(dumpUi());
    sleep(400);
    const passSpawn = typePasswordField(password);
    sleep(700);
    xml = dumpUi();
    const passLen = passwordMaskLength(xml);
    diagnostics.steps.push({
      step: 'password',
      maskLen: passLen,
      expectedLen: password.length,
      spawnOk: passSpawn?.status === 0,
      ok: passLen > 0 || passSpawn?.status === 0,
    });

    tapEmailField(xml);
    sleep(400);
    xml = dumpUi();
    tapFieldCenter(xml, 'login-submit-button') || tapContentDesc(xml, 'Sign in');
    sleep(12000);
    xml = dumpUi();
    if (dismissPostLoginInterstitials(xml)) {
      sleep(2500);
      xml = dumpUi();
    }
    const ok = authenticatedMarker(xml) && !/Invalid credentials/i.test(xml);
    diagnostics.steps.push({
      step: 'submit',
      ok,
      stillOnLogin: onLoginScreen(xml),
      invalid: /Invalid credentials/i.test(xml),
    });
    return { ok, xml, diagnostics };
  }

  return {
    adb,
    sleep,
    dumpUi,
    performLogin,
    dismissPostLoginInterstitials,
    onLoginScreen,
    authenticatedMarker,
    fieldText,
    tapTestId,
    tapContentDesc,
    device,
  };
}
