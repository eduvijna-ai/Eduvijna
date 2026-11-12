import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const iosRelease = require('../../config/iosReleaseVersion.cjs');

test('parseSemver accepts MAJOR.MINOR.PATCH and rejects junk', () => {
  assert.equal(iosRelease.parseSemver('1.0.5').text, '1.0.5');
  assert.throws(() => iosRelease.parseSemver('1.0'), /Invalid semantic version/);
  assert.throws(() => iosRelease.parseSemver('1.0.5-beta'), /Invalid semantic version/);
});

test('bumpPatch advances only the patch segment', () => {
  assert.equal(iosRelease.bumpPatch('1.0.4'), '1.0.5');
  assert.equal(iosRelease.bumpPatch('1.0.5'), '1.0.6');
});

test('deriveIosRuntimeVersion follows {marketing}-ios-fcm policy', () => {
  assert.equal(iosRelease.deriveIosRuntimeVersion('1.0.5'), '1.0.5-ios-fcm');
  assert.equal(iosRelease.deriveIosRuntimeVersion('2.1.0'), '2.1.0-ios-fcm');
});

test('predictNextRemoteBuildNumber increments final dotted segment', () => {
  assert.equal(iosRelease.predictNextRemoteBuildNumber('1.0.12'), '1.0.13');
  assert.throws(() => iosRelease.predictNextRemoteBuildNumber('12'), /Unsupported remote/);
});

test('assertVersionBuildPairUnique rejects known history pairs', () => {
  const history = require('../../config/iosReleaseHistory.json');
  const known = history.knownIosReleases || [];
  assert.ok(known.length > 0, 'expected at least one recorded iOS release');

  // Every genuine history entry must be rejected (do not rewrite history for this gate).
  for (const entry of known) {
    assert.throws(
      () => iosRelease.assertVersionBuildPairUnique(entry.marketing, entry.build),
      /already exists/,
    );
  }

  // Unused synthetic fixture only — not a predicted/hardcoded next EAS build number.
  // Remote build identity remains obtained during release preparation / EAS autoIncrement.
  const unusedMarketing = '0.0.0';
  const unusedBuild = '0.0.0';
  assert.equal(
    known.some((e) => e.marketing === unusedMarketing && e.build === unusedBuild),
    false,
  );
  assert.doesNotThrow(() =>
    iosRelease.assertVersionBuildPairUnique(unusedMarketing, unusedBuild),
  );
});

test('assertMarketingNotDowngraded rejects equal or lower versions', () => {
  assert.throws(() => iosRelease.assertMarketingNotDowngraded('1.0.4', '1.0.4'), /Refusing/);
  assert.throws(() => iosRelease.assertMarketingNotDowngraded('1.0.3', '1.0.4'), /Refusing/);
  assert.doesNotThrow(() => iosRelease.assertMarketingNotDowngraded('1.0.5', '1.0.4'));
});

test('eas ios-fcm-testflight keeps remote autoIncrement and production API', () => {
  const profile = iosRelease.assertIosTestflightProfile();
  assert.equal(profile.autoIncrement, true);
  assert.equal(profile.distribution, 'store');
  assert.equal(profile.environment, 'production');
  assert.equal(profile.env.EDUVIJNA_API_ENV, 'production');
  const eas = JSON.parse(readFileSync(resolve('eas.json'), 'utf8'));
  assert.equal(eas.cli.appVersionSource, 'remote');
});

test('current app.json iOS identity validates against policy module', () => {
  const identity = iosRelease.validateCurrentIosReleaseIdentity();
  assert.match(identity.marketing, /^\d+\.\d+\.\d+$/);
  assert.equal(identity.runtime, `${identity.marketing}-ios-fcm`);
  assert.equal(identity.androidVersion, '1.0.0');
  assert.equal(identity.androidRuntime, '1.0.0');
  assert.equal(identity.ascQueryStatus, 'PENDING_NO_ASC_API');
});

test('prepare plan for patch bump from current marketing does not mutate files', () => {
  const app = JSON.parse(readFileSync(resolve('app.json'), 'utf8')).expo;
  const current = app.ios.version;
  const plan = iosRelease.planIosMarketingAdvance({ mode: 'patch' });
  assert.equal(plan.currentMarketing, current);
  assert.equal(plan.nextMarketing, iosRelease.bumpPatch(current));
  assert.equal(plan.nextRuntime, `${plan.nextMarketing}-ios-fcm`);
  // Ensure dry planning left app.json unchanged.
  const after = JSON.parse(readFileSync(resolve('app.json'), 'utf8')).expo;
  assert.equal(after.ios.version, current);
});

test('docs distinguish marketing version vs build number', () => {
  const doc = readFileSync(resolve('docs/development/ios-release-versioning.md'), 'utf8');
  assert.match(doc, /Marketing version/);
  assert.match(doc, /Build number/);
  assert.match(doc, /release:ios:prepare/);
  assert.match(doc, /autoIncrement/);
  assert.match(doc, /Cannot be inferred from the Expo Builds page/i);
});
