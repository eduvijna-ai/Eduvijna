import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../api/config';

const BUILD_SHA =
  (Constants.expoConfig?.extra as { GIT_SHA?: string } | undefined)?.GIT_SHA ??
  process.env.EXPO_PUBLIC_GIT_SHA ??
  'unknown';

const BUILD_BRANCH =
  (Constants.expoConfig?.extra as { GIT_BRANCH?: string } | undefined)?.GIT_BRANCH ??
  process.env.EXPO_PUBLIC_GIT_BRANCH ??
  'unknown';

export function logMobileBuildIdentification(entrypoint = 'node_modules/expo/AppEntry.js'): void {
  if (!__DEV__) return;
  console.log('[Eduvijna Mobile Build]', {
    branch: BUILD_BRANCH,
    sha: BUILD_SHA,
    apiOrigin: API_BASE_URL,
    platform: Platform.OS,
    entrypoint,
  });
}
