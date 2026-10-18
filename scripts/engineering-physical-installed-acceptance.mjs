/**
 * Run installed-release acceptance gates on a bound physical device (no Metro).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  assertBoundAdbDevice,
  applyEngineeringDeviceEnv,
} from './lib/resolve-engineering-adb-device.mjs';
import { resolveMaestroJavaHome } from './lib/resolve-maestro-java-home.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function runStep(name, script, scriptArgs = [], extraEnv = {}) {
  const child = spawnSync(process.execPath, [join(repoRoot, 'scripts', script), ...scriptArgs], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ENGINEERING_PHYSICAL_DEVICE: '1',
      ENGINEERING_INSTALLED_RELEASE: '1',
      ENGINEERING_APK_IMPLEMENTATION_SHA:
        process.env.ENGINEERING_APK_IMPLEMENTATION_SHA || 'b570e91',
      ENGINEERING_EXPECTED_APK_SHA256:
        process.env.ENGINEERING_EXPECTED_APK_SHA256 ||
        '00093298CB95C66D1CC15F8EC465D2218BEBB33AC4A1305718776E6B551760F1',
      ENGINEERING_RELEASE_APK:
        process.env.ENGINEERING_RELEASE_APK ||
        join(
          repoRoot,
          '.stack-validation-logs',
          'founder-acceptance',
          'eduvijna-acceptance-release-b570e91-universal.apk',
        ),
      ...(resolveMaestroJavaHome() ? { JAVA_HOME: resolveMaestroJavaHome() } : {}),
      ...extraEnv,
    },
    maxBuffer: 30 * 1024 * 1024,
  });
  return {
    step: name,
    script,
    exit: child.status,
    ok: child.status === 0,
    stdoutTail: (child.stdout || '').slice(-1500),
    stderrTail: (child.stderr || '').slice(-1500),
  };
}

process.env.ENGINEERING_PHYSICAL_DEVICE = '1';
const bound = assertBoundAdbDevice();
applyEngineeringDeviceEnv(bound.serial);

const PRODUCT_SHA = process.env.ENGINEERING_APK_IMPLEMENTATION_SHA || 'b570e91';
const APK_SHA256 = (
  process.env.ENGINEERING_EXPECTED_APK_SHA256 ||
  '00093298CB95C66D1CC15F8EC465D2218BEBB33AC4A1305718776E6B551760F1'
).toUpperCase();

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `physical-acceptance-${bound.serial.slice(0, 8)}-${stamp}`,
);
mkdirSync(evidenceDir, { recursive: true });

const steps = [];
steps.push(runStep('readiness', 'engineering-physical-device-readiness.mjs'));
if (!steps.at(-1).ok) {
  writeFileSync(join(evidenceDir, 'summary.json'), JSON.stringify({ ok: false, steps, evidenceDir }, null, 2));
  process.exit(1);
}
steps.push(runStep('maestro_instructor_login', 'engineering-maestro-login-proof.mjs', ['instructor']));
steps.push(runStep('journey_b', 'engineering-android-journey-b-installed.mjs'));
steps.push(runStep('notifications_route', 'engineering-notifications-route-smoke.mjs'));
steps.push(runStep('logout_session', 'engineering-logout-session-smoke.mjs'));
steps.push(runStep('signed_out_openquiz', 'engineering-signed-out-resume-probe.mjs'));

const summary = {
  ok: steps.every((s) => s.ok),
  deviceSerial: bound.serial,
  harnessGitHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout?.trim(),
  productApkSha: PRODUCT_SHA,
  apkSha256: APK_SHA256,
  steps,
  evidenceDir,
  note: 'Per-step UI evidence under .stack-validation-logs/engineering-installed-smoke/* with timestamps from each runner.',
};
writeFileSync(join(evidenceDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
process.exit(summary.ok ? 0 : 1);
