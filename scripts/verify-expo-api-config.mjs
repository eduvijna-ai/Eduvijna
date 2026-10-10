#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  ApiEnvironmentConfigError,
  REQUIRE_PRODUCTION_VAR,
  API_ENV_VAR,
  resolveApiOriginForProcess,
} from '../config/apiEnvironment.cjs';
import { resolveCommandArgv } from './resolve-cli-entry.mjs';

function buildProcessEnv(overrides = {}) {
  const env = { ...process.env };
  delete env[API_ENV_VAR];
  delete env[REQUIRE_PRODUCTION_VAR];
  return { ...env, ...overrides };
}

function expoConfigResult(processEnv) {
  const { executable, args } = resolveCommandArgv(['expo', 'config', '--type', 'public', '--json']);
  return spawnSync(executable, args, {
    env: processEnv,
    encoding: 'utf8',
    shell: false,
  });
}

function expoPublicExtra(processEnv) {
  const result = expoConfigResult(processEnv);
  if (result.status !== 0) {
    return { ok: false, error: result.stderr || result.stdout || 'expo config failed' };
  }
  const config = JSON.parse(result.stdout);
  return {
    ok: true,
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
  resolveApiOriginForProcess(buildProcessEnv()).apiOrigin === 'https://dev-api.eduvijna.com',
  'cleared EDUVIJNA_API_ENV defaults to dev-api',
);
assert(
  resolveApiOriginForProcess(buildProcessEnv({ EDUVIJNA_API_ENV: 'production' })).apiOrigin ===
    'https://eduapi.eduvijna.com',
  'production selects eduapi',
);

try {
  resolveApiOriginForProcess(buildProcessEnv({ EDUVIJNA_API_ENV: 'staging' }));
  assert(false, 'invalid env should throw');
} catch (error) {
  assert(error instanceof ApiEnvironmentConfigError, 'invalid env throws ApiEnvironmentConfigError');
}

try {
  resolveApiOriginForProcess(
    buildProcessEnv({
      [REQUIRE_PRODUCTION_VAR]: '1',
      EDUVIJNA_API_ENV: 'development',
    }),
  );
  assert(false, 'production release with development env should throw');
} catch (error) {
  assert(
    error instanceof ApiEnvironmentConfigError,
    'production release rejects EDUVIJNA_API_ENV=development',
  );
}

console.log('--- expo config ---');
const devExtra = expoPublicExtra(buildProcessEnv());
assert(devExtra.ok && devExtra.API_BASE_URL === 'https://dev-api.eduvijna.com', 'Expo cleared env → dev-api');
assert(devExtra.ok && !devExtra.API_BASE_URL.includes('/api/v1'), 'origin has no /api/v1');

const prodExtra = expoPublicExtra(buildProcessEnv({ EDUVIJNA_API_ENV: 'production' }));
assert(prodExtra.ok && prodExtra.API_BASE_URL === 'https://eduapi.eduvijna.com', 'Expo production → eduapi');

const invalidExpo = expoConfigResult(buildProcessEnv({ EDUVIJNA_API_ENV: 'not-valid' }));
assert(invalidExpo.status !== 0, 'expo config fails on invalid EDUVIJNA_API_ENV');

const conflictExpo = expoConfigResult(
  buildProcessEnv({
    [REQUIRE_PRODUCTION_VAR]: '1',
    EDUVIJNA_API_ENV: 'development',
  }),
);
assert(conflictExpo.status !== 0, 'expo config fails on conflicting production-release selector');

const releaseUnsetExpo = expoConfigResult(
  buildProcessEnv({
    [REQUIRE_PRODUCTION_VAR]: '1',
  }),
);
assert(releaseUnsetExpo.status !== 0, 'expo config fails when release guard set without production env');

if (process.exitCode) {
  process.exit(process.exitCode);
}
