/**
 * Physical push delivery: dev-api send to designated student + device log/notification evidence.
 * Does not log tokens or passwords.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';
import {
  assertBoundAdbDevice,
  applyEngineeringDeviceEnv,
} from './lib/resolve-engineering-adb-device.mjs';
import { existsSync, readFileSync } from 'node:fs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_ID = 'com.eduvijna.app';

function adb(serial, args) {
  return spawnSync('adb', ['-s', serial, ...args], { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 });
}

function hashPrefix(value) {
  if (!value) return null;
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
}

async function main() {
  process.env.ENGINEERING_PHYSICAL_DEVICE = '1';
  const { serial } = assertBoundAdbDevice();
  applyEngineeringDeviceEnv(serial);

  const credFile = resolveDevApiCredentialsPath(repoRoot);
  if (!existsSync(credFile)) {
    console.error(JSON.stringify({ ok: false, error: 'missing_credentials' }));
    process.exit(2);
  }
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const instructor = cfg.accounts?.instructor;
  const student = cfg.accounts?.student;
  if (!instructor?.username || !student?.username) {
    console.error(JSON.stringify({ ok: false, error: 'missing_fixture_accounts' }));
    process.exit(2);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const evidenceDir = join(
    repoRoot,
    '.stack-validation-logs',
    'engineering-installed-smoke',
    `physical-push-${serial.slice(0, 8)}-${stamp}`,
  );
  mkdirSync(evidenceDir, { recursive: true });

  const steps = [];
  const instAuth = await loginDevApi(instructor.username, instructor.password);
  const studentAuth = await loginDevApi(student.username, student.password);
  steps.push({ step: 'dev_api_login', ok: true, instructorRole: instAuth.role, studentUserId: studentAuth.userId });

  const devicesRes = await fetch(`${getDevApiBase()}/api/notifications/devices`, {
    headers: { Authorization: `Bearer ${studentAuth.token}` },
  });
  const devicesText = await devicesRes.text();
  let devices = [];
  try {
    const parsed = JSON.parse(devicesText);
    devices = Array.isArray(parsed) ? parsed : parsed?.devices || parsed?.data || [];
  } catch {
    devices = [];
  }
  const activeAndroid = devices.filter(
    (d) => d && (d.platform === 'android' || d.device_platform === 'android') && d.is_active !== false,
  );
  steps.push({
    step: 'student_device_tokens',
    httpStatus: devicesRes.status,
    activeAndroidCount: activeAndroid.length,
    tokenIdPrefixes: activeAndroid.slice(0, 5).map((d) => ({
      id: d.id,
      tokenHashPrefix: hashPrefix(d.token || d.fcm_token),
      deviceName: d.device_name || d.device_model || 'redacted',
    })),
  });

  if (activeAndroid.length === 0) {
    const out = {
      ok: false,
      blocked: true,
      reason: 'no_active_android_device_token_for_student',
      phoneAction:
        'On this phone: open Eduvijna release app → log in as the designated student test account → Profile → enable push notifications → accept Android notification permission if prompted. Then re-run this script.',
      steps,
      evidenceDir,
    };
    writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(out, null, 2));
    console.log(JSON.stringify(out));
    process.exit(1);
  }

  const marker = `PR26-physical-push-${Date.now()}`;
  const title = `Eduvijna probe ${marker}`;
  const body = 'Physical device push delivery probe (PR26). Tap to open notifications.';

  adb(serial, ['logcat', '-c']);
  const sendRes = await fetch(`${getDevApiBase()}/api/notifications/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${instAuth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_ids: [studentAuth.userId],
      title,
      body,
      priority: 'high',
      data: { type: 'notifications', probe: marker },
    }),
  });
  const sendText = await sendRes.text();
  let sendJson = null;
  try {
    sendJson = JSON.parse(sendText);
  } catch {
    sendJson = { raw: sendText.slice(0, 500) };
  }
  steps.push({
    step: 'api_send',
    httpStatus: sendRes.status,
    ok: sendRes.ok,
    responseRedacted: sendJson,
    marker,
  });

  await new Promise((r) => setTimeout(r, 15000));
  const dumpsys = adb(serial, ['shell', 'dumpsys', 'notification', '--noredact']);
  const received = (dumpsys.stdout || '').includes(marker) || (dumpsys.stdout || '').includes(title);
  writeFileSync(
    join(evidenceDir, 'notification-dumpsys-redacted.txt'),
    (dumpsys.stdout || '')
      .split('\n')
      .filter((l) => /Eduvijna|eduvijna|probe|PR26-physical/i.test(l))
      .join('\n')
      .slice(0, 12000),
  );

  const logcat = adb(serial, ['logcat', '-d', '-t', '400']);
  const logHits = (logcat.stdout || '')
    .split('\n')
    .filter((l) => l.includes(marker) || /FCM|notification/i.test(l))
    .filter((l) => !/password|Bearer ey|fcm_token/i.test(l))
    .slice(-80);
  writeFileSync(join(evidenceDir, 'logcat-push-hits.txt'), logHits.join('\n'));

  const tapEvidence = { attempted: false, ok: false, note: 'manual_or_followup_required' };
  if (received) {
    tapEvidence.note =
      'Notification visible in dumpsys. Tap the notification on the phone to confirm navigation; optional adb: open app from notification shade manually.';
  }

  const out = {
    ok: sendRes.ok && received,
    delivery: {
      apiSendOk: sendRes.ok,
      receivedOnDevice: received,
      tapVerified: false,
      status: received ? 'received_not_tap_verified' : 'not_received',
    },
    deviceSerial: serial,
    marker,
    steps,
    evidenceDir,
  };
  writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
  process.exit(out.ok ? 0 : 1);
}

await main();
