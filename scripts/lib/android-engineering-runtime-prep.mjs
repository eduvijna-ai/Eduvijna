/**
 * Deterministic Android engineering runtime prep (Metro 8082 + dev client + pre-login surface).
 */
import { execSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adbUiDump } from './adb-ui-dump.mjs';
import { findTapTarget, parseUiTexts } from './android-ui-parse.mjs';
import { readXmlContent } from './android-journey-logic.mjs';
import {
  classifyAndroidRuntimeScreen,
  isAcceptablePreLoginScreen,
} from './android-runtime-screen.mjs';
import {
  ENGINEERING_METRO_PORT,
  ENGINEERING_REPO_ROOT,
  ENGINEERING_EXPO_WEB_URL,
  engineeringImplementationSha,
  probeEngineeringBundleMarker,
} from './engineering-runtime-target.mjs';

const repoRoot = ENGINEERING_REPO_ROOT || join(dirname(fileURLToPath(import.meta.url)), '../..');
export const APP_PACKAGE = 'com.eduvijna.app';
export const METRO_ANDROID_HOST = process.env.METRO_ANDROID_HOST || '127.0.0.1:8082';
export const METRO_URL = `http://${METRO_ANDROID_HOST}`;

export function getAndroidSerial() {
  return process.env.ANDROID_SERIAL || 'emulator-5554';
}

function sleep(ms) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
}

function adb(serial, cmd) {
  return execSync(`adb -s ${serial} ${cmd}`, { encoding: 'utf8' });
}

function adbIgnore(serial, cmd) {
  try {
    execSync(`adb -s ${serial} ${cmd}`, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
}

export function assertAdbDeviceOnline(serial = getAndroidSerial()) {
  const state = spawnSync('adb', ['-s', serial, 'get-state'], { encoding: 'utf8' });
  const deviceState = (state.stdout || state.stderr || '').trim();
  if (deviceState !== 'device') {
    throw new Error(`adb_device_not_ready:${deviceState || 'unknown'}`);
  }
  return deviceState;
}

export function reverse8082Present(serial = getAndroidSerial()) {
  try {
    const out = adb(serial, 'reverse --list');
    return /tcp:8082\s+tcp:8082/.test(out);
  } catch {
    return false;
  }
}

export function setupAdbReverse(serial = getAndroidSerial()) {
  adbIgnore(serial, `reverse tcp:${ENGINEERING_METRO_PORT} tcp:${ENGINEERING_METRO_PORT}`);
  adbIgnore(serial, 'reverse tcp:8081 tcp:8082');
}

function killMetroPort(port) {
  spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `$c = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($c) { $c | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }`,
    ],
    { encoding: 'utf8' },
  );
}

export function writeMetroActiveSession(evidenceRoot, bundleWait) {
  mkdirSync(evidenceRoot, { recursive: true });
  const payload = {
    runnerGitHeadSha: bundleWait.runnerGitHeadSha,
    loadedBuildSha: bundleWait.loadedBuildSha,
    recordedAt: new Date().toISOString(),
    port: ENGINEERING_METRO_PORT,
  };
  writeFileSync(join(evidenceRoot, 'engineering-metro-active.json'), JSON.stringify(payload, null, 2));
  return payload;
}

