import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmulatorLoginHarness } from './lib/emulator-login-harness.mjs';
import {
  tapNotificationsBell,
  classifyNotificationsRoute,
} from './lib/header-notifications-tap.mjs';
import { resolveMaestroJavaHome } from './lib/resolve-maestro-java-home.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `notifications-smoke-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
const h = createEmulatorLoginHarness();
const { adb, sleep, dumpUi, dismissPostLoginInterstitials, tapContentDesc, authenticatedMarker } = h;

function shot(n) {
  execSync(`adb -s ${h.device} exec-out screencap -p > "${join(evidenceDir, n)}"`, { shell: true, stdio: 'inherit' });
}

mkdirSync(evidenceDir, { recursive: true });
adb('shell monkey -p com.eduvijna.app -c android.intent.category.LAUNCHER 1');
sleep(6000);
let xml = dumpUi();

if (!authenticatedMarker(xml)) {
  const maestroBin =
    process.env.MAESTRO_BIN ||
    join(process.env.USERPROFILE || '', '.maestro-cli', 'maestro', 'bin', 'maestro.bat');
  const javaHome = resolveMaestroJavaHome();
  const maestroLogin = spawnSync(
    process.execPath,
    [join(repoRoot, 'scripts', 'engineering-maestro-login-proof.mjs'), 'instructor'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: Number(process.env.ENGINEERING_MAESTRO_LOGIN_TIMEOUT_MS || 300000),
      env: {
        ...process.env,
        ENGINEERING_PHYSICAL_DEVICE: process.env.ENGINEERING_PHYSICAL_DEVICE || '',
        ENGINEERING_ADB_SERIAL: h.device,
        ADB_DEVICE: h.device,
        ANDROID_SERIAL: h.device,
        MAESTRO_BIN: maestroBin,
        ...(javaHome ? { JAVA_HOME: javaHome } : {}),
      },
    },
  );
  if (maestroLogin.error?.code === 'ETIMEDOUT') {
    const results = { routeOk: false, error: 'maestro_login_timeout', evidenceDir };
    writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
    process.exit(1);
  }
  if (maestroLogin.status !== 0) process.exit(1);
  sleep(3500);
  xml = dumpUi();
}
if (dismissPostLoginInterstitials(xml)) {
  sleep(2000);
  xml = dumpUi();
}
if (/No Quiz Available/i.test(xml)) {
  adb('shell input keyevent 4');
  sleep(1500);
  xml = dumpUi();
}
tapContentDesc(xml, 'Home') || tapContentDesc(xml, 'Go to main dashboard');
sleep(2500);
xml = dumpUi();
writeFileSync(join(evidenceDir, 'home-before-bell.xml'), xml);
shot('00-home-authenticated.png');

if (!authenticatedMarker(xml)) {
  const results = {
    routeOk: false,
    classification: 'harness_not_on_authenticated_home',
    evidenceDir,
  };
  writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
  process.exit(1);
}

const bellTap = tapNotificationsBell(adb, xml);
sleep(4000);
xml = dumpUi();
writeFileSync(join(evidenceDir, 'notifications-ui.xml'), xml);
shot('01-after-bell.png');
const route = classifyNotificationsRoute(xml);

const delivery = {
  status: 'not_verified',
  requirement: 'push_delivery_and_tap',
  environmentLimitation:
    'Android emulator / release build without Play FCM path: no reliable end-to-end push receipt or notification-tap automation.',
  supportedTestSurface:
    'In-app header bell → Notifications screen (pending-quiz list). API history probes are separate (profile-notification script).',
};

const results = {
  routeOk: route.onRoute,
  route,
  bellTap,
  delivery,
  evidenceDir,
};
writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
process.exit(route.onRoute ? 0 : 1);
