import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readConfiguredAdbSerial,
  getEngineeringAdbSerial,
} from '../lib/resolve-engineering-adb-device.mjs';

test('physical mode rejects emulator serial', () => {
  const prev = { ...process.env };
  process.env.ENGINEERING_PHYSICAL_DEVICE = '1';
  process.env.ENGINEERING_ADB_SERIAL = 'emulator-5554';
  assert.throws(() => getEngineeringAdbSerial(), /rejects_emulator/);
  Object.assign(process.env, prev);
});

test('readConfiguredAdbSerial prefers ENGINEERING_ADB_SERIAL', () => {
  const prev = process.env.ENGINEERING_ADB_SERIAL;
  process.env.ENGINEERING_ADB_SERIAL = 'TESTSERIAL123';
  assert.equal(readConfiguredAdbSerial(), 'TESTSERIAL123');
  if (prev === undefined) delete process.env.ENGINEERING_ADB_SERIAL;
  else process.env.ENGINEERING_ADB_SERIAL = prev;
});