export function readMetroActiveSession(evidenceRoot) {
  const path = join(evidenceRoot, 'engineering-metro-active.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

export function startEngineeringMetroDetached() {
  killMetroPort(ENGINEERING_METRO_PORT);
  const headSha = engineeringImplementationSha();
  execSync('node scripts/write-engineering-build-stamp.mjs', {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, EDUVIJNA_GIT_SHA: headSha },
  });
  const child = spawn(
    'npx',
    ['expo', 'start', '--port', String(ENGINEERING_METRO_PORT), '--dev-client'],
    {
      cwd: repoRoot,
      detached: true,
      stdio: 'ignore',
      shell: true,
      env: { ...process.env, EDUVIJNA_GIT_SHA: headSha },
    },
  );
  child.unref();
  return { pid: child.pid, port: ENGINEERING_METRO_PORT, runnerGitHeadSha: headSha };
}

export async function waitForEngineeringBundleReady({
  maxAttempts = 45,
  pauseMs = 2000,
} = {}) {
  let lastProbe = null;
  let metroHttpReady = false;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const ping = await fetch(`${ENGINEERING_EXPO_WEB_URL}/status`);
      metroHttpReady = ping.ok;
    } catch {
      metroHttpReady = false;
    }
    lastProbe = await probeEngineeringBundleMarker();
    const activeSession = readMetroActiveSession(
      join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence'),
    );
    const sessionShaOk =
      activeSession?.loadedBuildSha &&
      lastProbe.loadedBuildSha === activeSession.loadedBuildSha &&
      activeSession.runnerGitHeadSha === lastProbe.runnerGitHeadSha;
    if (lastProbe.pass || sessionShaOk) {
      return {
        ok: true,
        metroProcessStarted: true,
        metroHttpReady,
        bundleMarkerFound: lastProbe.markerFound,
        runnerGitHeadSha: lastProbe.runnerGitHeadSha,
        loadedBuildSha: lastProbe.loadedBuildSha,
        bundleProbePass: true,
        attempts: i + 1,
        probe: lastProbe,
        viaActiveSession: Boolean(sessionShaOk && !lastProbe.pass),
      };
    }
    await new Promise((r) => setTimeout(r, pauseMs));
  }
  return {
    ok: false,
    metroProcessStarted: true,
    metroHttpReady,
    bundleMarkerFound: lastProbe?.markerFound ?? false,
    runnerGitHeadSha: engineeringImplementationSha(),
    loadedBuildSha: lastProbe?.loadedBuildSha ?? null,
    bundleProbePass: false,
    attempts: maxAttempts,
    probe: lastProbe,
    error: lastProbe?.error || 'bundle_not_ready',
  };
}

function dumpUi(serial, evidenceDir, name) {
  mkdirSync(evidenceDir, { recursive: true });
  const local = join(evidenceDir, name);
  adbUiDump(serial, local);
  return local;
}

function tap(serial, x, y) {
  adbIgnore(serial, `shell input tap ${x} ${y}`);
}

function tapIf(serial, xmlPath, pattern) {
  const t = findTapTarget(xmlPath, pattern);
  if (t) {
    tap(serial, t.x, t.y);
    return t.label;
  }
  return null;
}

