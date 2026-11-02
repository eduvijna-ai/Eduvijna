import type { ExpoConfig } from 'expo/config';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
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
const DEV_ANDROID_GOOGLE_SERVICES_DEFAULT = './google-services.dev.json';

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

  if (isAndroidDevVariant && !existsSync(resolvePath(__dirname, devFirebaseFile))) {
    throw new Error(
      'Missing approved Firebase Android client configuration for com.eduvijna.app.dev. '
      + 'Provide google-services.dev.json inside the authorized mobile project or '
      + 'EDUVIJNA_ANDROID_DEV_GOOGLE_SERVICES_FILE through an approved build environment. '
      + 'Do not reuse the production google-services.json.',
    );
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
