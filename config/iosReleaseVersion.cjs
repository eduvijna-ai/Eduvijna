/**
 * EduVijna iOS release versioning policy.
 *
 * Marketing version (CFBundleShortVersionString) advances only via explicit
 * `npm run release:ios:prepare`. Build numbers stay under EAS remote autoIncrement.
 *
 * iOS OTA runtime is always `{marketing}{iosRuntimeSuffix}` (e.g. 1.0.5-ios-fcm)
 * and must stay isolated from Android runtimeVersion 1.0.0.
 */

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const HISTORY_PATH = resolve(__dirname, 'iosReleaseHistory.json');
const APP_JSON_PATH = resolve(__dirname, '..', 'app.json');
const EAS_JSON_PATH = resolve(__dirname, '..', 'eas.json');

class IosReleaseVersionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'IosReleaseVersionError';
  }
}

function loadHistory() {
  return JSON.parse(readFileSync(HISTORY_PATH, 'utf8'));
}

function loadAppJson() {
  return JSON.parse(readFileSync(APP_JSON_PATH, 'utf8'));
}

function loadEasJson() {
  return JSON.parse(readFileSync(EAS_JSON_PATH, 'utf8'));
}

/** @returns {string} */
function getIosRuntimeSuffix(history = loadHistory()) {
  const suffix = history.iosRuntimeSuffix;
  if (typeof suffix !== 'string' || !suffix.startsWith('-')) {
    throw new IosReleaseVersionError('iosReleaseHistory.iosRuntimeSuffix must be a string starting with "-"');
  }
  return suffix;
}

/**
 * Strict MAJOR.MINOR.PATCH (no prerelease / build metadata).
 * @param {unknown} raw
 * @returns {{ major: number, minor: number, patch: number, text: string }}
 */
function parseSemver(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new IosReleaseVersionError('Version must be a non-empty string');
  }
  const text = raw.trim();
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (!match) {
    throw new IosReleaseVersionError(
      `Invalid semantic version "${raw}". Expected MAJOR.MINOR.PATCH (e.g. 1.0.5).`,
    );
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    text,
  };
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number} negative if a < b, 0 if equal, positive if a > b
 */