function dismissKnownDevClientOverlays(serial, evidenceDir, log) {
  let xml = dumpUi(serial, evidenceDir, 'prep-overlay-0.xml');
  let texts = parseUiTexts(xml);
  for (let round = 0; round < 6; round++) {
    let acted = false;
    if (texts.some((t) => /Enable Push Notifications/i.test(t))) {
      log.steps.push({ step: 'dismiss_push', tapped: tapIf(serial, xml, 'Maybe Later') });
      acted = true;
      sleep(2000);
    }
    if (texts.some((t) => /isn't responding|not responding/i.test(t))) {
      log.steps.push({ step: 'dismiss_anr', tapped: tapIf(serial, xml, 'Wait') });
      acted = true;
      sleep(2500);
    }
    if (texts.some((t) => /developer menu/i.test(t))) {
      const tapped =
        tapIf(serial, xml, 'Continue') || tapIf(serial, xml, 'Close') || tapIf(serial, xml, 'close');
      log.steps.push({ step: 'dismiss_dev_menu', tapped });
      acted = true;
      adbIgnore(serial, 'shell input keyevent 4');
      sleep(2500);
    }
    if (texts.some((t) => /DEVELOPMENT SERVERS|development server/i.test(t))) {
      const tapped =
        tapIf(serial, xml, '127.0.0.1:8082') || tapIf(serial, xml, '8082') || tapIf(serial, xml, '10.0.2.2:8082');
      log.steps.push({ step: 'select_metro_server', tapped });
      acted = true;
      sleep(15000);
    }
    if (!acted) break;
    xml = dumpUi(serial, evidenceDir, `prep-overlay-${round + 1}.xml`);
    texts = parseUiTexts(xml);
  }
  return xml;
}

export function launchExpoDevClientWithMetroUrl(serial, evidenceDir, log) {
  setupAdbReverse(serial);
  adbIgnore(serial, `shell am force-stop ${APP_PACKAGE}`);
  sleep(800);
  const url = `exp+eduvijna://expo-development-client/?url=${encodeURIComponent(METRO_URL)}`;
  adbIgnore(serial, `shell am start -a android.intent.action.VIEW -d "${url}"`);
  log.devClientLaunchPerformed = true;
  sleep(45000);
  let xml = dismissKnownDevClientOverlays(serial, evidenceDir, log);
  try {
    execSync(`node "${join(repoRoot, 'scripts/android-dismiss-overlays.mjs')}"`, {
      stdio: 'ignore',
      env: { ...process.env, ANDROID_SERIAL: serial },
    });
    log.steps.push({ step: 'dismiss_overlays_script' });
  } catch {
    /* ignore */
  }
  xml = dumpUi(serial, evidenceDir, 'prep-after-dismiss-script.xml');
  let texts = parseUiTexts(xml);
  for (let back = 0; back < 3 && texts.some((t) => /developer menu/i.test(t)); back++) {
    adbIgnore(serial, 'shell input keyevent 4');
    sleep(1500);
    xml = dumpUi(serial, evidenceDir, `prep-devmenu-back-${back}.xml`);
    texts = parseUiTexts(xml);
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!texts.some((t) => /problem loading the project/i.test(t))) break;
    log.steps.push({ step: 'reload_bundle', attempt, tapped: tapIf(serial, xml, 'Reload') });
    sleep(35000);
    xml = dumpUi(serial, evidenceDir, `prep-reload-${attempt}.xml`);
    texts = parseUiTexts(xml);
  }
  return xml;
}

export async function waitForPreLoginSurface(serial, evidenceDir, { attempts = 28, pauseMs = 2000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const path = dumpUi(serial, evidenceDir, `prep-prelogin-${i}.xml`);
    const content = readXmlContent(path);
    const screen = classifyAndroidRuntimeScreen(content);
    if (isAcceptablePreLoginScreen(screen)) {
      return { ok: true, screen, xmlPath: path };
    }
    if (screen === 'bundle_error') {
      tapIf(serial, path, 'Reload');
      sleep(20000);
    } else if (screen === 'dev_client_shell') {
      dismissKnownDevClientOverlays(serial, evidenceDir, { steps: [] });
      sleep(4000);
    }
    sleep(pauseMs);
  }
  const path = dumpUi(serial, evidenceDir, 'prep-prelogin-fail.xml');
  return { ok: false, screen: classifyAndroidRuntimeScreen(readXmlContent(path)), xmlPath: path };
}

export function writeRuntimePreconditionReport(evidenceRoot, report) {
  mkdirSync(evidenceRoot, { recursive: true });
  const out = join(evidenceRoot, 'android-runtime-precondition.json');
  writeFileSync(out, JSON.stringify(report, null, 2));
  return out;
}

export function writeMetroReadinessFailure(evidenceRoot, payload) {
  mkdirSync(evidenceRoot, { recursive: true });
  const out = join(evidenceRoot, 'metro-readiness-failure.json');
  writeFileSync(out, JSON.stringify(payload, null, 2));
  return out;
}

/**
 * @param {{ fresh?: boolean, restartMetro?: boolean, evidenceRoot?: string }} options
 */
