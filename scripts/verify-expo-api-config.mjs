#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  delete env.EDUVIJNA_APP_VARIANT;
  delete env.EDUVIJNA_ANDROID_DEV_GOOGLE_SERVICES_FILE;
  return { ...env, ...overrides };
}

function expoConfigResult(processEnv, { json = true } = {}) {
  const command = ['expo', 'config', '--type', 'public'];
  if (json) {
    command.push('--json');
  }
  const { executable, args } = resolveCommandArgv(command);
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
    name: config?.name,
    scheme: config?.scheme,
    androidPackage: config?.android?.package,
    androidGoogleServicesFile: config?.android?.googleServicesFile,
    androidIntentFilters: config?.android?.intentFilters,
    expoUpdatesEnabled: config?.updates?.enabled,
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

const easBuildProfiles = JSON.parse(
  readFileSync(resolve('eas.json'), 'utf8'),
).build;
assert(
  easBuildProfiles['android-fcm-dev']?.extends === 'development' &&
    easBuildProfiles['android-fcm-dev']?.env?.EDUVIJNA_APP_VARIANT === 'development' &&
    easBuildProfiles['android-fcm-dev']?.env?.EDUVIJNA_API_ENV === 'development' &&
    easBuildProfiles['android-fcm-dev']?.android?.buildType === 'apk',
  'Dedicated Android FCM DEV profile selects side-by-side APK and DEV API',
);
assert(
  easBuildProfiles.development?.env?.EDUVIJNA_APP_VARIANT === undefined &&
    easBuildProfiles.production?.env?.EDUVIJNA_APP_VARIANT === undefined &&
    easBuildProfiles.preview?.env?.EDUVIJNA_APP_VARIANT === undefined,
  'existing development, preview and production build identities remain unchanged',
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
assert(
  prodExtra.ok && prodExtra.androidPackage === 'com.eduvijna.app' &&
    prodExtra.scheme === 'eduvijna',
  'Expo production retains existing Android identity and URI scheme',
);
assert(
  devExtra.ok && devExtra.androidPackage === 'com.eduvijna.app',
  'Legacy development Metro workflow retains existing identity when app variant is unset',
);

const configuredDevFirebasePath = resolve('google-services.dev.json');
const devVariantEnv = buildProcessEnv({
  EDUVIJNA_API_ENV: 'development',
  EDUVIJNA_APP_VARIANT: 'development',
});
if (!existsSync(configuredDevFirebasePath)) {
  // Expo --json can exit non-zero with empty pipes on Windows; capture the
  // actionable fail-closed message from the human-readable config path.
  const missingFirebaseConfig = expoConfigResult(devVariantEnv, { json: false });
  const missingFirebaseOutput = String(
    `${missingFirebaseConfig.stderr || ''}${missingFirebaseConfig.stdout || ''}`,
  );
  assert(
    missingFirebaseConfig.status !== 0 &&
      missingFirebaseOutput.includes('google-services.dev.json') &&
      missingFirebaseOutput.includes('com.eduvijna.app.dev') &&
      missingFirebaseOutput.includes('Do not reuse the production google-services.json'),
    'Android side-by-side DEV variant fails closed until approved Firebase config is available',
  );
} else {
  const devVariantConfig = expoConfigResult(devVariantEnv);
  let resolvedDevConfig;
  try {
    resolvedDevConfig = JSON.parse(devVariantConfig.stdout);
  } catch {
    resolvedDevConfig = null;
  }
  assert(
    devVariantConfig.status === 0 &&
      resolvedDevConfig?.android?.package === 'com.eduvijna.app.dev' &&
      resolvedDevConfig?.android?.googleServicesFile === './google-services.dev.json' &&
      resolvedDevConfig?.name === 'EduVijna Dev' &&
      resolvedDevConfig?.scheme === 'eduvijna-dev' &&
      resolvedDevConfig?.extra?.API_BASE_URL === 'https://dev-api.eduvijna.com' &&
      resolvedDevConfig?.updates?.enabled === false,
    'Approved Android DEV variant has isolated app/Firebase identity, DEV API and no OTA',
  );
  const devFilters = resolvedDevConfig?.android?.intentFilters || [];
  assert(
    !JSON.stringify(devFilters).includes('app.eduvijna.com') &&
      JSON.stringify(devFilters).includes('eduvijna-dev'),
    'Android DEV variant does not intercept production App Links',
  );
}

const wrongEnvironmentVariant = expoConfigResult(buildProcessEnv({
  EDUVIJNA_API_ENV: 'production',
  EDUVIJNA_APP_VARIANT: 'development',
}));
assert(
  wrongEnvironmentVariant.status !== 0,
  'Android DEV variant cannot target the production API',
);


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
