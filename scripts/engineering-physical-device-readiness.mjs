/**
 * Physical-device readiness: connection, APK identity, app install state, Maestro/Java.
 */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  assertBoundAdbDevice,
  applyEngineeringDeviceEnv,
  getLocalPhysicalDeviceConfigPath,
} from './lib/resolve-engineering-adb-device.mjs';
import { resolveMaestroJavaHome } from './lib/resolve-maestro-java-home.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_ID = 'com.eduvijna.app';
const EXPECTED_APK_SHA256 =
  'F37F33F24C41E613AE5A6E94769DD22EBBF8360DB18087815DC52C5F8479D6BE';
const PRODUCT_SHA = '2fb85b0';
const DEFAULT_APK = join(
  repoRoot,
  '.stack-validation-logs',
  'founder-acceptance',
  'eduvijna-acceptance-release-2fb85b0-universal.apk',
);

function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (d) => hash.update(d))
      .on('end', () => resolve(hash.digest('hex').toUpperCase()))
      .on('error', reject);
  });
}

function adb(serial, args) {
  return spawnSync('adb', ['-s', serial, ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
}

async function main() {
  process.env.ENGINEERING_PHYSICAL_DEVICE = '1';
  const bound = assertBoundAdbDevice();
  applyEngineeringDeviceEnv(bound.serial);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const evidenceDir = join(
    repoRoot,
    '.stack-validation-logs',
    'engineering-installed-smoke',
    `physical-readiness-${bound.serial.slice(0, 8)}-${stamp}`,
  );
  mkdirSync(evidenceDir, { recursive: true });

  const apkPath = process.env.ENGINEERING_RELEASE_APK || DEFAULT_APK;
  if (!existsSync(apkPath)) {
    const out = { ok: false, error: 'approved_apk_missing', apkPath, expectedSha256: EXPECTED_APK_SHA256 };
    writeFileSync(join(evidenceDir, 'readiness.json'), JSON.stringify(out, null, 2));
    console.error(JSON.stringify(out));
    process.exit(2);
  }
  const apkSha256 = await sha256File(apkPath);
  const apkOk = apkSha256 === EXPECTED_APK_SHA256;

  const props = adb(bound.serial, ['shell', 'getprop']);
  const propText = props.stdout || '';
  const model = /\[ro\.product\.model\]:\s*\[([^\]]+)\]/.exec(propText)?.[1] ?? bound.model;
  const androidRelease =
    /\[ro\.build\.version\.release\]:\s*\[([^\]]+)\]/.exec(propText)?.[1] ?? 'unknown';
  const sdk = /\[ro\.build\.version\.sdk\]:\s*\[([^\]]+)\]/.exec(propText)?.[1] ?? 'unknown';

  const pkgDump = adb(bound.serial, ['shell', 'dumpsys', 'package', APP_ID]);
  const installed = (pkgDump.stdout || '').includes('versionName');
  const versionName = /versionName=([^\s]+)/.exec(pkgDump.stdout || '')?.[1] ?? null;
  const versionCode = /versionCode=(\d+)/.exec(pkgDump.stdout || '')?.[1] ?? null;

  const gms = adb(bound.serial, ['shell', 'pm', 'list', 'packages', 'com.google.android.gms']);
  const playServices = /package:com\.google\.android\.gms/.test(gms.stdout || '');

  const notifPerm = adb(
    bound.serial,
    ['shell', 'dumpsys', 'package', APP_ID],
  );
  const postNotifications =
    /android\.permission\.POST_NOTIFICATIONS[^\\n]*granted=true/i.test(notifPerm.stdout || '') ||
    Number(sdk) < 33;

  const javaHome = resolveMaestroJavaHome();
  const maestroBin =
    process.env.MAESTRO_BIN ||
    join(process.env.USERPROFILE || '', '.maestro-cli', 'maestro', 'bin', 'maestro.bat');
  const maestroVer = spawnSync(maestroBin, ['--version'], {
    encoding: 'utf8',
    shell: /\.(bat|cmd)$/i.test(maestroBin),
    env: { ...process.env, ...(javaHome ? { JAVA_HOME: javaHome } : {}) },
  });

  const report = {
    ok: apkOk && bound.state === 'device',
    harnessGitHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' })
      .stdout?.trim(),
    productSha: PRODUCT_SHA,
    apk: {
      path: apkPath,
      sha256: apkSha256,
      expectedSha256: EXPECTED_APK_SHA256,
      match: apkOk,
    },
    device: {
      serial: bound.serial,
      model,
      androidRelease,
      sdk,
      configFile: getLocalPhysicalDeviceConfigPath(),
    },
    app: {
      package: APP_ID,
      installed,
      versionName,
      versionCode,
    },
    playServices,
    notificationPermission: {
      postNotificationsGrantedOrNotRequired: postNotifications,
      sdk,
      note:
        sdk >= '33' && !postNotifications
          ? 'Approve POST_NOTIFICATIONS when the app prompts (or Settings → Apps → Eduvijna → Notifications).'
          : null,
    },
    maestro: {
      javaHome,
      bin: maestroBin,
      version: (maestroVer.stdout || maestroVer.stderr || '').trim(),
      exit: maestroVer.status,
    },
    evidenceDir,
  };
  writeFileSync(join(evidenceDir, 'readiness.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  process.exit(report.ok ? 0 : 1);
}

await main();