function compareSemver(a, b) {
  const left = parseSemver(a);
  const right = parseSemver(b);
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

/**
 * @param {string} marketingVersion
 * @param {ReturnType<typeof loadHistory>} [history]
 */
function deriveIosRuntimeVersion(marketingVersion, history = loadHistory()) {
  const marketing = parseSemver(marketingVersion).text;
  return `${marketing}${getIosRuntimeSuffix(history)}`;
}

/**
 * Authoritative marketing version from app.json (not hardcoded fallbacks).
 * @param {{ expo?: { ios?: { version?: unknown } } } | undefined} [appJson]
 */
function readIosMarketingVersion(appJson = loadAppJson()) {
  const version = appJson?.expo?.ios?.version;
  return parseSemver(version).text;
}

/**
 * @param {{ expo?: { ios?: { runtimeVersion?: unknown } } } | undefined} [appJson]
 * @param {ReturnType<typeof loadHistory>} [history]
 */
function readIosRuntimeVersion(appJson = loadAppJson(), history = loadHistory()) {
  const runtime = appJson?.expo?.ios?.runtimeVersion;
  if (typeof runtime !== 'string' || !runtime.trim()) {
    throw new IosReleaseVersionError('app.json expo.ios.runtimeVersion is required');
  }
  const expected = deriveIosRuntimeVersion(readIosMarketingVersion(appJson), history);
  if (runtime.trim() !== expected) {
    throw new IosReleaseVersionError(
      `iOS runtimeVersion "${runtime}" does not match policy "${expected}"`,
    );
  }
  return expected;
}

/**
 * Patch bump: 1.0.4 → 1.0.5
 * @param {string} marketingVersion
 */
function bumpPatch(marketingVersion) {
  const current = parseSemver(marketingVersion);
  return `${current.major}.${current.minor}.${current.patch + 1}`;
}

/**
 * EAS dotted build numbers (e.g. 1.0.12) increment the final numeric segment.
 * @param {string} remoteBuildNumber
 */
function predictNextRemoteBuildNumber(remoteBuildNumber) {
  const text = String(remoteBuildNumber ?? '').trim();
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (!match) {
    throw new IosReleaseVersionError(
      `Unsupported remote iOS buildNumber "${remoteBuildNumber}". Expected dotted MAJOR.MINOR.PATCH.`,
    );
  }
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

/**
 * @param {string} marketing
 * @param {string} build
 * @param {ReturnType<typeof loadHistory>} [history]
 */
function assertVersionBuildPairUnique(marketing, build, history = loadHistory()) {
  const m = parseSemver(marketing).text;
  const b = parseSemver(build).text;
  const hit = (history.knownIosReleases || []).find(
    (entry) => entry.marketing === m && entry.build === b,
  );
  if (hit) {
    throw new IosReleaseVersionError(
      `Version/build pair ${m} (${b}) already exists in known release history: ${hit.note || 'duplicate'}`,
    );
  }
}

/**
 * Marketing version must strictly increase vs current app.json / history max.
 * @param {string} nextMarketing
 * @param {string} currentMarketing
 * @param {ReturnType<typeof loadHistory>} [history]
 */
function assertMarketingNotDowngraded(nextMarketing, currentMarketing, history = loadHistory()) {
  const next = parseSemver(nextMarketing).text;
  const current = parseSemver(currentMarketing).text;
  if (compareSemver(next, current) <= 0) {
    throw new IosReleaseVersionError(
      `Refusing marketing version "${next}" — must be greater than current "${current}"`,
    );
  }
  const maxKnown = (history.knownIosReleases || []).reduce((max, entry) => {
    if (!entry?.marketing) return max;
    return !max || compareSemver(entry.marketing, max) > 0 ? entry.marketing : max;
  }, '');
  if (maxKnown && compareSemver(next, maxKnown) < 0) {
    throw new IosReleaseVersionError(
      `Refusing marketing version "${next}" — lower than known history peak "${maxKnown}"`,
    );
  }
}

/**
 * @param {ReturnType<typeof loadAppJson>} [appJson]
 * @param {ReturnType<typeof loadHistory>} [history]
 */
function assertAndroidVersionUnchanged(appJson = loadAppJson(), history = loadHistory()) {
  const expected = history.android;
  if (appJson?.expo?.version !== expected.version) {
    throw new IosReleaseVersionError(
      `Android/root expo.version must remain "${expected.version}" (found "${appJson?.expo?.version}")`,
    );
  }
  if (appJson?.expo?.runtimeVersion !== expected.runtimeVersion) {
    throw new IosReleaseVersionError(
      `Android expo.runtimeVersion must remain "${expected.runtimeVersion}" (found "${appJson?.expo?.runtimeVersion}")`,
    );
  }
}

/**
 * @param {ReturnType<typeof loadEasJson>} [easJson]
 */
function assertIosTestflightProfile(easJson = loadEasJson()) {
  const profile = easJson?.build?.['ios-fcm-testflight'];
  if (!profile) {
    throw new IosReleaseVersionError('eas.json missing build.ios-fcm-testflight');
  }
  if (profile.distribution !== 'store') {
    throw new IosReleaseVersionError('ios-fcm-testflight.distribution must be "store"');
  }
  if (profile.environment !== 'production') {
    throw new IosReleaseVersionError('ios-fcm-testflight.environment must be "production"');
  }
  if (profile.autoIncrement !== true) {
    throw new IosReleaseVersionError('ios-fcm-testflight.autoIncrement must remain true (EAS remote build numbers)');
  }
  if (easJson?.cli?.appVersionSource !== 'remote') {
    throw new IosReleaseVersionError('eas.json cli.appVersionSource must remain "remote"');
  }
  if (profile.env?.EDUVIJNA_API_ENV !== 'production') {
    throw new IosReleaseVersionError('ios-fcm-testflight must target EDUVIJNA_API_ENV=production');
  }
  return profile;
}

/**
 * Validate current repository release identity without mutating files.
 */
function validateCurrentIosReleaseIdentity() {
  const history = loadHistory();
  const appJson = loadAppJson();
  const marketing = readIosMarketingVersion(appJson);
  const runtime = readIosRuntimeVersion(appJson, history);
  assertAndroidVersionUnchanged(appJson, history);
  assertIosTestflightProfile();
  return {
    marketing,
    runtime,
    androidVersion: history.android.version,
    androidRuntime: history.android.runtimeVersion,
    apiProductionOrigin: 'https://eduapi.eduvijna.com',
    ascQueryStatus: 'PENDING_NO_ASC_API',
  };
}

/**
 * Compute the next marketing + runtime pair for an explicit prepare step.
 * @param {{ mode?: 'patch', set?: string }} options
 */
function planIosMarketingAdvance(options = {}) {
  const history = loadHistory();
  const appJson = loadAppJson();
  const current = readIosMarketingVersion(appJson);
  let next;
  if (options.set) {
    next = parseSemver(options.set).text;
  } else {
    next = bumpPatch(current);
  }
  assertMarketingNotDowngraded(next, current, history);
  assertAndroidVersionUnchanged(appJson, history);
  assertIosTestflightProfile();
  const runtime = deriveIosRuntimeVersion(next, history);
  return {
    currentMarketing: current,
    nextMarketing: next,
    nextRuntime: runtime,
    currentRuntime: readIosRuntimeVersion(appJson, history),
  };
}

module.exports = {
  IosReleaseVersionError,
  HISTORY_PATH,
  APP_JSON_PATH,
  EAS_JSON_PATH,
  loadHistory,
  loadAppJson,
  loadEasJson,
  parseSemver,
  compareSemver,
  bumpPatch,
  deriveIosRuntimeVersion,
  readIosMarketingVersion,
  readIosRuntimeVersion,
  predictNextRemoteBuildNumber,
  assertVersionBuildPairUnique,
  assertMarketingNotDowngraded,
  assertAndroidVersionUnchanged,
  assertIosTestflightProfile,
  validateCurrentIosReleaseIdentity,
  planIosMarketingAdvance,
  getIosRuntimeSuffix,
};
