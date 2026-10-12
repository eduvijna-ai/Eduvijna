/**
 * Single engineering runtime target for PR #26 acceptance (do not alternate ports casually).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENGINEERING_METRO_PORT = 8082;
export const ENGINEERING_EXPO_WEB_URL = `http://localhost:${ENGINEERING_METRO_PORT}`;
export const ENGINEERING_REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function engineeringImplementationSha() {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: ENGINEERING_REPO_ROOT,
    encoding: 'utf8',
  });
  return (r.stdout || '').trim();
}

export const ENGINEERING_BUNDLE_MARKER = 'curriculum-generated-preview-v1';

/** Fetches the dev bundle from the engineering Metro port and checks for the marker string. */
export function extractLoadedBuildShaFromBundleText(text, intendedFullSha = null) {
  if (intendedFullSha && text.includes(intendedFullSha)) {
    return intendedFullSha;
  }
  const patterns = [
    /ENGINEERING_IMPLEMENTATION_SHA\s*=\s*['"]([a-f0-9]{40})['"]/,
    /IMPLEMENTATION_SHA['"]?\s*[:=]\s*['"]([a-f0-9]{40})['"]/i,
    /GIT_SHA['"]?\s*[:=]\s*['"]([a-f0-9]{40})['"]/i,
    /"GIT_SHA"\s*:\s*"([a-f0-9]{40})"/i,
    /sha:\s*['"]([a-f0-9]{40})['"]/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export async function probeEngineeringBundleMarker() {
  const url = `${ENGINEERING_EXPO_WEB_URL}/index.bundle?platform=android&dev=true&minify=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { pass: false, error: `bundle_http_${res.status}`, markerFound: false, metroUrl: url };
    }
    const text = await res.text();
    const markerFound = text.includes(ENGINEERING_BUNDLE_MARKER);
    const intended = engineeringImplementationSha();
    const loadedBuildSha = extractLoadedBuildShaFromBundleText(text, intended);
    return {
      pass: markerFound && loadedBuildSha === intended,
      markerFound,
      metroUrl: url,
      runnerGitHeadSha: engineeringImplementationSha(),
      loadedBuildSha,
      bundleBytes: text.length,
      error: markerFound ? null : 'marker_missing_in_bundle',
      note: 'engineeringMarker is not a unique revision identifier',
    };
  } catch (e) {
    return {
      pass: false,
      markerFound: false,
      metroUrl: url,
      runnerGitHeadSha: engineeringImplementationSha(),
      loadedBuildSha: null,
      error: e?.message || String(e),
    };
  }
}

export async function buildEngineeringRunRecord({ accountRole = 'instructor' } = {}) {
  const bundleProbe = await probeEngineeringBundleMarker();
  return {
    runAt: new Date().toISOString(),
    accountRole,
    runnerGitHeadSha: engineeringImplementationSha(),
    metroPort: ENGINEERING_METRO_PORT,
    metroUrl: ENGINEERING_EXPO_WEB_URL,
    bundleProbe,
    evidenceNote:
      'Historical journey JSON from other SHAs is not current-build evidence; compare runnerGitHeadSha and loadedBuildSha.',
  };
}
