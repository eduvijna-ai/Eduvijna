#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  ApiEnvironmentConfigError,
  resolveApiOriginForProcess,
} from '../config/apiEnvironment.cjs';

function expoPublicExtra(processEnv) {
  const result = spawnSync('npx expo config --type public --json', {
    env: { ...process.env, ...processEnv },
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'expo config failed');
  }
  const config = JSON.parse(result.stdout);
  return {
    API_BASE_URL: config?.extra?.API_BASE_URL,
    EDUVIJNA_API_ENV: config?.extra?.EDUVIJNA_API_ENV,
  };
}

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exitCode = 1;
    return false;
  }
  console.log('OK:', message);
  return true;
}

console.log('--- unit resolver ---');
assert(
  resolveApiOriginForProcess({}).apiOrigin === 'https://dev-api.eduvijna.com',
  'unset EDUVIJNA_API_ENV defaults to dev-api',
);
assert(
  resolveApiOriginForProcess({ EDUVIJNA_API_ENV: 'production' }).apiOrigin ===
    'https://eduapi.eduvijna.com',
  'production selects eduapi',
);

try {
  resolveApiOriginForProcess({ EDUVIJNA_API_ENV: 'staging' });
  assert(false, 'invalid env should throw');
} catch (error) {
  assert(error instanceof ApiEnvironmentConfigError, 'invalid env throws ApiEnvironmentConfigError');
}

try {
  resolveApiOriginForProcess({
    EDUVIJNA_REQUIRE_PRODUCTION: '1',
    EDUVIJNA_API_ENV: 'development',
  });
  assert(false, 'production release with development env should throw');
} catch (error) {
  assert(
    error instanceof ApiEnvironmentConfigError,
    'production release rejects EDUVIJNA_API_ENV=development',
  );
}

console.log('--- expo config (android/ios via public config) ---');
const devExtra = expoPublicExtra({});
assert(devExtra.API_BASE_URL === 'https://dev-api.eduvijna.com', 'Expo default → dev-api');
assert(!devExtra.API_BASE_URL.includes('/api/v1'), 'origin has no /api/v1');

const prodExtra = expoPublicExtra({ EDUVIJNA_API_ENV: 'production' });
assert(prodExtra.API_BASE_URL === 'https://eduapi.eduvijna.com', 'Expo production → eduapi');

try {
  expoPublicExtra({ EDUVIJNA_API_ENV: 'not-valid' });
  assert(false, 'expo config should fail on invalid env');
} catch {
  assert(true, 'expo config fails on invalid EDUVIJNA_API_ENV');
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
