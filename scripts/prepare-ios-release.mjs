#!/usr/bin/env node
/**
 * Explicit iOS marketing-version preparation.
 *
 * Usage:
 *   npm run release:ios:prepare              # patch bump (1.0.4 → 1.0.5)
 *   npm run release:ios:prepare -- --set 1.0.5
 *   npm run release:ios:prepare -- --dry-run
 *   npm run release:ios:prepare -- --expect-remote-build 1.0.12
 *
 * Does NOT start an EAS build or Apple submit.
 * Build numbers remain under EAS remote autoIncrement.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  APP_JSON_PATH,
  IosReleaseVersionError,
  planIosMarketingAdvance,
  predictNextRemoteBuildNumber,
  assertVersionBuildPairUnique,
  validateCurrentIosReleaseIdentity,
  loadHistory,
} = require('../config/iosReleaseVersion.cjs');

function parseArgs(argv) {
  const out = {
    dryRun: false,
    set: undefined,
    expectRemoteBuild: undefined,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (arg === '--set') {
      out.set = argv[++i];
      continue;
    }
    if (arg.startsWith('--set=')) {
      out.set = arg.slice('--set='.length);
      continue;
    }
    if (arg === '--expect-remote-build') {
      out.expectRemoteBuild = argv[++i];
      continue;
    }
    if (arg.startsWith('--expect-remote-build=')) {
      out.expectRemoteBuild = arg.slice('--expect-remote-build='.length);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    throw new IosReleaseVersionError(`Unknown argument: ${arg}`);
  }
  return out;
}

function writeAppJsonIosVersions(marketing, runtime) {
  const app = JSON.parse(readFileSync(APP_JSON_PATH, 'utf8'));
  if (!app.expo?.ios) {
    throw new IosReleaseVersionError('app.json missing expo.ios');
  }
  const beforeAndroid = {
    version: app.expo.version,
    runtimeVersion: app.expo.runtimeVersion,
  };
  app.expo.ios.version = marketing;
  app.expo.ios.runtimeVersion = runtime;
  // Hard guard: never touch Android/root identity in this workflow.
  if (app.expo.version !== beforeAndroid.version || app.expo.runtimeVersion !== beforeAndroid.runtimeVersion) {
    throw new IosReleaseVersionError('Refusing unexpected Android version mutation');
  }
  writeFileSync(APP_JSON_PATH, `${JSON.stringify(app, null, 2)}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`EduVijna iOS release preparation

Advances CFBundleShortVersionString (marketing) and ios.runtimeVersion only.
EAS remote autoIncrement continues to own CFBundleVersion (build number).

Examples:
  npm run release:ios:prepare
  npm run release:ios:prepare -- --set 1.0.5
  npm run release:ios:prepare -- --dry-run --expect-remote-build 1.0.12
`);
    return;
  }

  const before = validateCurrentIosReleaseIdentity();
  const plan = planIosMarketingAdvance(args.set ? { set: args.set } : { mode: 'patch' });

  let predictedNextBuild;
  if (args.expectRemoteBuild) {
    predictedNextBuild = predictNextRemoteBuildNumber(args.expectRemoteBuild);
    assertVersionBuildPairUnique(plan.nextMarketing, predictedNextBuild, loadHistory());
  }

  console.log(
    JSON.stringify(
      {
        action: args.dryRun ? 'dry-run' : 'prepare',
        marketing: {
          from: plan.currentMarketing,
          to: plan.nextMarketing,
        },
        runtime: {
          from: plan.currentRuntime,
          to: plan.nextRuntime,
        },
        androidUnchanged: {
          version: before.androidVersion,
          runtimeVersion: before.androidRuntime,
        },
        eas: {
          appVersionSource: 'remote',
          autoIncrement: true,
          expectRemoteBuildBeforeBuild: args.expectRemoteBuild || null,
          predictedNextBuildNumber: predictedNextBuild || null,
        },
        ascQueryStatus: before.ascQueryStatus,
        note: 'Does not start EAS build or TestFlight submit',
      },
      null,
      2,
    ),
  );

  if (args.dryRun) {
    return;
  }

  writeAppJsonIosVersions(plan.nextMarketing, plan.nextRuntime);
  // Re-validate after write.
  const after = validateCurrentIosReleaseIdentity();
  if (after.marketing !== plan.nextMarketing || after.runtime !== plan.nextRuntime) {
    throw new IosReleaseVersionError('Post-write validation failed');
  }
  console.log(`Updated ${APP_JSON_PATH}`);
  console.log('Next: commit, validate gates, then Founder-authorized `eas build --profile ios-fcm-testflight`.');
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`release:ios:prepare failed: ${message}`);
  process.exit(1);
}
