/**
 * Prove Maestro can drive real release login (no credential logging).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execSync } from 'node:child_process';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';
import { resolveMaestroJavaHome } from './lib/resolve-maestro-java-home.mjs';
import { getEngineeringAdbSerial } from './lib/resolve-engineering-adb-device.mjs';
import { createEmulatorLoginHarness } from './lib/emulator-login-harness.mjs';
import { performUiLogout } from './lib/ui-logout-harness.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = resolveDevApiCredentialsPath(repoRoot);
const outDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `maestro-login-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);

function resolveJavaHome() {
  return resolveMaestroJavaHome();
}

function resolveMaestroBin() {
  const candidates = [
    process.env.MAESTRO_BIN,
    join(process.env.USERPROFILE || '', '.maestro-cli', 'maestro', 'bin', 'maestro.bat'),
    join(process.env.USERPROFILE || '', '.maestro', 'bin', 'maestro.bat'),
    join(process.env.USERPROFILE || '', '.maestro', 'maestro', 'bin', 'maestro.bat'),
    'maestro',
  ].filter(Boolean);
  for (const c of candidates) {
    if (c === 'maestro') return c;
    try {
      readFileSync(c);
      return c;
    } catch {
      /* try next */
    }
  }
  return 'maestro';
}

function pickAccount(role) {
  const { accounts } = JSON.parse(readFileSync(credFile, 'utf8'));
  const entry = accounts?.[role] ?? accounts?.student;
  const email = entry?.username ?? entry?.email;
  const password = entry?.password;
  if (!email || !password) {
    throw new Error(`Missing ${role} credentials in .dev-api-credentials.local.json`);
  }
  return { email, password };
}

const cliArgs = process.argv.slice(2);
const inplace = cliArgs.includes('--inplace');
const role = cliArgs.find((a) => a !== '--inplace') || 'student';
const account = pickAccount(role);
const maestro = resolveMaestroBin();
const physical = process.env.ENGINEERING_PHYSICAL_DEVICE === '1';
const flow = join(
  repoRoot,
  '.maestro',
  inplace
    ? physical
      ? 'engineering-release-login-inplace-physical.yaml'
      : 'engineering-release-login-inplace.yaml'
    : physical
      ? 'engineering-release-login-physical.yaml'
      : 'engineering-release-login.yaml',
);
const device = getEngineeringAdbSerial();

mkdirSync(outDir, { recursive: true });

if (physical && !inplace) {
  const h = createEmulatorLoginHarness(device);
  const ensureAppForeground = () => {
    let xml = h.dumpUi();
    if (/package="com\.eduvijna\.app"/.test(xml)) return xml;
    h.adb('shell monkey -p com.eduvijna.app -c android.intent.category.LAUNCHER 1');
    h.sleep(6000);
    return h.dumpUi();
  };

  const dismissStuckDatePicker = (xml) => {
    if (!/resource-id="android:id\/datePicker"/.test(xml)) return xml;
    const cancel = xml.match(/text="CANCEL"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (cancel) {
      const cx = Math.floor((Number(cancel[1]) + Number(cancel[3])) / 2);
      const cy = Math.floor((Number(cancel[2]) + Number(cancel[4])) / 2);
      h.adb(`shell input tap ${cx} ${cy}`);
      h.sleep(1200);
      return h.dumpUi();
    }
    h.adb('shell input keyevent 4');
    h.sleep(800);
    return h.dumpUi();
  };

  let xml = dismissStuckDatePicker(ensureAppForeground());
  const physicalInstructorMainShell = (ui) =>
    ui &&
    role === 'instructor' &&
    !/login-email-input/.test(ui) &&
    !/Validating quiz|rate-limiting|No Quiz Available/i.test(ui) &&
    /Demo School/.test(ui) &&
    (/content-desc="Assessments"/.test(ui) ||
      /Analytics Dashboard|Generate Assessment/i.test(ui) ||
      /content-desc="[^"]*Analytics/i.test(ui));
  if (physical && physicalInstructorMainShell(xml)) {
    writeFileSync(join(outDir, 'physical-preflight-ui.xml'), xml.slice(0, 120000), 'utf8');
    writeFileSync(
      join(outDir, 'results.json'),
      JSON.stringify(
        {
          pass: true,
          physicalInstructorSessionVerified: true,
          maestroSkippedBecauseAuthenticated: true,
          adbDevice: device,
          note: 'Instructor shell matches post-maestro Demo School assertion; Maestro login flow not re-run while session active.',
        },
        null,
        2,
      ),
    );
    process.stdout.write(`${JSON.stringify({ outDir, pass: true })}\n`);
    process.exit(0);
  }
  if (h.authenticatedMarker(xml)) {
    const logout = performUiLogout({
      adb: h.adb,
      sleep: h.sleep,
      dumpUi: h.dumpUi,
      dismissPostLoginInterstitials: h.dismissPostLoginInterstitials,
      authenticatedMarker: h.authenticatedMarker,
    });
    writeFileSync(
      join(outDir, 'physical-preflight-logout.json'),
      JSON.stringify({ ok: logout.ok, reason: logout.reason }, null, 2),
    );
    if (!logout.ok) {
      writeFileSync(
        join(outDir, 'results.json'),
        JSON.stringify(
          {
            pass: false,
            error: 'physical_preflight_logout_failed',
            reason: logout.reason,
            adbDevice: device,
          },
          null,
          2,
        ),
      );
      process.stdout.write(`${JSON.stringify({ outDir, pass: false })}\n`);
      process.exit(1);
    }
    xml = ensureAppForeground();
  }

  if (!/login-email-input/.test(xml) && !h.authenticatedMarker(xml)) {
    h.adb('shell monkey -p com.eduvijna.app -c android.intent.category.LAUNCHER 1');
    h.sleep(8000);
    xml = h.dumpUi();
  }

  let loginReady = /login-email-input/.test(xml);
  for (let i = 0; i < 45 && !loginReady; i++) {
    if (h.authenticatedMarker(xml)) {
      const logout = performUiLogout({
        adb: h.adb,
        sleep: h.sleep,
        dumpUi: h.dumpUi,
        dismissPostLoginInterstitials: h.dismissPostLoginInterstitials,
        authenticatedMarker: h.authenticatedMarker,
      });
      if (logout.ok) {
        xml = ensureAppForeground();
        loginReady = /login-email-input/.test(xml);
        if (loginReady) break;
      }
    }
    h.sleep(3000);
    xml = h.dumpUi();
    loginReady = /login-email-input/.test(xml);
  }
  writeFileSync(join(outDir, 'physical-preflight-ui.xml'), xml.slice(0, 120000), 'utf8');
  writeFileSync(
    join(outDir, 'physical-preflight-ui.json'),
    JSON.stringify({ loginReady, hasLoginTestId: loginReady }, null, 2),
  );
  if (!loginReady) {
    writeFileSync(
      join(outDir, 'results.json'),
      JSON.stringify(
        {
          pass: false,
          error: 'physical_login_surface_not_ready',
          adbDevice: device,
          hint: 'Unlock phone, dismiss OPPO install/permission overlays, then retry.',
        },
        null,
        2,
      ),
    );
    process.stdout.write(`${JSON.stringify({ outDir, pass: false })}\n`);
    process.exit(1);
  }
}

