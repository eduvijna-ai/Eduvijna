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

function observeScreen(serial, evidenceDir, dumpName) {
  const path = dumpUi(serial, evidenceDir, dumpName);
  const content = readXmlContent(path);
  const state = classifyAndroidRuntimeScreen(content);
  const textSample = parseUiTexts(path).slice(0, 20);
  return { path, content, state, textSample };
}

function screenSignature(obs) {
  return `${obs.state}|${obs.textSample.slice(0, 8).join('§')}`;
}

function waitAfterAction(actionAttempted) {
  if (actionAttempted === 'select_metro') return 14000;
  if (actionAttempted === 'reload_bundle') return 28000;
  if (actionAttempted === 'outside_relaunch') return 8000;
  if (actionAttempted === 'login_in_progress_wait') return 2500;
  return 2000;
}

/**
 * One observed screen → one action → re-dump is handled by the caller loop.
 */
function actOnceForState(serial, state, xmlPath) {
  /** @type {{ actionAttempted: string, actionSucceeded: boolean, targetLabel: string|null }} */
  const base = { actionAttempted: 'none', actionSucceeded: false, targetLabel: null };

  if (state === 'development_servers') {
    const target =
      tapIf(serial, xmlPath, '127.0.0.1:8082') ||
      tapIf(serial, xmlPath, 'http://127.0.0.1:8082') ||
      tapIf(serial, xmlPath, '8082');
    return {
      actionAttempted: 'select_metro',
      actionSucceeded: Boolean(target),
      targetLabel: target,
    };
  }
  if (state === 'developer_menu') {
    const cont = tapIf(serial, xmlPath, 'Continue');
    if (cont) {
      return { actionAttempted: 'developer_menu_continue', actionSucceeded: true, targetLabel: cont };
    }
    const close = tapIf(serial, xmlPath, 'Close') || tapIf(serial, xmlPath, 'close');
    if (close) {
      return { actionAttempted: 'developer_menu_close', actionSucceeded: true, targetLabel: close };
    }
    adbIgnore(serial, 'shell input keyevent 4');
    return { actionAttempted: 'developer_menu_back', actionSucceeded: true, targetLabel: 'KEYCODE_BACK' };
  }
  if (state === 'push_notification') {
    const target = tapIf(serial, xmlPath, 'Maybe Later');
    return {
      actionAttempted: 'dismiss_push',
      actionSucceeded: Boolean(target),
      targetLabel: target,
    };
  }
  if (state === 'anr_dialog') {
    const target = tapIf(serial, xmlPath, 'Wait');
    return {
      actionAttempted: 'dismiss_anr',
      actionSucceeded: Boolean(target),
      targetLabel: target,
    };
  }
  if (state === 'bundle_error') {
    const target = tapIf(serial, xmlPath, 'Reload');
    return {
      actionAttempted: 'reload_bundle',
      actionSucceeded: Boolean(target),
      targetLabel: target,
    };
  }
  if (state === 'login_in_progress') {
    return { actionAttempted: 'login_in_progress_wait', actionSucceeded: true, targetLabel: null };
  }
  return base;
}

