/**
 * Resolve and validate the ADB serial for engineering installed-smoke runs.
 * Physical mode (ENGINEERING_PHYSICAL_DEVICE=1) never falls back to an emulator.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const LOCAL_CONFIG = join(repoRoot, '.engineering-physical-device.local.json');

function listAdbDevices() {
  const r = spawnSync('adb', ['devices', '-l'], { encoding: 'utf8' });
  const lines = (r.stdout || '').split(/\r?\n/).slice(1);
  const out = [];
  for (const line of lines) {
    const m = /^(\S+)\s+(\S+)\s*(.*)$/.exec(line.trim());
    if (!m) continue;
    const [, serial, state, rest] = m;
    if (serial === 'List') continue;
    const model = /model:(\S+)/.exec(rest || '')?.[1] ?? null;
    const product = /product:(\S+)/.exec(rest || '')?.[1] ?? null;
    out.push({ serial, state, model, product, isEmulator: /^emulator-\d+$/i.test(serial) });
  }
  return out;
}

function readLocalConfig() {
  if (!existsSync(LOCAL_CONFIG)) return null;
  try {
    return JSON.parse(readFileSync(LOCAL_CONFIG, 'utf8'));
  } catch {
    throw new Error(`invalid_engineering_physical_device_config:${LOCAL_CONFIG}`);
  }
}

function isPhysicalMode() {
  return process.env.ENGINEERING_PHYSICAL_DEVICE === '1';
}

export function getLocalPhysicalDeviceConfigPath() {
  return LOCAL_CONFIG;
}

/** Serial from env or local config (no adb validation). */
export function readConfiguredAdbSerial() {
  const fromEnv =
    process.env.ENGINEERING_ADB_SERIAL || process.env.ADB_DEVICE || process.env.ANDROID_SERIAL;
  if (fromEnv) return fromEnv.trim();
  const cfg = readLocalConfig();
  if (cfg?.serial) return String(cfg.serial).trim();
  return null;
}

export function assertBoundAdbDevice(serial = readConfiguredAdbSerial()) {
  if (!serial) {
    throw new Error(
      'engineering_adb_serial_missing: set ENGINEERING_ADB_SERIAL or create .engineering-physical-device.local.json with {"serial":"YOUR_DEVICE"}',
    );
  }
  if (isPhysicalMode() && /^emulator-\d+$/i.test(serial)) {
    throw new Error(`engineering_physical_mode_rejects_emulator_serial:${serial}`);
  }
  const devices = listAdbDevices();
  const row = devices.find((d) => d.serial === serial);
  if (!row) {
    throw new Error(`engineering_adb_device_not_attached:${serial}`);
  }
  if (row.state === 'unauthorized') {
    throw new Error(
      `engineering_adb_device_unauthorized:${serial} — unlock phone and accept USB debugging RSA prompt`,
    );
  }
  if (row.state === 'offline') {
    throw new Error(
      `engineering_adb_device_offline:${serial} — check USB cable/mode (File transfer) and reconnect`,
    );
  }
  if (row.state !== 'device') {
    throw new Error(`engineering_adb_device_not_ready:${serial}:${row.state}`);
  }
  if (isPhysicalMode() && row.isEmulator) {
    throw new Error(`engineering_physical_mode_rejects_emulator_serial:${serial}`);
  }
  return { serial, ...row };
}

export function getEngineeringAdbSerial() {
  if (isPhysicalMode()) {
    return assertBoundAdbDevice().serial;
  }
  const configured = readConfiguredAdbSerial();
  if (configured) {
    assertBoundAdbDevice(configured);
    return configured;
  }
  return 'emulator-5554';
}

export function applyEngineeringDeviceEnv(serial) {
  process.env.ENGINEERING_ADB_SERIAL = serial;
  process.env.ADB_DEVICE = serial;
  process.env.ANDROID_SERIAL = serial;
}

export function listPhysicalAdbDevices() {
  return listAdbDevices().filter((d) => !d.isEmulator && d.state === 'device');
}