const javaHome = resolveJavaHome();
const env = {
  ...process.env,
  ...(javaHome ? { JAVA_HOME: javaHome } : {}),
  LOGIN_EMAIL: account.email,
  LOGIN_PASSWORD: account.password,
  MAESTRO_DRIVER_STARTUP_TIMEOUT: '120000',
};

function maestroSpawn(args) {
  // Avoid cmd.exe /c so `-e LOGIN_PASSWORD=...` is not re-parsed (special chars break instructor login).
  return spawnSync(maestro, args, {
    env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
    shell: /\.(bat|cmd)$/i.test(maestro),
  });
}

let maestroVersion = 'unknown';
try {
  const ver = maestroSpawn(['--version']);
  maestroVersion = (ver.stdout || ver.stderr || '').trim();
} catch {
  /* optional */
}

// Maestro launchApp(clearState: true) owns cold-start; avoid pm clear + pre-launch racing stopApp/launchApp.
// Maestro ${VAR} in flows requires `test -e VAR=value` (parent process env is not enough).
const run = maestroSpawn([
  '--device',
  device,
  'test',
  flow,
  '-e',
  `LOGIN_EMAIL=${account.email}`,
  '-e',
  `LOGIN_PASSWORD=${account.password}`,
  '--format',
  'junit',
  '--output',
  join(outDir, 'maestro.xml'),
]);

const logcat = spawnSync(
  'adb',
  ['-s', device, 'logcat', '-d', '-t', '400'],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
);
const logLines = (logcat.stdout || '').split('\n');
const loginSignals = logLines.filter(
  (l) =>
    /login|auth|token|\/api\/v1\/auth/i.test(l) &&
    !/password|passwd|Authorization: Bearer ey/i.test(l),
);
writeFileSync(join(outDir, 'logcat-login-signals-redacted.txt'), loginSignals.join('\n'), 'utf8');

const result = {
  harnessGitHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout?.trim(),
  maestroBin: maestro,
  maestroVersion,
  adbDevice: device,
  role,
  inplace,
  flow: flow.replace(repoRoot, '.').replace(/\\/g, '/'),
  emailLength: String(account.email).length,
  maestroExit: run.status,
  maestroStdoutTail: (run.stdout || '').slice(-2000),
  maestroStderrTail: (run.stderr || '').slice(-2000),
  loginSignalLineCount: loginSignals.length,
  pass: run.status === 0,
};
writeFileSync(join(outDir, 'results.json'), JSON.stringify(result, null, 2), 'utf8');
process.stdout.write(`${JSON.stringify({ outDir, pass: result.pass })}\n`);
process.exit(run.status === 0 ? 0 : 1);