function parseAmStartW(output) {
  const lines = String(output || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const status = lines.find((l) => l.startsWith('Status:'))?.replace('Status:', '').trim() ?? null;
  const activity = lines.find((l) => l.startsWith('Activity:'))?.replace('Activity:', '').trim() ?? null;
  const totalTime = lines.find((l) => l.startsWith('TotalTime:'))?.replace('TotalTime:', '').trim() ?? null;
  return { status, activity, totalTimeMs: totalTime, rawLineCount: lines.length };
}

export function launchExpoDevClientIntent(serial) {
  setupAdbReverse(serial);
  const url = `exp+eduvijna://expo-development-client/?url=${encodeURIComponent(METRO_URL)}`;
  let raw = '';
  try {
    raw = adb(
      serial,
      `shell am start -W -a android.intent.action.VIEW -d "${url}" ${APP_PACKAGE}`,
    );
  } catch (e) {
    raw = String(e?.stdout || e?.message || e);
  }
  return { metroUrl: METRO_URL, ...parseAmStartW(raw) };
}

/**
 * Shared dev-client startup state machine (single authority for overlay dismissal).
 */
export function pollUntilPreLoginSurface(
  serial,
  evidenceDir,
  log,
  {
    maxIterations = 45,
    stuckThreshold = 6,
    outsideRelaunchMax = 1,
    allowOutsideRelaunch = true,
  } = {},
) {
  let lastSignature = null;
  let sameSignatureStreak = 0;
  let lastSuccessfulAction = null;
  let outsideRelaunches = 0;
  let lastObs = null;

  for (let i = 0; i < maxIterations; i++) {
    const obs = observeScreen(serial, evidenceDir, `sm-${i}.xml`);
    lastObs = obs;

    if (isAcceptablePreLoginScreen(obs.state)) {
      return {
        ok: true,
        screen: obs.state,
        xmlPath: obs.path,
        iterations: i + 1,
        lastSuccessfulAction,
      };
    }

    const signature = screenSignature(obs);
    if (signature === lastSignature) {
      sameSignatureStreak += 1;
    } else {
      sameSignatureStreak = 0;
      lastSignature = signature;
    }

    if (sameSignatureStreak >= stuckThreshold) {
      return {
        ok: false,
        error: 'dev_client_overlay_stuck',
        screen: obs.state,
        xmlPath: obs.path,
        textSample: obs.textSample,
        attemptCount: i + 1,
        sameSignatureStreak,
        lastSuccessfulAction,
        runnerGitHeadSha: engineeringImplementationSha(),
        loadedBuildSha: log.loadedBuildSha ?? null,
      };
    }

    const beforeScreen = obs.state;
    let action = actOnceForState(serial, beforeScreen, obs.path);

    if (beforeScreen === 'outside_app' && allowOutsideRelaunch) {
      if (outsideRelaunches < outsideRelaunchMax) {
        const launch = launchExpoDevClientIntent(serial);
        outsideRelaunches += 1;
        action = {
          actionAttempted: 'outside_relaunch',
          actionSucceeded: true,
          targetLabel: launch.activity || 'am_start',
        };
        log.devClientLaunch = launch;
      }
    }

    const transition = {
      iteration: i,
      beforeScreen,
      actionAttempted: action.actionAttempted,
      actionSucceeded: action.actionSucceeded,
      targetLabel: action.targetLabel,
    };
    log.steps.push(transition);

    if (action.actionSucceeded && action.actionAttempted !== 'none') {
      lastSuccessfulAction = transition;
    }

    if (action.actionAttempted === 'none' && beforeScreen === 'unknown_in_app') {
      sleep(2000);
      continue;
    }

    if (!action.actionSucceeded && beforeScreen !== 'login_in_progress' && beforeScreen !== 'unknown_in_app') {
      sleep(1500);
      continue;
    }

    sleep(waitAfterAction(action.actionAttempted));
  }

  const failObs = lastObs || observeScreen(serial, evidenceDir, 'sm-fail.xml');
  return {
    ok: false,
    error: 'pre_login_surface_timeout',
    screen: failObs.state,
    xmlPath: failObs.path,
    textSample: failObs.textSample,
    attemptCount: maxIterations,
    lastSuccessfulAction,
    runnerGitHeadSha: engineeringImplementationSha(),
    loadedBuildSha: log.loadedBuildSha ?? null,
  };
}

export function launchExpoDevClientWithMetroUrl(serial, evidenceDir, log) {
  adbIgnore(serial, `shell am force-stop ${APP_PACKAGE}`);
  sleep(800);
  const launch = launchExpoDevClientIntent(serial);
  log.devClientLaunchPerformed = true;
  log.devClientLaunch = launch;
  return pollUntilPreLoginSurface(serial, evidenceDir, log, { maxIterations: 50, stuckThreshold: 6 });
}

/** Journey overlay helper: bounded steps using the same state machine. */
export function resolveDevClientOverlays(serial, evidenceRoot, { maxIterations = 8 } = {}) {
  const evidenceDir = join(evidenceRoot, 'android-runtime-prep');
  const log = { steps: [], loadedBuildSha: null };
  return pollUntilPreLoginSurface(serial, evidenceDir, log, {
    maxIterations,
    stuckThreshold: maxIterations,
    allowOutsideRelaunch: false,
  });
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

  report.loadedBuildSha = bundleWait.loadedBuildSha;

  let preLogin;
  if (options.fresh || options.relaunchDevClient) {
    preLogin = launchExpoDevClientWithMetroUrl(serial, evidenceDir, report);
  } else {
    preLogin = pollUntilPreLoginSurface(serial, evidenceDir, report, {
      maxIterations: 24,
      stuckThreshold: 5,
      allowOutsideRelaunch: false,
    });
  }

  report.finalPreLoginScreen = preLogin.screen ?? null;
  report.steps.push({
    step: 'pre_login_surface',
    ok: preLogin.ok,
    screen: preLogin.screen,
    error: preLogin.error ?? null,
    attemptCount: preLogin.attemptCount ?? null,
    textSample: preLogin.textSample ?? null,
    lastSuccessfulAction: preLogin.lastSuccessfulAction ?? null,
  });

  if (!preLogin.ok) {
    report.error = preLogin.error || 'pre_login_surface_timeout';
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
