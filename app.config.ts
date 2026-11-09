import type { ExpoConfig } from 'expo/config';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import appJson from './app.json';
import { resolveApiOriginForProcess } from './config/apiEnvironment.cjs';

function resolveGitSha(): string {
  if (process.env.EDUVIJNA_GIT_SHA?.trim()) return process.env.EDUVIJNA_GIT_SHA.trim();
  if (process.env.GIT_COMMIT?.trim()) return process.env.GIT_COMMIT.trim();
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const staticExpo = appJson.expo as ExpoConfig;

const DEV_ANDROID_PACKAGE = 'com.eduvijna.app.dev';
const DEV_ANDROID_GOOGLE_SERVICES_DEFAULT = './google-services-dev.json';
const DEV_FIREBASE_PROJECT_ID = 'eduvijna-push';
const DEV_FIREBASE_PROJECT_NUMBER = '416066207556';

type FirebaseClientConfig = {
  project_info?: {
    project_id?: unknown;
    project_number?: unknown;
  };
  client?: Array<{
    client_info?: {
      android_client_info?: { package_name?: unknown };
    };
  }>;
};

/**
 * Reject a mismatched Firebase Android client file before any APK is built.
 * Never print configuration values or contents in diagnostics.
 */
function validateAndroidDevFirebaseConfig(fileName: string): void {
  const resolvedPath = resolvePath(__dirname, fileName);
  if (resolvedPath === resolvePath(__dirname, './google-services.json')) {
    throw new Error('Android DEV builds must not use the production Firebase client configuration.');
  }

  if (!existsSync(resolvedPath)) {
    throw new Error(
      'Missing approved Firebase Android client configuration for com.eduvijna.app.dev. '
      + 'Provide google-services-dev.json inside the authorized mobile project worktree '
      + 'or set EDUVIJNA_ANDROID_DEV_GOOGLE_SERVICES_FILE in an approved build environment. '
      + 'Do not reuse the production google-services.json.',
    );
  }

  let parsed: FirebaseClientConfig;
  try {
    parsed = JSON.parse(readFileSync(resolvedPath, 'utf8')) as FirebaseClientConfig;
  } catch {
    throw new Error(
      'Invalid or unreadable DEV Firebase client JSON. Use the approved '
      + 'google-services-dev.json downloaded for com.eduvijna.app.dev.',
    );
  }

  const projectMatches =
    parsed?.project_info?.project_id === DEV_FIREBASE_PROJECT_ID &&
    String(parsed?.project_info?.project_number ?? '') === DEV_FIREBASE_PROJECT_NUMBER;
  const packageMatches = Array.isArray(parsed?.client) && parsed.client.some(
    (client) => client?.client_info?.android_client_info?.package_name === DEV_ANDROID_PACKAGE,
  );

  if (!projectMatches || !packageMatches) {
    throw new Error(
      'DEV Firebase client configuration does not match the approved '
      + 'eduvijna-push project and com.eduvijna.app.dev package. '
      + 'Download the correct Android app configuration from Firebase Console.',
    );
  }
}

/**
 * The separate Android identity is opt-in and fails closed without its own
 * Firebase client configuration. No production identity, Expo project, or
 * iOS bundle identifier is changed by the default configuration.
 */
export default (): ExpoConfig => {
  const { environment, apiOrigin } = resolveApiOriginForProcess(process.env);
  const variant = process.env.EDUVIJNA_APP_VARIANT?.trim() || 'production';

  if (variant !== 'production' && variant !== 'development') {
    throw new Error(
      'Invalid EDUVIJNA_APP_VARIANT. Allowed values: development, production.',
    );
  }

  const isAndroidDevVariant = variant === 'development';
  if (isAndroidDevVariant && environment !== 'development') {
    throw new Error(
      'The EduVijna Android development variant must use EDUVIJNA_API_ENV=development.',
    );
  }

  const devFirebaseFile = process.env.EDUVIJNA_ANDROID_DEV_GOOGLE_SERVICES_FILE?.trim()
    || DEV_ANDROID_GOOGLE_SERVICES_DEFAULT;

  if (isAndroidDevVariant) {
    validateAndroidDevFirebaseConfig(devFirebaseFile);
  }

  return {
    ...staticExpo,
    ...(isAndroidDevVariant
      ? {
          name: 'EduVijna Dev',
          scheme: 'eduvijna-dev',
          android: {
            ...staticExpo.android,
            package: DEV_ANDROID_PACKAGE,
            googleServicesFile: devFirebaseFile,
            // Do not intercept production app links from the separately installed app.
            intentFilters: [
              {
                action: 'VIEW',
                data: [{ scheme: 'eduvijna-dev' }],
                category: ['BROWSABLE', 'DEFAULT'],
              },
            ],
          },
          // No production OTA updates should reach the development-only build.
          updates: { ...staticExpo.updates, enabled: false },
        }
      : {}),
    extra: {
      ...staticExpo.extra,
      API_BASE_URL: apiOrigin,
      EDUVIJNA_API_ENV: environment,
      ...(isAndroidDevVariant ? { EDUVIJNA_APP_VARIANT: 'development' } : {}),
      GIT_SHA: resolveGitSha(),
      GIT_BRANCH: process.env.EDUVIJNA_GIT_BRANCH || 'unknown',
    },
  };
};