export async function prepareAndroidEngineeringRuntime(options = {}) {
  const serial = getAndroidSerial();
  const evidenceRoot =
    options.evidenceRoot ||
    join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence');
  const evidenceDir = join(evidenceRoot, 'android-runtime-prep');
  mkdirSync(evidenceDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const report = {
    adbSerial: serial,
    deviceState: null,
    appPackage: APP_PACKAGE,
    metroPort: ENGINEERING_METRO_PORT,
    metroUrl: METRO_URL,
    runnerGitHeadSha: engineeringImplementationSha(),
    loadedBuildSha: null,
    bundleProbePass: false,
    reverse8082Present: false,
    freshResetPerformed: false,
    devClientLaunchPerformed: false,
    metroProcessStarted: false,
    metroHttpReady: false,
    bundleMarkerFound: false,
    finalPreLoginScreen: null,
    startedAt,
    completedAt: null,
    ok: false,
    error: null,
    steps: [],
  };

  try {
    report.deviceState = assertAdbDeviceOnline(serial);
  } catch (e) {
    report.error = e?.message || String(e);
    report.completedAt = new Date().toISOString();
    writeRuntimePreconditionReport(evidenceRoot, report);
    return { ok: false, report };
  }

  if (options.restartMetro) {
    const metro = startEngineeringMetroDetached();
    report.metroProcessStarted = true;
    report.steps.push({ step: 'metro_started', pid: metro.pid, port: metro.port });
  }

  const bundleWait = await waitForEngineeringBundleReady();
  report.metroHttpReady = bundleWait.metroHttpReady;
  report.bundleMarkerFound = bundleWait.bundleMarkerFound;
  report.loadedBuildSha = bundleWait.loadedBuildSha;
  report.bundleProbePass = bundleWait.bundleProbePass;
  report.runnerGitHeadSha = bundleWait.runnerGitHeadSha || report.runnerGitHeadSha;

  if (!bundleWait.ok) {
    report.error = bundleWait.error || 'metro_bundle_not_ready';
    report.completedAt = new Date().toISOString();
    writeRuntimePreconditionReport(evidenceRoot, report);
    writeMetroReadinessFailure(evidenceRoot, {
      metro_process_started: report.metroProcessStarted,
      metro_http_ready: report.metroHttpReady,
      bundle_marker_found: report.bundleMarkerFound,
      runnerGitHeadSha: report.runnerGitHeadSha,
      loadedBuildSha: report.loadedBuildSha,
      error: report.error,
      bundleProbe: bundleWait.probe,
    });
    return { ok: false, report };
  }

  setupAdbReverse(serial);
  report.reverse8082Present = reverse8082Present(serial);

  if (options.fresh) {
    adbIgnore(serial, `shell pm clear ${APP_PACKAGE}`);
    report.freshResetPerformed = true;
    report.steps.push({ step: 'pm_clear', package: APP_PACKAGE });
    sleep(3500);
  }

  if (options.fresh || options.relaunchDevClient) {
    launchExpoDevClientWithMetroUrl(serial, evidenceDir, report);
  } else {
    dismissKnownDevClientOverlays(serial, evidenceDir, report);
  }

  const preLogin = await waitForPreLoginSurface(serial, evidenceDir);
  report.finalPreLoginScreen = preLogin.screen;
  report.steps.push({ step: 'pre_login_surface', ok: preLogin.ok, screen: preLogin.screen });

  if (!preLogin.ok) {
    report.error = 'pre_login_surface_timeout';
    report.completedAt = new Date().toISOString();
    writeRuntimePreconditionReport(evidenceRoot, report);
    return { ok: false, report };
  }

  report.ok = true;
  report.completedAt = new Date().toISOString();
  writeRuntimePreconditionReport(evidenceRoot, report);
  if (options.restartMetro && bundleWait.ok) {
    writeMetroActiveSession(evidenceRoot, bundleWait);
  }
  return { ok: true, report, preLoginScreen: preLogin.screen };
}
