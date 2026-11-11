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
const PROD_IOS_BUNDLE_ID = 'com.eduvijna.app';
const PROD_IOS_GOOGLE_SERVICES_DEFAULT = './GoogleService-Info.plist';
const FIREBASE_PROJECT_ID = 'eduvijna-push';
const FIREBASE_PROJECT_NUMBER = '416066207556';

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
    parsed?.project_info?.project_id === FIREBASE_PROJECT_ID &&
    String(parsed?.project_info?.project_number ?? '') === FIREBASE_PROJECT_NUMBER;
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

function plistStringValue(contents: string, key: string): string | null {
  const pattern = new RegExp(
    `<key>${key}<\\/key>\\s*<string>([^<]*)<\\/string>`,
    'm',
  );
  const match = contents.match(pattern);
  return match?.[1]?.trim() || null;
}

/**
 * Validate production iOS Firebase client plist metadata without printing secrets.
 * Placeholder / missing files are allowed for Android-only workflows unless an
 * iOS native/EAS/export path explicitly requires the approved client file.
 */
function validateIosFirebaseConfig(fileName: string, requireReady: boolean): void {
  const resolvedPath = resolvePath(__dirname, fileName);
  if (!existsSync(resolvedPath)) {
    if (!requireReady) return;
    throw new Error(
      'Missing approved Firebase iOS client configuration for com.eduvijna.app. '
      + 'Provide GoogleService-Info.plist (or set EDUVIJNA_IOS_GOOGLE_SERVICES_FILE) '
      + 'from Firebase project eduvijna-push. Do not upload APNs .p8 keys into the mobile repo.',
    );
  }

  let contents: string;
  try {
    contents = readFileSync(resolvedPath, 'utf8');
  } catch {
    throw new Error('Invalid or unreadable iOS Firebase client plist.');
  }

  const isPlaceholder = contents.includes('REPLACE_WITH_YOUR_');
  if (isPlaceholder) {
    if (!requireReady) return;
    throw new Error(
      'GoogleService-Info.plist is still a placeholder. Register/reuse the iOS app '
      + 'com.eduvijna.app in Firebase project eduvijna-push and replace the plist '
      + 'via the approved Firebase workflow before an iOS native build.',
    );
  }

  const projectId = plistStringValue(contents, 'PROJECT_ID');
  const senderId = plistStringValue(contents, 'GCM_SENDER_ID');
  const bundleId = plistStringValue(contents, 'BUNDLE_ID');
  const googleAppId = plistStringValue(contents, 'GOOGLE_APP_ID');

  const projectMatches =
    projectId === FIREBASE_PROJECT_ID && senderId === FIREBASE_PROJECT_NUMBER;
  const bundleMatches = bundleId === PROD_IOS_BUNDLE_ID;
  const appIdLooksValid = !!googleAppId && googleAppId.startsWith(`1:${FIREBASE_PROJECT_NUMBER}:ios:`);

  if (!projectMatches || !bundleMatches || !appIdLooksValid) {
    throw new Error(
      'iOS Firebase client configuration does not match the approved '
      + 'eduvijna-push project and com.eduvijna.app bundle. '
      + 'Download the correct iOS app configuration from Firebase.',
    );
  }
}

/**
 * iOS Firebase client validation must not block Android EAS production/preview builds.
 * Require the approved plist only for explicit iOS build/export contexts.
 */
export function shouldRequireIosFirebaseConfig(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.EDUVIJNA_REQUIRE_IOS_FIREBASE === '1') return true;
  if (env.EAS_BUILD_PLATFORM === 'ios') return true;
  // Local/CI `expo export --platform ios` sets EXPO_OS=ios.
  if (env.EXPO_OS === 'ios') return true;
  // Never force iOS plist readiness solely because the shared production profile is selected.
  if (env.EAS_BUILD_PLATFORM === 'android') return false;
  return false;
}

/**
 * Match APNs entitlement to the intended provisioning profile family.
 * Development clients use development; store/internal release profiles use production.
 */
export function resolveApsEnvironment(env: NodeJS.ProcessEnv = process.env): 'development' | 'production' {
  const profile = (env.EAS_BUILD_PROFILE || '').trim();
  if (
    profile === 'development'
    || profile === 'android-fcm-dev'
    || profile.endsWith('-dev')
    || env.EDUVIJNA_APS_ENVIRONMENT === 'development'
  ) {
    return 'development';
  }
  return 'production';
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
  const iosFirebaseFile = process.env.EDUVIJNA_IOS_GOOGLE_SERVICES_FILE?.trim()
    || PROD_IOS_GOOGLE_SERVICES_DEFAULT;

  if (isAndroidDevVariant) {
    validateAndroidDevFirebaseConfig(devFirebaseFile);
  }

  validateIosFirebaseConfig(iosFirebaseFile, shouldRequireIosFirebaseConfig(process.env));

  const apsEnvironment = resolveApsEnvironment(process.env);

  return {
    ...staticExpo,
    ios: {
      ...staticExpo.ios,
      bundleIdentifier: PROD_IOS_BUNDLE_ID,
      appleTeamId: staticExpo.ios?.appleTeamId || '847JWGJ2VM',
      googleServicesFile: iosFirebaseFile,
      entitlements: {
        ...(staticExpo.ios?.entitlements ?? {}),
        'aps-environment': apsEnvironment,
      },
    },
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
      FIREBASE_PROJECT_ID,
      FIREBASE_PROJECT_NUMBER,
      IOS_BUNDLE_ID: PROD_IOS_BUNDLE_ID,
      APS_ENVIRONMENT: apsEnvironment,
      IOS_USE_FRAMEWORKS: 'dynamic',
      RNFB_MESSAGING_TOKEN_STRATEGY: 'ios-firebase-messaging-fcm;android-expo-device-push-token',
    },
  };
};
