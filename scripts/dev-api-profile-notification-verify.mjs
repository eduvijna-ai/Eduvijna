/**
 * Profile + notification API verification (reversible profile edits, redacted).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { redactDeep } from './lib/trace-redact.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const out = join(
  repoRoot,
  'docs',
  'development',
  'e2e-fixtures',
  'profile-notification-verification-redacted.json',
);

const REQUIRED_ACCOUNTS = ['admin', 'instructor', 'student'];

function parseJsonResponse(text) {
  if (!text || !String(text).trim()) {
    return { ok: false, error: 'empty_body' };
  }
  try {
    const data = JSON.parse(text);
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, error: 'unexpected_json_shape' };
    }
    if (Object.keys(data).length === 0) {
      return { ok: false, error: 'empty_object' };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'malformed_json' };
  }
}

function assertProfileShape(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  if (Object.keys(data).length === 0) {
    return false;
  }
  const id = data.id ?? data.user_id;
  return id != null && String(id).trim() !== '';
}

function profileIdentityMatches(data, authUserId) {
  const id = data.id ?? data.user_id;
  return String(id) === String(authUserId);
}

async function fetchProfile(token) {
  const res = await fetch(`${getDevApiBase()}/api/v1/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  const parsed = parseJsonResponse(text);
  return {
    status: res.status,
    ok: res.ok && parsed.ok,
    data: parsed.ok ? parsed.data : null,
    parseError: parsed.ok ? null : parsed.error,
  };
}

async function updateProfile(token, body) {
  const res = await fetch(`${getDevApiBase()}/api/v1/auth/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const parsed = parseJsonResponse(text);
  return {
    status: res.status,
    ok: res.ok && parsed.ok,
    data: parsed.ok ? parsed.data : null,
    parseError: parsed.ok ? null : parsed.error,
  };
}

function parseNotificationJsonResponse(text) {
  if (!text || !String(text).trim()) {
    return { ok: false, error: 'empty_body' };
  }
  try {
    const data = JSON.parse(text);
    if (data === null || typeof data !== 'object') {
      return { ok: false, error: 'unexpected_json_shape' };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'malformed_json' };
  }
}

async function probeGet(token, path) {
  const res = await fetch(`${getDevApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  const parsed = parseNotificationJsonResponse(text);
  const data = parsed.ok ? redactDeep(parsed.data) : { parseError: parsed.error };
  return { status: res.status, ok: res.ok && parsed.ok, data };
}

function roleMatchesAccount(label, role) {
  const normalized = String(role || '').toLowerCase();
  if (label === 'admin') return normalized.includes('admin');
  if (label === 'instructor') {
    return normalized.includes('instructor') || normalized.includes('teacher');
  }
  if (label === 'student') return normalized.includes('student');
  return false;
}

async function verifyProfileRoundTrip(label, username, password) {
  const auth = await loginDevApi(username, password);
  const block = {
    accountLabel: label,
    role: auth.role,
    roleVerified: roleMatchesAccount(label, auth.role),
    steps: [],
    restored: false,
    abortedBeforeMutation: false,
  };

  if (!block.roleVerified) {
    block.steps.push({ check: 'role_check', ok: false, role: auth.role });
    block.abortedBeforeMutation = true;
    return block;
  }

  const before = await fetchProfile(auth.token);
  block.steps.push({
    check: 'profile_read_initial',
    httpStatus: before.status,
    ok:
      before.ok &&
      assertProfileShape(before.data) &&
      profileIdentityMatches(before.data, auth.userId),
    parseError: before.parseError,
  });

  if (
    !before.ok ||
    !before.data ||
    !assertProfileShape(before.data) ||
    !profileIdentityMatches(before.data, auth.userId)
  ) {
    block.abortedBeforeMutation = true;
    return block;
  }

  const marker = `DEV_VERIFY_${Date.now()}`;
  const originalBio = before.data.bio === undefined ? null : before.data.bio;
  const patch = {
    bio: originalBio == null ? marker : `${originalBio} ${marker}`.trim(),
  };

  let savedOk = false;
  try {
    const saved = await updateProfile(auth.token, patch);
    savedOk = saved.ok;
    block.steps.push({
      check: 'profile_save',
      httpStatus: saved.status,
      ok: saved.ok,
      parseError: saved.parseError,
    });

    const refetch = await fetchProfile(auth.token);
    const bioAfter = refetch.data?.bio ?? null;
    block.steps.push({
      check: 'profile_refetch',
      httpStatus: refetch.status,
      ok: refetch.ok && assertProfileShape(refetch.data),
      markerVisible: typeof bioAfter === 'string' && bioAfter.includes(marker),
    });
  } finally {
    try {
      const restore = await updateProfile(auth.token, { bio: originalBio });
      const final = await fetchProfile(auth.token);
      const finalBio = final.data?.bio === undefined ? null : final.data?.bio;
      block.restored = final.ok && finalBio === originalBio;
      block.steps.push({
        check: 'profile_restore',
        httpStatus: restore.status,
        ok: restore.ok && block.restored,
        attemptedAfterSaveLost: !savedOk,
      });
      block.steps.push({
        check: 'profile_final_get',
        httpStatus: final.status,
        ok: final.ok && block.restored,
        valueMatchesOriginal: finalBio === originalBio,
      });
    } catch (error) {
      block.steps.push({
        check: 'profile_restore',
        ok: false,
        error: error?.message || String(error),
      });
    }
  }

  return block;
}

async function verifyNotifications(label, username, password) {
  const auth = await loginDevApi(username, password);
  const block = {
    accountLabel: label,
    role: auth.role,
    apiEvidence: [],
    clientEvidence: [],
    deviceReceipt: { status: 'not_collected', reason: 'No physical device push receipt in CI matrix' },
    limitations: [],
    ok: true,
  };

  const history = await probeGet(auth.token, '/api/notifications/history?limit=20');
  const historyOk = history.status >= 200 && history.status < 300 && history.ok;
  block.apiEvidence.push({
    check: 'notifications_history',
    httpStatus: history.status,
    ok: historyOk,
    notificationCount: history.data?.notifications?.length ?? history.data?.total ?? 0,
    sampleTypes: (history.data?.notifications ?? [])
      .slice(0, 5)
      .map((n) => n.type || n.data?.type || 'unknown'),
  });
  if (!historyOk) block.ok = false;

  const prefs = await probeGet(auth.token, '/api/notifications/preferences');
  block.apiEvidence.push({
    check: 'notifications_preferences',
    httpStatus: prefs.status,
    ok: prefs.ok,
  });
  if (!prefs.ok) {
    block.limitations.push('Preferences endpoint may be unavailable; see http status in apiEvidence.');
    block.ok = false;
  }

  const devices = await probeGet(auth.token, '/api/notifications/devices');
  block.apiEvidence.push({
    check: 'notifications_devices_list',
    httpStatus: devices.status,
    ok: devices.ok,
  });
  if (!devices.ok) {
    block.ok = false;
  }

  block.clientEvidence.push({
    check: 'bell_fetch_guard',
    detail: 'useNotifications restores bounded history fetch with dedupe and 429 backoff (Phase 6).',
  });

  return block;
}

async function main() {
  if (!existsSync(credFile)) {
    console.error('Missing .dev-api-credentials.local.json');
    process.exit(2);
  }
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const accounts = cfg.accounts ?? {};
  const missing = REQUIRED_ACCOUNTS.filter((k) => !accounts[k]?.username);
  if (missing.length) {
    console.error(`Missing required dev-api accounts: ${missing.join(', ')}`);
    process.exit(2);
  }

  const report = {
    verifiedAt: new Date().toISOString(),
    apiBase: getDevApiBase(),
    profiles: [],
    notifications: [],
    erpDeferred: true,
    status: 'pending',
  };

  for (const label of REQUIRED_ACCOUNTS) {
    const cred = accounts[label];
    report.profiles.push(await verifyProfileRoundTrip(label, cred.username, cred.password));
    report.notifications.push(
      await verifyNotifications(label, cred.username, cred.password),
    );
  }

  const profileFailed = report.profiles.some(
    (p) =>
      !p.roleVerified ||
      p.abortedBeforeMutation ||
      !p.steps.every((s) => s.ok !== false) ||
      !p.restored ||
      !p.steps.some((s) => s.check === 'profile_final_get' && s.ok) ||
      !p.steps.some((s) => s.check === 'profile_refetch' && s.markerVisible),
  );
  const notificationFailed = report.notifications.some((n) => !n.ok);
  report.status = profileFailed || notificationFailed ? 'failed' : 'passed';

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(redactDeep(report), null, 2));
  console.log(`Wrote ${out} (status=${report.status})`);
  process.exit(profileFailed || notificationFailed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
