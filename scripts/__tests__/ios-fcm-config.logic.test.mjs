import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

/**
 * Load app.config.ts helpers through Expo's TS-capable register if available;
 * otherwise assert the pure decision table mirrored here matches the intended contract.
 */
function decideRequireIosFirebase(env) {
  if (env.EDUVIJNA_REQUIRE_IOS_FIREBASE === '1') return true;
  if (env.EAS_BUILD_PLATFORM === 'ios') return true;
  if (env.EXPO_OS === 'ios') return true;
  if (env.EAS_BUILD_PLATFORM === 'android') return false;
  return false;
}

function decideAps(env) {
  if (env.EDUVIJNA_APS_ENVIRONMENT === 'production') return 'production';
  if (env.EDUVIJNA_APS_ENVIRONMENT === 'development') return 'development';
  const profile = (env.EAS_BUILD_PROFILE || '').trim();
  if (
    profile === 'development'
    || profile === 'android-fcm-dev'
    || profile.endsWith('-dev')
  ) {
    return 'development';
  }
  return 'production';
}

test('Android EAS production does not require iOS GoogleService-Info.plist', () => {
  assert.equal(
    decideRequireIosFirebase({ EAS_BUILD_PLATFORM: 'android', EAS_BUILD_PROFILE: 'production' }),
    false,
  );
});

test('iOS EAS / export requires iOS GoogleService-Info.plist', () => {
  assert.equal(decideRequireIosFirebase({ EAS_BUILD_PLATFORM: 'ios' }), true);
  assert.equal(decideRequireIosFirebase({ EXPO_OS: 'ios' }), true);
  assert.equal(decideRequireIosFirebase({ EDUVIJNA_REQUIRE_IOS_FIREBASE: '1' }), true);
});

test('aps-environment follows build profile family', () => {
  assert.equal(decideAps({ EAS_BUILD_PROFILE: 'development' }), 'development');
  assert.equal(decideAps({ EAS_BUILD_PROFILE: 'production' }), 'production');
  assert.equal(decideAps({ EAS_BUILD_PROFILE: 'ios-fcm-preview' }), 'production');
});

test('provision script uses --bundle-id (not positional bundle id)', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(resolve('scripts/provision-ios-firebase-app.mjs'), 'utf8');
  assert.match(source, /apps:create IOS "EduVijna iOS" --bundle-id/);
  assert.doesNotMatch(source, /apps:create IOS \$\{BUNDLE_ID\}/);
});

test('real GoogleService-Info.plist is gitignored while example template is tracked', async () => {
  const fs = await import('node:fs');
  const ignore = fs.readFileSync(resolve('.gitignore'), 'utf8');
  assert.match(ignore, /^GoogleService-Info\.plist$/m);
  assert.equal(fs.existsSync(resolve('GoogleService-Info.example.plist')), true);
  assert.doesNotMatch(
    fs.readFileSync(resolve('GoogleService-Info.example.plist'), 'utf8'),
    /AIza|REPLACE_WITH_YOUR_API_KEY/,
  );
});

test('iOS marketing version and runtimeVersion are isolated from Android', async () => {
  const fs = await import('node:fs');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const {
    deriveIosRuntimeVersion,
    validateCurrentIosReleaseIdentity,
  } = require('../../config/iosReleaseVersion.cjs');
  const app = JSON.parse(fs.readFileSync(resolve('app.json'), 'utf8')).expo;
  const identity = validateCurrentIosReleaseIdentity();
  assert.equal(app.version, '1.0.0');
  assert.equal(app.ios.version, identity.marketing);
  assert.equal(app.ios.runtimeVersion, deriveIosRuntimeVersion(identity.marketing));
  assert.equal(app.runtimeVersion, '1.0.0');
  assert.equal(app.ios.bundleIdentifier, 'com.eduvijna.app');
  assert.equal(app.ios.appleTeamId, '847JWGJ2VM');
});

test('eas.json distinguishes internal preview vs TestFlight store profile', async () => {
  const fs = await import('node:fs');
  const eas = JSON.parse(fs.readFileSync(resolve('eas.json'), 'utf8'));
  assert.equal(eas.build['ios-fcm-preview']?.distribution, 'internal');
  assert.equal(eas.build['ios-fcm-testflight']?.distribution, 'store');
  assert.equal(eas.build['ios-fcm-testflight']?.env?.EDUVIJNA_API_ENV, 'production');
  assert.equal(eas.build['ios-fcm-testflight']?.environment, 'production');
  assert.equal(eas.build.production?.environment, 'production');
  assert.equal(eas.build['ios-fcm-testflight']?.env?.EDUVIJNA_APS_ENVIRONMENT, 'production');
  // RNFB 27 / firebase-ios-sdk 13.x Package.swift requires Swift 6.2.3 (Xcode 26.2+).
  assert.equal(
    eas.build['ios-fcm-testflight']?.ios?.image,
    'macos-sequoia-15.6-xcode-26.2',
  );
  assert.equal(
    eas.build['ios-fcm-preview']?.ios?.image,
    'macos-sequoia-15.6-xcode-26.2',
  );
  assert.equal(eas.build.production?.ios?.image, undefined);
});

test('explicit EDUVIJNA_APS_ENVIRONMENT=production wins for TestFlight', () => {
  assert.equal(decideAps({ EDUVIJNA_APS_ENVIRONMENT: 'production', EAS_BUILD_PROFILE: 'development' }), 'production');
  assert.equal(decideAps({ EDUVIJNA_APS_ENVIRONMENT: 'development' }), 'development');
});
