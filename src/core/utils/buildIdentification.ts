import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../api/config';
import { ENGINEERING_BUILD_MARKER } from './documentCurriculumGeneratedHandoff';

const BUILD_SHA =
  (Constants.expoConfig?.extra as { GIT_SHA?: string } | undefined)?.GIT_SHA ??
  process.env.EXPO_PUBLIC_GIT_SHA ??
  'unknown';

const BUILD_BRANCH =
  (Constants.expoConfig?.extra as { GIT_BRANCH?: string } | undefined)?.GIT_BRANCH ??
  process.env.EXPO_PUBLIC_GIT_BRANCH ??
  'unknown';

export type MobileBuildIdentity = {
  branch: string;
  sha: string;
  engineeringMarker: string;
  apiOrigin: string;
  platform: string;
};

export function getMobileBuildIdentity(): MobileBuildIdentity {
  return {
    branch: BUILD_BRANCH,
    sha: BUILD_SHA,
    engineeringMarker: ENGINEERING_BUILD_MARKER,
    apiOrigin: API_BASE_URL,
    platform: Platform.OS,
  };
}

export function logMobileBuildIdentification(entrypoint = 'node_modules/expo/AppEntry.js'): void {
  if (!__DEV__) return;
  console.log('[Eduvijna Mobile Build]', {
    ...getMobileBuildIdentity(),
    entrypoint,
  });
  (globalThis as typeof globalThis & { __EDUVIJNA_BUILD_IDENTITY__?: MobileBuildIdentity }).__EDUVIJNA_BUILD_IDENTITY__ =
    getMobileBuildIdentity();
}
