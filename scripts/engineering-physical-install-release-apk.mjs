/**
 * Install approved release APK on bound physical device (-r, preserve data).
 */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  assertBoundAdbDevice,
  applyEngineeringDeviceEnv,
} from './lib/resolve-engineering-adb-device.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_SHA = (
  process.env.ENGINEERING_EXPECTED_APK_SHA256 ||
  '00093298CB95C66D1CC15F8EC465D2218BEBB33AC4A1305718776E6B551760F1'
).toUpperCase();
const APK = join(
  repoRoot,
  '.stack-validation-logs',
  'founder-acceptance',
  process.env.ENGINEERING_RELEASE_APK_NAME ||
    'eduvijna-acceptance-release-b570e91-universal.apk',
);

function sha256File(path) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(path)
      .on('data', (c) => h.update(c))
      .on('end', () => resolve(h.digest('hex').toUpperCase()))
      .on('error', reject);
  });
}

process.env.ENGINEERING_PHYSICAL_DEVICE = '1';
const { serial } = assertBoundAdbDevice();
applyEngineeringDeviceEnv(serial);
const apkPath = process.env.ENGINEERING_RELEASE_APK || APK;
if (!existsSync(apkPath)) {
  console.error(JSON.stringify({ ok: false, error: 'apk_not_found', apkPath }));
  process.exit(2);
}
const hash = await sha256File(apkPath);
if (hash !== EXPECTED_SHA) {
  console.error(JSON.stringify({ ok: false, error: 'apk_sha_mismatch', sha256: hash }));
  process.exit(2);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `physical-install-${serial.slice(0, 8)}-${stamp}`,
);
mkdirSync(evidenceDir, { recursive: true });

const install = spawnSync(
  'adb',
  ['-s', serial, 'install', '-r', apkPath],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
);
const combined = `${install.stdout || ''}${install.stderr || ''}`;
const result = {
  ok: install.status === 0,
  serial,
  apkPath,
  sha256: hash,
  exitCode: install.status,
  outputTail: combined.slice(-2000),
  evidenceDir,
};
if (/INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match/i.test(combined)) {
  result.ok = false;
  result.requiresUserDecision = {
    issue: 'signature_mismatch',
    action:
      'Uninstall existing com.eduvijna.app (loses local app data) then re-run install. Reply before adb uninstall.',
  };
}
if (/INSTALL_FAILED_VERSION_DOWNGRADE/i.test(combined)) {
  result.ok = false;
  result.requiresUserDecision = {
    issue: 'version_downgrade',
    action:
      'Phone has a newer com.eduvijna.app than the approved 2fb85b0 release artifact. To install the approved APK (SHA-256 F37F33…), uninstall the app first (loses local app data) or confirm you accept validation on the currently installed build only.',
  };
}
writeFileSync(join(evidenceDir, 'install.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
process.exit(result.ok ? 0 : 1);
